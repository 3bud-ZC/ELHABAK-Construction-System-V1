import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { ExecutionStageStatus, Prisma } from "@elhabak/database";
import {
  createExecutionStageSchema,
  reorderExecutionStagesSchema,
  setExecutionStageTeamSchema,
  updateExecutionStageSchema
} from "@elhabak/validation";
import { PrismaService } from "../../shared/prisma.service";
import type { RequestUser } from "../../shared/http.types";
import { parseBody } from "../../shared/zod";
import { AuditService } from "../admin/audit.service";
import { ProjectAccessService } from "./project-access.service";

const STAGE_LIMIT = 300;
const memberSelect = { id: true, displayName: true, role: true, specialty: true, isActive: true } satisfies Prisma.UserSelect;
const stageInclude = {
  assignments: { include: { user: { select: memberSelect } }, orderBy: { createdAt: "asc" } },
  _count: { select: { siteUpdates: true } }
} satisfies Prisma.ExecutionStageInclude;
type StageRow = Prisma.ExecutionStageGetPayload<{ include: typeof stageInclude }>;

/** Fields an assigned engineer may change on a stage they are responsible for. */
const ENGINEER_FIELDS = new Set(["status", "progress", "description", "actualStartDate", "actualEndDate"]);

type Viewer = {
  isAdmin: boolean;
  isClient: boolean;
  isLeadEngineer: boolean;
  isEngineer: boolean;
  isWorker: boolean;
};

/**
 * Execution work packages: the second-level operational structure inside lifecycle phase 04
 * (EXECUTION). Stages are fully custom per project (free-text names, Admin-ordered).
 *
 * Authorization (server-side, on top of ProjectAccessService's project read rule):
 *  - ADMIN: full management (create, edit, reorder, delete, assign team).
 *  - ENGINEER on the project: reads every stage; updates status/progress/notes/actual dates
 *    of stages they are assigned to - or every stage when they are the lead engineer.
 *  - WORKER on the project: reads only the stages they are assigned to.
 *  - CLIENT (own project): high-level read only - no team, no internal notes.
 *  - ACCOUNTANT: no access (finance-only role, same as the project overview).
 *
 * Progress: `executionProgress` is the equal-weight average of stage progress (every work
 * package counts once), reported next to - never written into - Project.progress.
 */
@Injectable()
export class ExecutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly audit: AuditService
  ) {}

  async getExecution(user: RequestUser, projectId: string) {
    const viewer = await this.viewerFor(user, projectId);
    const [project, stages] = await Promise.all([
      this.prisma.project.findUnique({ where: { id: projectId }, select: { id: true, phase: true, progress: true, engineerId: true } }),
      this.prisma.executionStage.findMany({
        where: { projectId, ...(viewer.isWorker ? { assignments: { some: { userId: user.id } } } : {}) },
        include: stageInclude,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
      })
    ]);
    if (!project) throw new NotFoundException("Project not found.");

    const engineers = new Set<string>();
    const workers = new Set<string>();
    for (const stage of stages) {
      for (const assignment of stage.assignments) {
        if (assignment.user.role === "ENGINEER") engineers.add(assignment.userId);
        if (assignment.user.role === "WORKER") workers.add(assignment.userId);
      }
    }
    const count = (status: ExecutionStageStatus) => stages.filter((stage) => stage.status === status).length;

    return {
      projectId,
      phase: project.phase,
      projectProgress: project.progress,
      permissions: {
        manage: viewer.isAdmin,
        updateAny: viewer.isAdmin || viewer.isLeadEngineer
      },
      summary: {
        total: stages.length,
        planned: count("PLANNED"),
        ready: count("READY"),
        inProgress: count("IN_PROGRESS"),
        blocked: count("BLOCKED"),
        completed: count("COMPLETED"),
        executionProgress: executionProgress(stages),
        weighting: "EQUAL" as const,
        ...(viewer.isClient ? {} : { assignedEngineers: engineers.size, assignedWorkers: workers.size })
      },
      stages: stages.map((stage) => this.serialize(stage, viewer, user.id))
    };
  }

  async getStage(user: RequestUser, projectId: string, stageId: string) {
    const viewer = await this.viewerFor(user, projectId);
    const stage = await this.findStage(projectId, stageId);
    if (viewer.isWorker && !stage.assignments.some((assignment) => assignment.userId === user.id)) {
      throw new NotFoundException("Execution stage not found.");
    }

    const [siteUpdates, history] = await Promise.all([
      this.prisma.siteUpdate.findMany({
        where: { projectId, executionStageId: stageId, ...(viewer.isClient ? { isClientVisible: true } : {}) },
        select: {
          id: true,
          type: true,
          note: true,
          createdAt: true,
          isClientVisible: true,
          author: { select: { id: true, displayName: true, role: true } },
          _count: { select: { media: true } }
        },
        orderBy: { createdAt: "desc" },
        take: 20
      }),
      viewer.isClient
        ? Promise.resolve([])
        : this.prisma.auditLog.findMany({
            where: { projectId, action: { startsWith: "execution." }, metadata: { path: ["stageId"], equals: stageId } },
            select: { id: true, action: true, metadata: true, createdAt: true, actor: { select: { displayName: true } } },
            orderBy: { createdAt: "desc" },
            take: 50
          })
    ]);

    return {
      stage: this.serialize(stage, viewer, user.id),
      siteUpdates: siteUpdates.map((update) => ({
        id: update.id,
        type: update.type,
        note: update.note,
        createdAt: update.createdAt.toISOString(),
        isClientVisible: update.isClientVisible,
        author: update.author,
        mediaCount: update._count.media
      })),
      history: history.map((entry) => ({
        id: entry.id,
        action: entry.action,
        actorName: entry.actor?.displayName ?? null,
        createdAt: entry.createdAt.toISOString(),
        changes: historyChanges(entry.metadata)
      }))
    };
  }

  async createStage(user: RequestUser, projectId: string, rawBody: unknown) {
    await this.assertAdmin(user, projectId);
    const input = parseBody(createExecutionStageSchema, rawBody);
    const dates = parseStageDates(input);
    assertDateOrder(dates);
    const existing = await this.prisma.executionStage.aggregate({ where: { projectId }, _count: { _all: true }, _max: { sortOrder: true } });
    if (existing._count._all >= STAGE_LIMIT) throw new BadRequestException(`A project can hold at most ${STAGE_LIMIT} execution stages.`);

    const stage = await this.prisma.executionStage.create({
      data: {
        projectId,
        name: input.name,
        code: emptyToNull(input.code),
        description: emptyToNull(input.description),
        status: input.status,
        progress: normalizedProgress(input.status, input.progress),
        sortOrder: (existing._max.sortOrder ?? 0) + 1,
        createdById: user.id,
        ...dates
      },
      include: stageInclude
    });
    await this.audit.record(user, "execution.stage_created", { stageId: stage.id, name: stage.name, status: stage.status, progress: stage.progress }, projectId);
    return this.serialize(stage, adminViewer, user.id);
  }

  async updateStage(user: RequestUser, projectId: string, stageId: string, rawBody: unknown) {
    const viewer = await this.viewerFor(user, projectId);
    const input = parseBody(updateExecutionStageSchema, rawBody);
    const existing = await this.findStage(projectId, stageId);
    this.assertCanUpdate(viewer, existing, user.id, Object.keys(input));

    const dates = parseStageDates(input);
    assertDateOrder({
      plannedStartDate: "plannedStartDate" in dates ? dates.plannedStartDate : existing.plannedStartDate,
      plannedEndDate: "plannedEndDate" in dates ? dates.plannedEndDate : existing.plannedEndDate,
      actualStartDate: "actualStartDate" in dates ? dates.actualStartDate : existing.actualStartDate,
      actualEndDate: "actualEndDate" in dates ? dates.actualEndDate : existing.actualEndDate
    });

    const status = input.status ?? existing.status;
    const data: Prisma.ExecutionStageUpdateInput = { ...dates };
    if (input.name !== undefined) data.name = input.name;
    if (input.code !== undefined) data.code = emptyToNull(input.code);
    if (input.description !== undefined) data.description = emptyToNull(input.description);
    if (input.status !== undefined) data.status = input.status;
    if (input.progress !== undefined || input.status === "COMPLETED") {
      data.progress = normalizedProgress(status, input.progress ?? existing.progress);
    }

    const stage = await this.prisma.executionStage.update({ where: { id: stageId }, data, include: stageInclude });
    const changes: Record<string, string | number | null> = {};
    for (const key of ["name", "status", "progress"] as const) {
      if (stage[key] !== existing[key]) changes[key] = stage[key];
    }
    if (input.description !== undefined && stage.description !== existing.description) changes.notesUpdated = 1;
    for (const key of ["plannedStartDate", "plannedEndDate", "actualStartDate", "actualEndDate"] as const) {
      if ((stage[key]?.getTime() ?? null) !== (existing[key]?.getTime() ?? null)) changes[key] = stage[key]?.toISOString().slice(0, 10) ?? null;
    }
    await this.audit.record(
      user,
      input.progress !== undefined || input.status !== undefined ? "execution.stage_progress_updated" : "execution.stage_updated",
      {
        stageId,
        name: stage.name,
        ...(changes.status !== undefined ? { fromStatus: existing.status, status: stage.status } : {}),
        ...(changes.progress !== undefined ? { fromProgress: existing.progress, progress: stage.progress } : {}),
        changed: Object.keys(changes)
      },
      projectId
    );
    return this.serialize(stage, viewer, user.id);
  }

  async deleteStage(user: RequestUser, projectId: string, stageId: string) {
    await this.assertAdmin(user, projectId);
    const stage = await this.findStage(projectId, stageId);
    // Stage assignments cascade; linked site updates keep their history (stage link set to null).
    await this.prisma.executionStage.delete({ where: { id: stageId } });
    await this.audit.record(user, "execution.stage_deleted", { stageId, name: stage.name }, projectId);
    return { ok: true as const, id: stageId };
  }

  async reorderStages(user: RequestUser, projectId: string, rawBody: unknown) {
    await this.assertAdmin(user, projectId);
    const { stageIds } = parseBody(reorderExecutionStagesSchema, rawBody);
    const existing = await this.prisma.executionStage.findMany({ where: { projectId }, select: { id: true } });
    const known = new Set(existing.map((stage) => stage.id));
    if (stageIds.length !== known.size || stageIds.some((id) => !known.has(id))) {
      throw new BadRequestException("The new order must list every stage of this project exactly once.");
    }
    await this.prisma.$transaction(
      stageIds.map((id, index) => this.prisma.executionStage.update({ where: { id }, data: { sortOrder: index + 1 }, select: { id: true } }))
    );
    await this.audit.record(user, "execution.stages_reordered", { stageIds }, projectId);
    return this.getExecution(user, projectId);
  }

  /**
   * Replaces a stage's team. Only active ENGINEER/WORKER users are eligible (ACCOUNTANT,
   * CLIENT and ADMIN are rejected). A person assigned to a stage who is not yet on the project
   * team is added to it, since working a stage means working on the project.
   */
  async setStageTeam(user: RequestUser, projectId: string, stageId: string, rawBody: unknown) {
    await this.assertAdmin(user, projectId);
    const { userIds } = parseBody(setExecutionStageTeamSchema, rawBody);
    const stage = await this.findStage(projectId, stageId);

    if (userIds.length > 0) {
      const eligible = await this.prisma.user.findMany({
        where: { id: { in: userIds }, role: { in: ["ENGINEER", "WORKER"] }, isActive: true, archivedAt: null },
        select: { id: true }
      });
      if (eligible.length !== userIds.length) {
        throw new BadRequestException("Only active engineers and workers can be assigned to an execution stage.");
      }
    }

    const before = new Set(stage.assignments.map((assignment) => assignment.userId));
    const after = new Set(userIds);
    const added = userIds.filter((id) => !before.has(id));
    const removed = [...before].filter((id) => !after.has(id));

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { engineerId: true, assignments: { select: { userId: true } } }
    });
    const onTeam = new Set([...(project?.assignments.map((assignment) => assignment.userId) ?? []), ...(project?.engineerId ? [project.engineerId] : [])]);
    const joiningProject = added.filter((id) => !onTeam.has(id));

    await this.prisma.$transaction([
      this.prisma.executionStageAssignment.deleteMany({ where: { stageId, userId: { in: removed } } }),
      this.prisma.executionStageAssignment.createMany({ data: added.map((userId) => ({ stageId, userId })), skipDuplicates: true }),
      this.prisma.projectAssignment.createMany({ data: joiningProject.map((userId) => ({ projectId, userId })), skipDuplicates: true })
    ]);
    if (added.length > 0 || removed.length > 0) {
      await this.audit.record(user, "execution.stage_team_updated", { stageId, name: stage.name, added, removed }, projectId);
    }
    if (joiningProject.length > 0) {
      await this.audit.record(user, "project.team_member_added", { userIds: joiningProject, viaStageId: stageId }, projectId);
    }
    return this.serialize(await this.findStage(projectId, stageId), adminViewer, user.id);
  }

  /** Used by site-update creation: the stage must belong to the project (and to the worker). */
  async assertStageForSiteUpdate(user: RequestUser, projectId: string, stageId: string) {
    const stage = await this.prisma.executionStage.findFirst({
      where: { id: stageId, projectId },
      select: { id: true, assignments: { where: { userId: user.id }, select: { userId: true } } }
    });
    if (!stage) throw new BadRequestException("Execution stage is invalid for this project.");
    if (user.role === "WORKER" && stage.assignments.length === 0) {
      throw new ForbiddenException("Workers can only report on execution stages they are assigned to.");
    }
  }

  private serialize(stage: StageRow, viewer: Viewer, userId: string) {
    const assignedToMe = stage.assignments.some((assignment) => assignment.userId === userId);
    const base = {
      id: stage.id,
      name: stage.name,
      code: stage.code,
      sortOrder: stage.sortOrder,
      status: stage.status,
      progress: stage.progress,
      plannedStartDate: toDate(stage.plannedStartDate),
      plannedEndDate: toDate(stage.plannedEndDate),
      actualStartDate: toDate(stage.actualStartDate),
      actualEndDate: toDate(stage.actualEndDate),
      updatedAt: stage.updatedAt.toISOString()
    };
    if (viewer.isClient) return base;
    const member = (assignment: StageRow["assignments"][number]) => ({
      id: assignment.user.id,
      displayName: assignment.user.displayName,
      role: assignment.user.role,
      specialty: assignment.user.specialty,
      isActive: assignment.user.isActive
    });
    return {
      ...base,
      description: stage.description,
      engineers: stage.assignments.filter((assignment) => assignment.user.role === "ENGINEER").map(member),
      workers: stage.assignments.filter((assignment) => assignment.user.role === "WORKER").map(member),
      siteUpdateCount: stage._count.siteUpdates,
      assignedToMe,
      canUpdate: viewer.isAdmin || viewer.isLeadEngineer || (viewer.isEngineer && assignedToMe)
    };
  }

  private assertCanUpdate(viewer: Viewer, stage: StageRow, userId: string, fields: string[]) {
    if (viewer.isAdmin) return;
    if (!viewer.isEngineer) throw new ForbiddenException("Only administrators and responsible engineers can update execution stages.");
    const responsible = viewer.isLeadEngineer || stage.assignments.some((assignment) => assignment.userId === userId);
    if (!responsible) throw new ForbiddenException("You are not assigned to this execution stage.");
    const restricted = fields.filter((field) => !ENGINEER_FIELDS.has(field));
    if (restricted.length > 0) throw new ForbiddenException("Engineers can update status, progress, notes and actual dates only.");
  }

  private async assertAdmin(user: RequestUser, projectId: string) {
    if (user.role !== "ADMIN") throw new ForbiddenException("Only administrators can manage execution stages.");
    const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) throw new NotFoundException("Project not found.");
  }

  private async viewerFor(user: RequestUser, projectId: string): Promise<Viewer> {
    if (user.role === "ACCOUNTANT") throw new ForbiddenException("Execution control is outside the finance workspace.");
    await this.access.assertCanRead(user, projectId);
    const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { engineerId: true } });
    if (!project) throw new NotFoundException("Project not found.");
    return {
      isAdmin: user.role === "ADMIN",
      isClient: user.role === "CLIENT",
      isEngineer: user.role === "ENGINEER",
      isLeadEngineer: user.role === "ENGINEER" && project.engineerId === user.id,
      isWorker: user.role === "WORKER"
    };
  }

  /** Scoped by projectId, so a stage id from another project is simply "not found" (no IDOR). */
  private async findStage(projectId: string, stageId: string) {
    const stage = await this.prisma.executionStage.findFirst({ where: { id: stageId, projectId }, include: stageInclude });
    if (!stage) throw new NotFoundException("Execution stage not found.");
    return stage;
  }
}

const adminViewer: Viewer = { isAdmin: true, isClient: false, isEngineer: false, isLeadEngineer: false, isWorker: false };

/** Equal-weight average of stage progress, rounded to an integer; null when there are no stages. */
export function executionProgress(stages: Array<{ progress: number }>): number | null {
  if (stages.length === 0) return null;
  return Math.round(stages.reduce((sum, stage) => sum + stage.progress, 0) / stages.length);
}

/** A COMPLETED stage is 100%; any other status keeps the reported value. */
function normalizedProgress(status: ExecutionStageStatus, progress: number) {
  return status === "COMPLETED" ? 100 : progress;
}

type DateInput = { plannedStartDate?: string | undefined; plannedEndDate?: string | undefined; actualStartDate?: string | undefined; actualEndDate?: string | undefined };
type StageDates = { plannedStartDate?: Date | null; plannedEndDate?: Date | null; actualStartDate?: Date | null; actualEndDate?: Date | null };

function parseStageDates(input: DateInput): StageDates {
  const result: StageDates = {};
  for (const key of ["plannedStartDate", "plannedEndDate", "actualStartDate", "actualEndDate"] as const) {
    const value = input[key];
    if (value === undefined) continue;
    result[key] = value.trim() === "" ? null : new Date(`${value}T00:00:00.000Z`);
  }
  return result;
}

function assertDateOrder(dates: StageDates) {
  if (dates.plannedStartDate && dates.plannedEndDate && dates.plannedEndDate < dates.plannedStartDate) {
    throw new BadRequestException("Planned end date must be on or after the planned start date.");
  }
  if (dates.actualStartDate && dates.actualEndDate && dates.actualEndDate < dates.actualStartDate) {
    throw new BadRequestException("Actual end date must be on or after the actual start date.");
  }
}

function emptyToNull(value: string | undefined) {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function toDate(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : null;
}

function historyChanges(metadata: Prisma.JsonValue) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  const meta = metadata as Record<string, Prisma.JsonValue>;
  const pick = (key: string) => {
    const value = meta[key];
    return typeof value === "string" || typeof value === "number" ? value : undefined;
  };
  return {
    ...(pick("fromStatus") !== undefined ? { fromStatus: pick("fromStatus") } : {}),
    ...(pick("status") !== undefined ? { status: pick("status") } : {}),
    ...(pick("fromProgress") !== undefined ? { fromProgress: pick("fromProgress") } : {}),
    ...(pick("progress") !== undefined ? { progress: pick("progress") } : {}),
    ...(Array.isArray(meta.added) ? { added: meta.added.length } : {}),
    ...(Array.isArray(meta.removed) ? { removed: meta.removed.length } : {})
  };
}
