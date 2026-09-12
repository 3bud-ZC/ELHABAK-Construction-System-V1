import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { DesignDiscipline, DesignEventType, DesignStatus, Prisma } from "@elhabak/database";
import {
  createDesignRevisionSchema,
  createDesignSchema,
  designCommentSchema,
  designDecisionSchema,
  updateDesignSchema
} from "@elhabak/validation";
import type { RequestUser } from "../../shared/http.types";
import { PrismaService } from "../../shared/prisma.service";
import { parseBody } from "../../shared/zod";
import { AuditService } from "../admin/audit.service";
import { NotificationService } from "../notifications/notification.service";
import { StorageService } from "../projects/storage.service";
import { DesignAccessService } from "./design-access.service";
import { designInclude, toDesignResponse } from "./design-response";

const statuses: DesignStatus[] = ["DRAFT", "IN_REVIEW", "APPROVED", "REJECTED"];
const disciplines: DesignDiscipline[] = [
  "ARCHITECTURAL",
  "STRUCTURAL",
  "INTERIOR",
  "ELECTRICAL",
  "PLUMBING",
  "FURNITURE",
  "RENDERS",
  "OTHER"
];

@Injectable()
export class DesignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: DesignAccessService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService
  ) {}

  async list(user: RequestUser, projectId: string, search?: string, status?: string, discipline?: string) {
    await this.access.assertCanRead(user, projectId);
    if (status && !statuses.includes(status as DesignStatus)) throw new BadRequestException("Invalid design status.");
    if (discipline && !disciplines.includes(discipline as DesignDiscipline)) throw new BadRequestException("Invalid design discipline.");

    const where: Prisma.DesignItemWhereInput = { projectId };
    const trimmed = search?.trim();
    if (status) where.status = status as DesignStatus;
    if (discipline) where.discipline = discipline as DesignDiscipline;
    if (trimmed) {
      const revisionNumber = Number.parseInt(trimmed.replace(/[^0-9]/g, ""), 10);
      where.OR = [
        { title: { contains: trimmed, mode: "insensitive" } },
        { revisions: { some: { originalFilename: { contains: trimmed, mode: "insensitive" } } } },
        ...(Number.isInteger(revisionNumber) ? [{ revisions: { some: { revisionNumber } } }] : [])
      ];
    }

    const designs = await this.prisma.designItem.findMany({ where, include: designInclude, orderBy: { updatedAt: "desc" } });
    return designs.map(toDesignResponse);
  }

  async get(user: RequestUser, projectId: string, designId: string) {
    await this.access.assertCanRead(user, projectId);
    return toDesignResponse(await this.findDesign(projectId, designId));
  }

  async create(user: RequestUser, projectId: string, rawBody: unknown, file?: Express.Multer.File) {
    await this.access.assertCanManage(user, projectId);
    if (!file) throw new BadRequestException("A design file is required.");
    const input = parseBody(createDesignSchema, rawBody);
    const stored = await this.storage.storeDesign(projectId, file);
    const status: DesignStatus = input.submitForReview ? "IN_REVIEW" : "DRAFT";
    let persisted = false;

    try {
      const designId = await this.prisma.$transaction(async (tx) => {
        const design = await tx.designItem.create({
          data: {
            projectId,
            title: input.title.trim(),
            description: emptyToNull(input.description),
            discipline: input.discipline,
            status,
            currentRevisionNumber: 1
          }
        });
        const revision = await tx.designRevision.create({
          data: {
            designId: design.id,
            projectId,
            revisionNumber: 1,
            status,
            notes: emptyToNull(input.revisionNotes),
            storagePath: stored.storagePath,
            storedFilename: stored.storedFilename,
            originalFilename: file.originalname,
            mimeType: file.mimetype,
            fileSize: file.size,
            uploaderId: user.id
          }
        });
        await tx.designEvent.createMany({
          data: [
            { designId: design.id, revisionId: revision.id, actorId: user.id, action: "DESIGN_CREATED" },
            { designId: design.id, revisionId: revision.id, actorId: user.id, action: "REVISION_UPLOADED" },
            ...(input.submitForReview
              ? [{ designId: design.id, revisionId: revision.id, actorId: user.id, action: "SUBMITTED_FOR_REVIEW" as DesignEventType }]
              : [])
          ]
        });
        return design.id;
      });
      persisted = true;
      await this.audit.record(user, "design.created", { designId, revision: 1 }, projectId);
      return this.get(user, projectId, designId);
    } finally {
      if (!persisted) await this.storage.remove(stored.storagePath);
    }
  }

  async update(user: RequestUser, projectId: string, designId: string, rawBody: unknown) {
    await this.access.assertCanManage(user, projectId);
    await this.findDesign(projectId, designId);
    const input = parseBody(updateDesignSchema, rawBody);
    const data: Prisma.DesignItemUpdateInput = {};
    if (input.title !== undefined) data.title = input.title.trim();
    if (input.description !== undefined) data.description = emptyToNull(input.description);
    if (input.discipline !== undefined) data.discipline = input.discipline;

    await this.prisma.$transaction([
      this.prisma.designItem.update({ where: { id: designId }, data }),
      this.prisma.designEvent.create({ data: { designId, actorId: user.id, action: "DESIGN_UPDATED" } })
    ]);
    await this.audit.record(user, "design.updated", { designId }, projectId);
    return this.get(user, projectId, designId);
  }

  async addRevision(user: RequestUser, projectId: string, designId: string, rawBody: unknown, file?: Express.Multer.File) {
    await this.access.assertCanManage(user, projectId);
    if (!file) throw new BadRequestException("A revision file is required.");
    const design = await this.findDesign(projectId, designId);
    const input = parseBody(createDesignRevisionSchema, rawBody);
    const nextRevision = design.currentRevisionNumber + 1;
    const status: DesignStatus = input.submitForReview ? "IN_REVIEW" : "DRAFT";
    const stored = await this.storage.storeDesign(projectId, file);
    let persisted = false;

    try {
      await this.prisma.$transaction(async (tx) => {
        const revision = await tx.designRevision.create({
          data: {
            designId,
            projectId,
            revisionNumber: nextRevision,
            status,
            notes: emptyToNull(input.notes),
            storagePath: stored.storagePath,
            storedFilename: stored.storedFilename,
            originalFilename: file.originalname,
            mimeType: file.mimetype,
            fileSize: file.size,
            uploaderId: user.id
          }
        });
        await tx.designItem.update({ where: { id: designId }, data: { currentRevisionNumber: nextRevision, status } });
        await tx.designEvent.createMany({
          data: [
            { designId, revisionId: revision.id, actorId: user.id, action: "REVISION_UPLOADED" },
            ...(input.submitForReview
              ? [{ designId, revisionId: revision.id, actorId: user.id, action: "SUBMITTED_FOR_REVIEW" as DesignEventType }]
              : [])
          ]
        });
      });
      persisted = true;
      await this.audit.record(user, "design.revision_uploaded", { designId, revision: nextRevision }, projectId);
      return this.get(user, projectId, designId);
    } catch (error) {
      if (isUniqueError(error)) throw new ConflictException("A new revision was uploaded concurrently. Retry the upload.");
      throw error;
    } finally {
      if (!persisted) await this.storage.remove(stored.storagePath);
    }
  }

  async submit(user: RequestUser, projectId: string, designId: string, revisionId: string) {
    await this.access.assertCanManage(user, projectId);
    const design = await this.findDesign(projectId, designId);
    const revision = design.revisions.find((item) => item.id === revisionId);
    if (!revision) throw new NotFoundException("Design revision not found.");
    if (revision.revisionNumber !== design.currentRevisionNumber) throw new BadRequestException("Only the current revision can be submitted.");
    if (revision.status !== "DRAFT") throw new ConflictException("Only a draft revision can be submitted.");

    await this.prisma.$transaction([
      this.prisma.designRevision.update({ where: { id: revisionId }, data: { status: "IN_REVIEW" } }),
      this.prisma.designItem.update({ where: { id: designId }, data: { status: "IN_REVIEW" } }),
      this.prisma.designEvent.create({ data: { designId, revisionId, actorId: user.id, action: "SUBMITTED_FOR_REVIEW" } })
    ]);
    await this.audit.record(user, "design.submitted_for_review", { designId, revision: revision.revisionNumber }, projectId);

    const { clientUserId } = await this.notifications.getProjectParticipants(projectId);
    if (clientUserId) {
      await this.notifications.notify([clientUserId], {
        type: "DESIGN_REVIEW_REQUIRED",
        title: `${design.title}: submitted for your review`,
        projectId,
        entityId: designId,
        actorId: user.id
      });
    }

    return this.get(user, projectId, designId);
  }

  async decide(user: RequestUser, projectId: string, designId: string, revisionId: string, rawBody: unknown) {
    await this.access.assertCanReview(user, projectId);
    const input = parseBody(designDecisionSchema, rawBody);
    const design = await this.findDesign(projectId, designId);
    const revision = design.revisions.find((item) => item.id === revisionId);
    if (!revision) throw new NotFoundException("Design revision not found.");
    if (revision.revisionNumber !== design.currentRevisionNumber) throw new BadRequestException("Only the current revision can be reviewed.");
    if (revision.status !== "IN_REVIEW") throw new ConflictException("This revision is not awaiting review.");
    const status: DesignStatus = input.action === "APPROVE" ? "APPROVED" : "REJECTED";
    const action: DesignEventType = input.action === "APPROVE" ? "CLIENT_APPROVED" : "CLIENT_REJECTED";

    await this.prisma.$transaction([
      this.prisma.designRevision.update({ where: { id: revisionId }, data: { status } }),
      this.prisma.designItem.update({ where: { id: designId }, data: { status } }),
      this.prisma.designEvent.create({
        data: { designId, revisionId, actorId: user.id, action, comment: emptyToNull(input.comment) }
      })
    ]);
    await this.audit.record(user, status === "APPROVED" ? "design.client_approved" : "design.client_rejected", { designId, revision: revision.revisionNumber }, projectId);

    const { adminIds, engineerId } = await this.notifications.getProjectParticipants(projectId);
    await this.notifications.notify([...adminIds, ...(engineerId ? [engineerId] : [])], {
      type: status === "APPROVED" ? "DESIGN_APPROVED" : "DESIGN_REJECTED",
      title: status === "APPROVED" ? `${design.title}: approved by client` : `${design.title}: rejected by client`,
      body: emptyToNull(input.comment),
      projectId,
      entityId: designId,
      actorId: user.id
    });

    return this.get(user, projectId, designId);
  }

  async comment(user: RequestUser, projectId: string, designId: string, rawBody: unknown) {
    await this.access.assertCanRead(user, projectId);
    const input = parseBody(designCommentSchema, rawBody);
    const design = await this.findDesign(projectId, designId);
    if (input.revisionId && !design.revisions.some((revision) => revision.id === input.revisionId)) {
      throw new NotFoundException("Design revision not found.");
    }
    await this.prisma.$transaction([
      this.prisma.designEvent.create({
        data: {
          designId,
          actorId: user.id,
          action: "COMMENT_ADDED",
          comment: input.comment.trim(),
          ...(input.revisionId ? { revisionId: input.revisionId } : {})
        }
      }),
      this.prisma.designItem.update({ where: { id: designId }, data: { updatedAt: new Date() } })
    ]);
    await this.audit.record(user, "design.comment_added", { designId }, projectId);
    return this.get(user, projectId, designId);
  }

  async getFile(user: RequestUser, projectId: string, designId: string, revisionId: string) {
    await this.access.assertCanRead(user, projectId);
    const revision = await this.prisma.designRevision.findFirst({ where: { id: revisionId, designId, projectId } });
    if (!revision) throw new NotFoundException("Design revision not found.");
    return revision;
  }

  private async findDesign(projectId: string, designId: string) {
    const design = await this.prisma.designItem.findFirst({ where: { id: designId, projectId }, include: designInclude });
    if (!design) throw new NotFoundException("Design not found.");
    return design;
  }
}

function emptyToNull(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isUniqueError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
}
