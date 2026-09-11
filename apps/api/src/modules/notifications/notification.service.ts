import { Injectable, NotFoundException } from "@nestjs/common";
import type { NotificationType, Prisma } from "@elhabak/database";
import { PrismaService } from "../../shared/prisma.service";
import type { RequestUser } from "../../shared/http.types";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { toNotificationResponse } from "./notification-response";

type NotifyInput = {
  type: NotificationType;
  title: string;
  body?: string | null;
  projectId?: string | null;
  entityId?: string | null;
  /** Excluded from the recipient list - an actor is never redundantly notified about their own action. */
  actorId?: string | null;
};

/**
 * Single reusable entry point for creating notifications and calculating recipients, so
 * every module that raises a notification-worthy event (Chat, Design Hub, Site Operations,
 * Documents) goes through the same recipient/emit logic instead of duplicating it.
 */
@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway
  ) {}

  /** Creates one notification per recipient (excluding the actor) and pushes a realtime update to each. */
  async notify(recipientIds: string[], input: NotifyInput) {
    const unique = [...new Set(recipientIds)].filter((id) => id && id !== input.actorId);
    if (unique.length === 0) {
      return;
    }

    const [notifications, unreadCounts] = await Promise.all([
      this.prisma.$transaction(
        unique.map((userId) =>
          this.prisma.notification.create({
            data: {
              userId,
              projectId: input.projectId ?? null,
              type: input.type,
              title: input.title,
              body: input.body ?? null,
              entityId: input.entityId ?? null
            }
          })
        )
      ),
      this.prisma.notification.groupBy({
        by: ["userId"],
        where: { userId: { in: unique }, readAt: null },
        _count: { _all: true }
      })
    ]);

    const unreadCountByUser = new Map(unreadCounts.map((row) => [row.userId, row._count._all]));
    for (const notification of notifications) {
      this.realtime.emitToUser(notification.userId, "notification:new", {
        notification: toNotificationResponse({ ...notification, project: null }),
        unreadCount: unreadCountByUser.get(notification.userId) ?? 1
      });
    }
  }

  async list(user: RequestUser, status?: string) {
    const where: Prisma.NotificationWhereInput = {
      userId: user.id,
      ...(status === "unread" ? { readAt: null } : {})
    };
    const notifications = await this.prisma.notification.findMany({
      where,
      include: { project: { select: { id: true, code: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    return notifications.map(toNotificationResponse);
  }

  async unreadCount(user: RequestUser) {
    const count = await this.prisma.notification.count({ where: { userId: user.id, readAt: null } });
    return { count };
  }

  async markRead(user: RequestUser, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notification || notification.userId !== user.id) {
      throw new NotFoundException("Notification not found.");
    }
    if (!notification.readAt) {
      await this.prisma.notification.update({ where: { id: notificationId }, data: { readAt: new Date() } });
    }
    const unreadCount = await this.prisma.notification.count({ where: { userId: user.id, readAt: null } });
    this.realtime.emitToUser(user.id, "notification:unread_count", { unreadCount });
    return { ok: true, unreadCount };
  }

  async markAllRead(user: RequestUser) {
    await this.prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
    this.realtime.emitToUser(user.id, "notification:unread_count", { unreadCount: 0 });
    return { ok: true, unreadCount: 0 };
  }

  // --- Project participant helpers, shared by every module that raises a project notification. ---

  async getAdminUserIds(): Promise<string[]> {
    const admins = await this.prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
    return admins.map((admin) => admin.id);
  }

  async getProjectParticipants(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        engineerId: true,
        client: { select: { userId: true } },
        assignments: { select: { userId: true } }
      }
    });
    const adminIds = await this.getAdminUserIds();
    return {
      adminIds,
      engineerId: project?.engineerId ?? null,
      workerIds: project?.assignments.map((assignment) => assignment.userId) ?? [],
      clientUserId: project?.client?.userId ?? null
    };
  }

  /** Every authorized chat participant for a project (Admin + assigned Engineer + assigned Workers + owning Client). */
  async getAllProjectParticipantIds(projectId: string): Promise<string[]> {
    const { adminIds, engineerId, workerIds, clientUserId } = await this.getProjectParticipants(projectId);
    return [...adminIds, ...(engineerId ? [engineerId] : []), ...workerIds, ...(clientUserId ? [clientUserId] : [])];
  }
}
