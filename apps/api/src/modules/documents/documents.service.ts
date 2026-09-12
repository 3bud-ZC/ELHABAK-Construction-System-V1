import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { DocumentCategory, DocumentRecordStatus, Prisma } from "@elhabak/database";
import {
  addDocumentVersionSchema,
  createDocumentSchema,
  setDocumentVisibilitySchema,
  updateDocumentMetadataSchema
} from "@elhabak/validation";
import type { RequestUser } from "../../shared/http.types";
import { PrismaService } from "../../shared/prisma.service";
import { parseBody } from "../../shared/zod";
import { AuditService } from "../admin/audit.service";
import { NotificationService } from "../notifications/notification.service";
import { StorageService } from "../projects/storage.service";
import { DocumentAccessService } from "./document-access.service";
import { documentInclude, toDocumentResponse } from "./document-response";

const categories: DocumentCategory[] = ["CONTRACT", "PERMIT", "REPORT", "CORRESPONDENCE", "HANDOVER", "OTHER"];
const statuses: DocumentRecordStatus[] = ["ACTIVE", "ARCHIVED"];

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: DocumentAccessService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService
  ) {}

  async list(user: RequestUser, projectId: string, search?: string, category?: string, status?: string) {
    await this.access.assertCanRead(user, projectId);
    if (category && !categories.includes(category as DocumentCategory)) throw new BadRequestException("Invalid document category.");
    if (status && !statuses.includes(status as DocumentRecordStatus)) throw new BadRequestException("Invalid document status.");

    const isClient = user.role === "CLIENT";
    const where: Prisma.ProjectDocumentWhereInput = {
      projectId,
      // A Client only ever sees ACTIVE, explicitly-shared documents - archived and internal
      // records are excluded at the query level, not just hidden in the UI.
      ...(isClient ? { isClientVisible: true, status: "ACTIVE" } : {})
    };
    if (!isClient && category) where.category = category as DocumentCategory;
    if (!isClient && status) where.status = status as DocumentRecordStatus;

    const trimmed = search?.trim();
    if (trimmed) {
      where.OR = [
        { title: { contains: trimmed, mode: "insensitive" } },
        { reference: { contains: trimmed, mode: "insensitive" } },
        { versions: { some: { originalFilename: { contains: trimmed, mode: "insensitive" } } } }
      ];
    }

    const documents = await this.prisma.projectDocument.findMany({ where, include: documentInclude, orderBy: { updatedAt: "desc" } });
    return documents.map((document) => toDocumentResponse(document, user.role));
  }

  async get(user: RequestUser, projectId: string, documentId: string) {
    await this.access.assertCanRead(user, projectId);
    const document = await this.findVisibleDocument(user, projectId, documentId);
    return toDocumentResponse(document, user.role);
  }

  async create(user: RequestUser, projectId: string, rawBody: unknown, file?: Express.Multer.File) {
    await this.access.assertCanManage(user, projectId);
    if (!file) throw new BadRequestException("An initial document file is required.");
    const input = parseBody(createDocumentSchema, rawBody);

    // The storage path nests under the document id (projects/:id/documents/:documentId/v1),
    // so the id is generated up front and the file is written before the DB transaction -
    // matching the Design Hub pattern of storing first and rolling the file back on failure,
    // rather than writing inside the transaction where a rollback would orphan the file.
    const documentId = randomUUID();
    const stored = await this.storage.storeDocumentVersion(projectId, documentId, 1, file);
    let persisted = false;

    try {
      await this.prisma.$transaction([
        this.prisma.projectDocument.create({
          data: {
            id: documentId,
            projectId,
            reference: input.reference.trim(),
            title: input.title.trim(),
            description: emptyToNull(input.description),
            category: input.category,
            isClientVisible: input.isClientVisible,
            currentVersionNumber: 1,
            createdById: user.id
          }
        }),
        this.prisma.projectDocumentVersion.create({
          data: {
            documentId,
            projectId,
            versionNumber: 1,
            storagePath: stored.storagePath,
            storedFilename: stored.storedFilename,
            originalFilename: file.originalname,
            mimeType: file.mimetype,
            extension: stored.extension,
            fileSize: file.size,
            checksumSha256: stored.checksumSha256,
            note: emptyToNull(input.versionNote),
            uploadedById: user.id
          }
        })
      ]);
      persisted = true;
      await this.audit.record(user, "documents.created", { documentId, reference: input.reference.trim() }, projectId);

      if (input.isClientVisible) {
        await this.notifyClientDocumentShared(projectId, documentId, input.title.trim(), user);
      }

      return this.get(user, projectId, documentId);
    } finally {
      if (!persisted) await this.storage.remove(stored.storagePath);
    }
  }

  async updateMetadata(user: RequestUser, projectId: string, documentId: string, rawBody: unknown) {
    await this.access.assertCanManage(user, projectId);
    await this.findDocument(projectId, documentId);
    const input = parseBody(updateDocumentMetadataSchema, rawBody);
    const data: Prisma.ProjectDocumentUpdateInput = {};
    if (input.reference !== undefined) data.reference = input.reference.trim();
    if (input.title !== undefined) data.title = input.title.trim();
    if (input.description !== undefined) data.description = emptyToNull(input.description);
    if (input.category !== undefined) data.category = input.category;

    await this.prisma.projectDocument.update({ where: { id: documentId }, data });
    await this.audit.record(user, "documents.metadata_updated", { documentId }, projectId);
    return this.get(user, projectId, documentId);
  }

  async addVersion(user: RequestUser, projectId: string, documentId: string, rawBody: unknown, file?: Express.Multer.File) {
    await this.access.assertCanManage(user, projectId);
    if (!file) throw new BadRequestException("A file is required for the new version.");
    const document = await this.findDocument(projectId, documentId);
    const input = parseBody(addDocumentVersionSchema, rawBody);
    const nextVersion = document.currentVersionNumber + 1;
    const stored = await this.storage.storeDocumentVersion(projectId, documentId, nextVersion, file);
    let persisted = false;

    try {
      await this.prisma.$transaction([
        this.prisma.projectDocumentVersion.create({
          data: {
            documentId,
            projectId,
            versionNumber: nextVersion,
            storagePath: stored.storagePath,
            storedFilename: stored.storedFilename,
            originalFilename: file.originalname,
            mimeType: file.mimetype,
            extension: stored.extension,
            fileSize: file.size,
            checksumSha256: stored.checksumSha256,
            note: emptyToNull(input.note),
            uploadedById: user.id
          }
        }),
        this.prisma.projectDocument.update({ where: { id: documentId }, data: { currentVersionNumber: nextVersion } })
      ]);
      persisted = true;
      await this.audit.record(user, "documents.version_uploaded", { documentId, version: nextVersion }, projectId);
      return this.get(user, projectId, documentId);
    } catch (error) {
      if (isUniqueError(error)) throw new ConflictException("A new version was uploaded concurrently. Retry the upload.");
      throw error;
    } finally {
      if (!persisted) await this.storage.remove(stored.storagePath);
    }
  }

  async setVisibility(user: RequestUser, projectId: string, documentId: string, rawBody: unknown) {
    await this.access.assertCanManage(user, projectId);
    const document = await this.findDocument(projectId, documentId);
    const input = parseBody(setDocumentVisibilitySchema, rawBody);

    if (input.isClientVisible !== document.isClientVisible) {
      await this.prisma.projectDocument.update({ where: { id: documentId }, data: { isClientVisible: input.isClientVisible } });
      await this.audit.record(
        user,
        "documents.client_visibility_changed",
        { documentId, from: document.isClientVisible, to: input.isClientVisible },
        projectId
      );

      if (input.isClientVisible) {
        await this.notifyClientDocumentShared(projectId, documentId, document.title, user);
      }
    }
    return this.get(user, projectId, documentId);
  }

  async archive(user: RequestUser, projectId: string, documentId: string) {
    await this.access.assertCanManage(user, projectId);
    const document = await this.findDocument(projectId, documentId);
    if (document.status === "ARCHIVED") throw new ConflictException("This document is already archived.");

    await this.prisma.projectDocument.update({ where: { id: documentId }, data: { status: "ARCHIVED" } });
    await this.audit.record(user, "documents.archived", { documentId }, projectId);
    return this.get(user, projectId, documentId);
  }

  async restore(user: RequestUser, projectId: string, documentId: string) {
    await this.access.assertCanManage(user, projectId);
    const document = await this.findDocument(projectId, documentId);
    if (document.status === "ACTIVE") throw new ConflictException("This document is already active.");

    await this.prisma.projectDocument.update({ where: { id: documentId }, data: { status: "ACTIVE" } });
    await this.audit.record(user, "documents.restored", { documentId }, projectId);
    return this.get(user, projectId, documentId);
  }

  async getHistory(user: RequestUser, projectId: string, documentId: string) {
    await this.access.assertCanManage(user, projectId);
    await this.findDocument(projectId, documentId);

    const logs = await this.prisma.auditLog.findMany({
      where: {
        projectId,
        action: { startsWith: "documents." },
        metadata: { path: ["documentId"], equals: documentId }
      },
      include: { actor: true },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      metadata: log.metadata,
      actor: log.actor ? { id: log.actor.id, displayName: log.actor.displayName, role: log.actor.role } : null,
      createdAt: log.createdAt.toISOString()
    }));
  }

  async getFile(user: RequestUser, projectId: string, documentId: string, versionId: string) {
    await this.access.assertCanRead(user, projectId);
    const document = await this.findVisibleDocument(user, projectId, documentId);
    const version = document.versions.find((item) => item.id === versionId);
    if (!version) throw new NotFoundException("Document version not found.");
    return version;
  }

  /** Resolves a document and, for Client, denies (404) anything not ACTIVE and client-visible - never a distinguishable 403 that would confirm the document exists. */
  private async findVisibleDocument(user: RequestUser, projectId: string, documentId: string) {
    const document = await this.findDocument(projectId, documentId);
    if (user.role === "CLIENT" && (!document.isClientVisible || document.status !== "ACTIVE")) {
      throw new NotFoundException("Document not found.");
    }
    return document;
  }

  private async notifyClientDocumentShared(projectId: string, documentId: string, title: string, actor: RequestUser) {
    const { clientUserId } = await this.notifications.getProjectParticipants(projectId);
    if (!clientUserId) return;
    await this.notifications.notify([clientUserId], {
      type: "DOCUMENT_SHARED",
      title: `${title}: shared with you`,
      projectId,
      entityId: documentId,
      actorId: actor.id
    });
  }

  private async findDocument(projectId: string, documentId: string) {
    const document = await this.prisma.projectDocument.findFirst({ where: { id: documentId, projectId }, include: documentInclude });
    if (!document) throw new NotFoundException("Document not found.");
    return document;
  }
}

function emptyToNull(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isUniqueError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
}
