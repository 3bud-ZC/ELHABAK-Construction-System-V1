import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma, SiteUpdateType, UserRole } from "@elhabak/database";

import {
  createProjectSchema,
  createSiteUpdateSchema,
  updateProjectPhaseSchema,
  updateProjectProgressSchema,
  updateProjectSchema
} from "@elhabak/validation";
import { PrismaService } from "../../shared/prisma.service";
import type { RequestUser } from "../../shared/http.types";
import { parseBody } from "../../shared/zod";
import { AuditService } from "../admin/audit.service";
import { ProjectAccessService } from "./project-access.service";
import { projectInclude, toProjectResponse } from "./project-response";
import { StorageService } from "./storage.service";

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly access: ProjectAccessService,
    private readonly storage: StorageService
  ) {}

  async adminList(search?: string, status?: Prisma.EnumProjectStatusFilter["equals"], phase?: Prisma.EnumProjectPhaseFilter["equals"]) {
    const where: Prisma.ProjectWhereInput = {};
    const trimmed = search?.trim();
    if (status) where.status = status;
    if (phase) where.phase = phase;
    if (trimmed) {
      where.OR = [
        { name: { contains: trimmed, mode: "insensitive" } },
        { code: { contains: trimmed, mode: "insensitive" } },
        { location: { contains: trimmed, mode: "insensitive" } },
        { client: { user: { displayName: { contains: trimmed, mode: "insensitive" } } } }
      ];
    }

    const projects = await this.prisma.project.findMany({
      where,
      include: projectInclude,
      orderBy: { updatedAt: "desc" }
    });
    return projects.map((p) => toProjectResponse(p, "ADMIN"));
  }


  async dashboard() {
    const [activeProjects, clientCount, projects, recentUpdates, recentActivity] = await Promise.all([
      this.prisma.project.count({ where: { status: "ACTIVE" } }),
      this.prisma.clientProfile.count(),
      this.prisma.project.findMany({
        include: projectInclude,
        orderBy: { updatedAt: "desc" },
        take: 6
      }),
      this.prisma.siteUpdate.findMany({
        include: { project: true, author: true, media: true },
        orderBy: { createdAt: "desc" },
        take: 5
      }),
      this.prisma.auditLog.findMany({
        include: { actor: true, project: true },
        orderBy: { createdAt: "desc" },
        take: 8
      })
    ]);

    return {
      activeProjects,
      clientCount,
      projects: projects.map((p) => toProjectResponse(p, "ADMIN")),
      recentUpdates: recentUpdates.map((update) => ({
        id: update.id,
        projectId: update.projectId,
        projectName: update.project.name,
        note: update.note,
        createdAt: update.createdAt.toISOString(),
        author: { id: update.author.id, displayName: update.author.displayName, role: update.author.role },
        mediaCount: update.media.length
      })),
      recentActivity: recentActivity.map((item) => ({
        id: item.id,
        action: item.action,
        createdAt: item.createdAt.toISOString(),
        actorName: item.actor?.displayName ?? null,
        projectName: item.project?.name ?? null
      }))
    };
  }

  async visibleList(user: RequestUser) {
    const projects = await this.prisma.project.findMany({
      where: this.access.projectWhereFor(user),
      include: projectInclude,
      orderBy: { updatedAt: "desc" }
    });
    return projects.map((p) => toProjectResponse(p, user.role));
  }

  async getForUser(user: RequestUser, id: string) {
    await this.access.assertCanRead(user, id);
    const project = await this.prisma.project.findUnique({ where: { id }, include: projectInclude });
    if (!project) {
      throw new NotFoundException("Project not found.");
    }
    return toProjectResponse(project, user.role);
  }


  async get(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id }, include: projectInclude });
    if (!project) {
      throw new NotFoundException("Project not found.");
    }
    return toProjectResponse(project);
  }

  async create(actorId: string, rawBody: unknown) {
    const input = parseBody(createProjectSchema, rawBody);
    await this.assertClient(input.clientId);
    await this.assertUserRole(input.engineerId, "ENGINEER");
    await this.assertWorkerIds(input.workerIds);

    try {
      const project = await this.prisma.project.create({
        data: {
          name: input.name.trim(),
          code: input.code.trim().toUpperCase(),
          category: input.category,
          client: { connect: { id: input.clientId } },
          engineer: { connect: { id: input.engineerId } },
          location: emptyToNullValue(input.location),
          startDate: parseDateValue(input.startDate),
          targetDate: parseDateValue(input.targetDate),
          phase: input.phase,
          progress: input.progress,
          status: input.status,
          notes: emptyToNullValue(input.notes),
          assignments: { create: input.workerIds.map((userId) => ({ user: { connect: { id: userId } } })) }
        },
        include: projectInclude
      });
      await this.audit.record(actorId, "project.created", { projectId: project.id, code: project.code ?? "" }, project.id);
      if (input.engineerId) await this.audit.record(actorId, "project.engineer_assigned", { engineerId: input.engineerId }, project.id);
      if (input.workerIds.length > 0) await this.audit.record(actorId, "project.worker_assigned", { workerIds: input.workerIds }, project.id);
      return toProjectResponse(project);
    } catch (error) {
      handleProjectUnique(error);
    }
  }

  async update(actorId: string, id: string, rawBody: unknown) {
    const input = parseBody(updateProjectSchema, rawBody);
    const existing = await this.prisma.project.findUnique({
      where: { id },
      include: { assignments: true }
    });
    if (!existing) throw new NotFoundException("Project not found.");
    if (input.clientId) await this.assertClient(input.clientId);
    if (input.engineerId) await this.assertUserRole(input.engineerId, "ENGINEER");
    if (input.workerIds) await this.assertWorkerIds(input.workerIds);

    const data: Prisma.ProjectUpdateInput = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.code !== undefined) data.code = input.code.trim().toUpperCase();
    if (input.category !== undefined) data.category = input.category;
    if (input.clientId !== undefined) data.client = { connect: { id: input.clientId } };
    if (input.engineerId !== undefined) data.engineer = { connect: { id: input.engineerId } };
    if (input.location !== undefined) data.location = emptyToNullValue(input.location);
    if (input.startDate !== undefined) data.startDate = parseDateValue(input.startDate);
    if (input.targetDate !== undefined) data.targetDate = parseDateValue(input.targetDate);
    if (input.phase !== undefined) data.phase = input.phase;
    if (input.progress !== undefined) data.progress = input.progress;
    if (input.status !== undefined) data.status = input.status;
    if (input.notes !== undefined) data.notes = emptyToNullValue(input.notes);
    if (input.workerIds !== undefined) {
      data.assignments = {
        deleteMany: {},
        create: input.workerIds.map((userId) => ({ user: { connect: { id: userId } } }))
      };
    }

    try {
      const project = await this.prisma.project.update({ where: { id }, data, include: projectInclude });
      await this.audit.record(actorId, "project.edited", { projectId: id }, id);
      if (input.phase !== undefined && input.phase !== existing.phase) {
        await this.audit.record(actorId, "project.phase_changed", { from: existing.phase, to: input.phase }, id);
      }
      if (input.progress !== undefined && input.progress !== existing.progress) {
        await this.audit.record(actorId, "project.progress_changed", { from: existing.progress, to: input.progress }, id);
      }
      if (input.engineerId !== undefined && input.engineerId !== existing.engineerId) {
        await this.audit.record(actorId, "project.engineer_assigned", { engineerId: input.engineerId }, id);
      }
      if (input.workerIds !== undefined) {
        const before = new Set(existing.assignments.map((assignment) => assignment.userId));
        const after = new Set(input.workerIds);
        const added = input.workerIds.filter((userId) => !before.has(userId));
        const removed = [...before].filter((userId) => !after.has(userId));
        if (added.length > 0) await this.audit.record(actorId, "project.worker_assigned", { workerIds: added }, id);
        if (removed.length > 0) await this.audit.record(actorId, "project.worker_removed", { workerIds: removed }, id);
      }
      return toProjectResponse(project);
    } catch (error) {
      handleProjectUnique(error);
    }
  }

  async updateProgress(user: RequestUser, projectId: string, rawBody: unknown) {
    await this.access.assertCanManageProgressAndPhase(user, projectId);
    const input = parseBody(updateProjectProgressSchema, rawBody);

    const existing = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, progress: true }
    });
    if (!existing) {
      throw new NotFoundException("Project not found.");
    }

    const previousProgress = existing.progress;
    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: { progress: input.progress },
      include: projectInclude
    });

    await this.audit.record(
      user.id,
      "project.progress_changed",
      { from: previousProgress, to: input.progress, note: input.note ?? null },
      projectId
    );

    return toProjectResponse(updated, user.role);
  }

  async updatePhase(user: RequestUser, projectId: string, rawBody: unknown) {
    await this.access.assertCanManageProgressAndPhase(user, projectId);
    const input = parseBody(updateProjectPhaseSchema, rawBody);

    const existing = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, phase: true }
    });
    if (!existing) {
      throw new NotFoundException("Project not found.");
    }

    const previousPhase = existing.phase;
    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: { phase: input.phase },
      include: projectInclude
    });

    await this.audit.record(
      user.id,
      "project.phase_changed",
      { from: previousPhase, to: input.phase, note: input.note ?? null },
      projectId
    );

    return toProjectResponse(updated, user.role);
  }

  async createSiteUpdate(user: RequestUser, projectId: string, rawBody: unknown, files: Express.Multer.File[] = []) {
    await this.access.assertCanSubmitSiteUpdate(user, projectId);
    if (files.length === 0) {
      throw new BadRequestException("At least one media file is required.");
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, phase: true, progress: true }
    });
    if (!project) {
      throw new NotFoundException("Project not found.");
    }

    const input = parseBody(createSiteUpdateSchema, rawBody);
    const storedFiles = await Promise.all(files.map((file) => this.storage.store(projectId, file)));

    const canSetProgress = user.role === "ADMIN" || user.role === "ENGINEER";
    const progressImpact = canSetProgress && input.progressImpact !== undefined ? input.progressImpact : null;

    const update = await this.prisma.siteUpdate.create({
      data: {
        projectId,
        authorId: user.id,
        type: input.type,
        phase: project.phase,
        progressImpact,
        isClientVisible: input.isClientVisible,
        note: emptyToNullValue(input.note),
        media: {
          create: storedFiles.map((stored, index) => ({
            projectId,
            uploaderId: user.id,
            mediaType: stored.mediaType,
            storagePath: stored.storagePath,
            storedFilename: stored.storedFilename,
            originalFilename: files[index]?.originalname ?? stored.storedFilename,
            mimeType: files[index]?.mimetype ?? "application/octet-stream",
            fileSize: files[index]?.size ?? 0
          }))
        }
      },
      include: { author: true, media: true }
    });

    if (progressImpact !== null && progressImpact !== project.progress) {
      await this.prisma.project.update({
        where: { id: projectId },
        data: { progress: progressImpact }
      });
      await this.audit.record(
        user.id,
        "project.progress_changed",
        { from: project.progress, to: progressImpact, siteUpdateId: update.id },
        projectId
      );
    }

    await this.audit.record(
      user.id,
      "site_update.submitted",
      { projectId, type: input.type, mediaCount: files.length, isClientVisible: input.isClientVisible },
      projectId
    );

    return {
      id: update.id,
      type: update.type,
      phase: update.phase,
      progressImpact: update.progressImpact,
      isClientVisible: update.isClientVisible,
      note: update.note,
      createdAt: update.createdAt.toISOString(),
      updatedAt: update.updatedAt.toISOString(),
      author: { id: update.author.id, displayName: update.author.displayName, role: update.author.role },
      media: update.media.map((media) => ({
        id: media.id,
        mediaType: media.mediaType,
        originalFilename: media.originalFilename,
        mimeType: media.mimeType,
        fileSize: media.fileSize,
        createdAt: media.createdAt.toISOString()
      }))
    };
  }

  async getTimeline(user: RequestUser, projectId: string, filterType?: string) {
    await this.access.assertCanRead(user, projectId);

    const isClient = user.role === "CLIENT";

    const [siteUpdates, auditLogs] = await Promise.all([
      this.prisma.siteUpdate.findMany({
        where: {
          projectId,
          ...(isClient ? { isClientVisible: true } : {}),
          ...(filterType && filterType !== "ALL" ? { type: filterType as SiteUpdateType } : {})
        },

        include: {
          author: true,
          media: { orderBy: { createdAt: "asc" } }
        },
        orderBy: { createdAt: "desc" }
      }),
      this.prisma.auditLog.findMany({
        where: {
          projectId,
          action: {
            in: isClient
              ? ["project.created", "project.phase_changed", "project.progress_changed"]
              : ["project.created", "project.phase_changed", "project.progress_changed", "project.engineer_assigned", "project.worker_assigned", "site_update.submitted"]
          }
        },
        include: { actor: true },
        orderBy: { createdAt: "desc" }
      })
    ]);

    type TimelineEvent = {
      id: string;
      kind: "SITE_UPDATE" | "PROGRESS_CHANGE" | "PHASE_CHANGE" | "PROJECT_CREATED";
      type?: string;
      title: string;
      description?: string | null;
      timestamp: string;
      actor: { id: string; displayName: string; role: string } | null;
      phase?: string | null;
      progress?: number | null;
      isClientVisible?: boolean;
      media?: Array<{
        id: string;
        mediaType: string;
        originalFilename: string;
        mimeType: string;
        fileSize: number;
        createdAt: string;
      }>;
      metadata?: unknown;
    };

    const events: TimelineEvent[] = [];

    for (const update of siteUpdates) {
      events.push({
        id: update.id,
        kind: "SITE_UPDATE",
        type: update.type,
        title: getSiteUpdateTypeLabel(update.type),
        description: update.note,
        timestamp: update.createdAt.toISOString(),
        actor: { id: update.author.id, displayName: update.author.displayName, role: update.author.role },
        phase: update.phase,
        progress: update.progressImpact,
        isClientVisible: update.isClientVisible,
        media: update.media.map((m) => ({
          id: m.id,
          mediaType: m.mediaType,
          originalFilename: m.originalFilename,
          mimeType: m.mimeType,
          fileSize: m.fileSize,
          createdAt: m.createdAt.toISOString()
        }))
      });
    }

    if (!filterType || filterType === "ALL") {
      for (const log of auditLogs) {
        if (log.action === "project.phase_changed") {
          const meta = log.metadata as { from?: string; to?: string; note?: string } | null;
          events.push({
            id: log.id,
            kind: "PHASE_CHANGE",
            title: `Phase Changed: ${meta?.to ?? ""}`,
            description: meta?.note ?? `Phase shifted from ${meta?.from ?? ""} to ${meta?.to ?? ""}`,
            timestamp: log.createdAt.toISOString(),
            actor: log.actor ? { id: log.actor.id, displayName: log.actor.displayName, role: log.actor.role } : null,
            phase: meta?.to ?? null,
            metadata: meta
          });
        } else if (log.action === "project.progress_changed") {
          const meta = log.metadata as { from?: number; to?: number; note?: string } | null;
          events.push({
            id: log.id,
            kind: "PROGRESS_CHANGE",
            title: `Progress Updated: ${meta?.to ?? 0}%`,
            description: meta?.note ?? `Progress changed from ${meta?.from ?? 0}% to ${meta?.to ?? 0}%`,
            timestamp: log.createdAt.toISOString(),
            actor: log.actor ? { id: log.actor.id, displayName: log.actor.displayName, role: log.actor.role } : null,
            progress: meta?.to ?? null,
            metadata: meta
          });
        } else if (log.action === "project.created") {
          events.push({
            id: log.id,
            kind: "PROJECT_CREATED",
            title: "Project Initialized",
            description: "Project record and initial phase configured.",
            timestamp: log.createdAt.toISOString(),
            actor: log.actor ? { id: log.actor.id, displayName: log.actor.displayName, role: log.actor.role } : null
          });
        }
      }
    }

    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return events;
  }

  async getMediaForUser(user: RequestUser, projectId: string, mediaId: string) {
    const media = await this.prisma.siteMedia.findUnique({
      where: { id: mediaId },
      include: { siteUpdate: true }
    });
    if (!media) throw new NotFoundException("Media not found.");
    if (media.projectId !== projectId) throw new NotFoundException("Media not found.");
    await this.access.assertCanRead(user, media.projectId);
    if (user.role === "CLIENT" && !media.siteUpdate.isClientVisible) {
      throw new NotFoundException("Media not found.");
    }
    return media;
  }


  private async assertClient(clientId: string) {
    const client = await this.prisma.clientProfile.findUnique({ where: { id: clientId } });
    if (!client) throw new BadRequestException("Client is invalid.");
  }

  private async assertUserRole(userId: string, role: UserRole) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== role || !user.isActive) {
      throw new BadRequestException(`User must be active ${role}.`);
    }
  }

  private async assertWorkerIds(workerIds: string[]) {
    const unique = [...new Set(workerIds)];
    if (unique.length !== workerIds.length) throw new BadRequestException("Duplicate workers are not allowed.");
    for (const workerId of unique) {
      await this.assertUserRole(workerId, "WORKER");
    }
  }
}

function emptyToNullValue(value: string | undefined): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function parseDateValue(value: string | undefined): Date | null {
  if (value === undefined) return null;
  if (value.trim() === "") return null;
  return new Date(`${value}T00:00:00.000Z`);
}

function handleProjectUnique(error: unknown): never {
  if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002") {
    throw new ConflictException("Project code is already in use.");
  }
  throw error;
}

function getSiteUpdateTypeLabel(type: string): string {
  switch (type) {
    case "PROGRESS":
      return "Progress Update";
    case "INSPECTION":
      return "Site Inspection";
    case "ISSUE":
      return "Field Issue";
    case "MATERIAL":
      return "Material Delivery";
    case "GENERAL":
    default:
      return "Site Update";
  }
}

