import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@elhabak/database";
import { createChatMessageSchema } from "@elhabak/validation";
import type { RequestUser } from "../../shared/http.types";
import { PrismaService } from "../../shared/prisma.service";
import { parseBody } from "../../shared/zod";
import { AuditService } from "../admin/audit.service";
import { NotificationService } from "../notifications/notification.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { StorageService } from "../projects/storage.service";
import { ChatAccessService } from "./chat-access.service";
import { chatMessageInclude, toChatMessageResponse } from "./chat-response";

const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 50;

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ChatAccessService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
    private readonly realtime: RealtimeGateway
  ) {}

  async listMessages(user: RequestUser, projectId: string, limit?: number, cursor?: string) {
    await this.access.assertCanAccess(user, projectId);
    const take = Math.min(Math.max(limit ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
    const cursorValue = cursor ? decodeCursor(cursor) : null;

    const where: Prisma.ProjectMessageWhereInput = {
      projectId,
      ...(cursorValue
        ? {
            OR: [
              { createdAt: { lt: cursorValue.createdAt } },
              { createdAt: cursorValue.createdAt, id: { lt: cursorValue.id } }
            ]
          }
        : {})
    };

    const rows = await this.prisma.projectMessage.findMany({
      where,
      include: chatMessageInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take + 1
    });

    const hasMore = rows.length > take;
    const page = rows.slice(0, take);
    const oldest = page[page.length - 1];
    const nextCursor = hasMore && oldest ? encodeCursor(oldest) : null;

    return { messages: [...page].reverse().map(toChatMessageResponse), nextCursor };
  }

  async createMessage(user: RequestUser, projectId: string, rawBody: unknown, file?: Express.Multer.File) {
    await this.access.assertCanAccess(user, projectId);
    const input = parseBody(createChatMessageSchema, rawBody);

    const created =
      input.type === "TEXT"
        ? await this.prisma.projectMessage.create({
            data: { projectId, authorId: user.id, type: "TEXT", text: input.text.trim() },
            include: chatMessageInclude
          })
        : await this.createVoiceMessage(user, projectId, input.durationSeconds, file);

    // The author is always caught up with their own message - it never counts as unread for them.
    await this.prisma.projectChatReadState.upsert({
      where: { projectId_userId: { projectId, userId: user.id } },
      update: { lastReadAt: created.createdAt },
      create: { projectId, userId: user.id, lastReadAt: created.createdAt }
    });

    await this.audit.record(
      user.id,
      input.type === "TEXT" ? "chat.message_sent" : "chat.voice_sent",
      { messageId: created.id },
      projectId
    );

    const response = toChatMessageResponse(created);
    this.realtime.emitToProject(projectId, "chat:message", { message: response });

    const recipients = await this.notifications.getAllProjectParticipantIds(projectId);
    await this.notifications.notify(recipients, {
      type: input.type === "TEXT" ? "CHAT_MESSAGE" : "VOICE_MESSAGE",
      title: input.type === "TEXT" ? `${user.displayName}: new chat message` : `${user.displayName}: new voice note`,
      body: input.type === "TEXT" ? input.text.trim().slice(0, 140) : null,
      projectId,
      entityId: created.id,
      actorId: user.id
    });

    return response;
  }

  private async createVoiceMessage(user: RequestUser, projectId: string, durationSeconds: number, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException("A voice recording file is required.");
    const messageId = randomUUID();
    const stored = await this.storage.storeVoiceNote(projectId, messageId, file);
    let persisted = false;

    try {
      const created = await this.prisma.projectMessage.create({
        data: {
          id: messageId,
          projectId,
          authorId: user.id,
          type: "VOICE",
          storagePath: stored.storagePath,
          storedFilename: stored.storedFilename,
          originalFilename: file.originalname,
          mimeType: stored.mimeType,
          fileSize: file.size,
          durationSeconds
        },
        include: chatMessageInclude
      });
      persisted = true;
      return created;
    } finally {
      if (!persisted) await this.storage.remove(stored.storagePath);
    }
  }

  async getVoiceFile(user: RequestUser, projectId: string, messageId: string) {
    await this.access.assertCanAccess(user, projectId);
    const message = await this.prisma.projectMessage.findFirst({
      where: { id: messageId, projectId, type: "VOICE" }
    });
    if (!message || !message.storagePath) {
      throw new NotFoundException("Voice note not found.");
    }
    return message;
  }

  async getReadState(user: RequestUser, projectId: string) {
    await this.access.assertCanAccess(user, projectId);
    const state = await this.prisma.projectChatReadState.findUnique({
      where: { projectId_userId: { projectId, userId: user.id } }
    });
    const lastReadAt = state?.lastReadAt ?? new Date(0);
    const unreadCount = await this.prisma.projectMessage.count({
      where: { projectId, createdAt: { gt: lastReadAt } }
    });
    return { lastReadAt: lastReadAt.toISOString(), unreadCount };
  }

  async markRead(user: RequestUser, projectId: string) {
    await this.access.assertCanAccess(user, projectId);
    const now = new Date();
    await this.prisma.projectChatReadState.upsert({
      where: { projectId_userId: { projectId, userId: user.id } },
      update: { lastReadAt: now },
      create: { projectId, userId: user.id, lastReadAt: now }
    });
    return { lastReadAt: now.toISOString(), unreadCount: 0 };
  }
}

function encodeCursor(row: { createdAt: Date; id: string }) {
  return Buffer.from(`${row.createdAt.toISOString()}|${row.id}`, "utf8").toString("base64url");
}

function decodeCursor(cursor: string): { createdAt: Date; id: string } {
  let decoded: string;
  try {
    decoded = Buffer.from(cursor, "base64url").toString("utf8");
  } catch {
    throw new BadRequestException("Invalid pagination cursor.");
  }
  const [iso, id] = decoded.split("|");
  const createdAt = iso ? new Date(iso) : null;
  if (!createdAt || Number.isNaN(createdAt.getTime()) || !id) {
    throw new BadRequestException("Invalid pagination cursor.");
  }
  return { createdAt, id };
}
