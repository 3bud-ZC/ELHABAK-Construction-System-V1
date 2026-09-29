import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { permanentDeleteSchema } from "@elhabak/validation";
import { PrismaService } from "../../shared/prisma.service";
import { parseBody } from "../../shared/zod";
import { StorageService, type StorageQuarantine } from "../projects/storage.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";

/** Record counts a permanent deletion removes, grouped by data type. Always computed server-side. */
export type DeletionImpact = {
  projects: number;
  executionStages: number;
  executionStageAssignments: number;
  teamAssignments: number;
  siteUpdates: number;
  siteMedia: number;
  designs: number;
  designRevisions: number;
  designEvents: number;
  documents: number;
  documentVersions: number;
  financialProfiles: number;
  costEstimates: number;
  costEstimateItems: number;
  boqItems: number;
  expenses: number;
  clientPayments: number;
  contractorPayments: number;
  financialAttachments: number;
  chatMessages: number;
  chatReadStates: number;
  notifications: number;
  activityEntries: number;
  files: number;
  fileBytes: number;
};

export type ClientDeletionImpact = DeletionImpact & {
  userAccounts: number;
  sessions: number;
};

export type StorageCleanupResult = { status: "complete" | "partial"; filesRemoved: number; failedPaths: string[] };

const CLIENT_CONFIRMATION = "DELETE";

/**
 * True permanent deletion for Projects and Clients (distinct from archive/suspend).
 *
 * Order of operations, so the database and protected storage never silently diverge:
 *  1. read every storage path from the database (never from the request);
 *  2. quarantine the files: atomic renames into STORAGE_ROOT/.deleted/<id> (reversible);
 *  3. delete the rows in ONE database transaction (FK cascades + explicit project-scoped
 *     activity rows); on failure the quarantine is restored and nothing is lost;
 *  4. purge the quarantine; a purge failure is reported as "partial" with the paths left.
 * User accounts of Engineers/Workers assigned to a deleted project are never deleted -
 * only their membership rows.
 */
@Injectable()
export class PermanentDeletionService {
  private readonly logger = new Logger(PermanentDeletionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly realtime: RealtimeGateway
  ) {}

  async projectImpact(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, code: true, name: true, client: { select: { id: true, user: { select: { displayName: true } } } } }
    });
    if (!project) throw new NotFoundException("Project not found.");
    return {
      project: { id: project.id, code: project.code, name: project.name, clientName: project.client?.user.displayName ?? null },
      confirmationPhrase: projectConfirmationPhrase(project),
      impact: await this.countProjectData([project.id])
    };
  }

  async deleteProject(actorId: string, projectId: string, rawBody: unknown) {
    const { confirmation } = parseBody(permanentDeleteSchema, rawBody);
    const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { id: true, code: true, name: true } });
    if (!project) throw new NotFoundException("Project not found.");
    if (normalizeConfirmation(confirmation) !== normalizeConfirmation(projectConfirmationPhrase(project))) {
      throw new BadRequestException({ code: "DELETE_CONFIRMATION_MISMATCH", message: "Type the project code exactly to confirm permanent deletion." });
    }

    const impact = await this.countProjectData([project.id]);
    const storagePaths = await this.projectStoragePaths([project.id]);
    const cleanup = await this.withQuarantine([project.id], storagePaths, async () => {
      await this.prisma.$transaction(
        async (tx) => {
          await tx.auditLog.deleteMany({ where: { projectId: project.id } });
          await tx.notification.deleteMany({ where: { projectId: project.id } });
          await tx.project.delete({ where: { id: project.id } });
          await tx.auditLog.create({
            data: {
              actorId,
              action: "project.deleted_permanently",
              metadata: { projectCode: project.code, projectName: project.name, ...impactSummary(impact) }
            }
          });
        },
        { timeout: 60_000, maxWait: 10_000 }
      );
    });
    this.realtime.evictProjectRoom(project.id);
    return { deleted: { projectId: project.id, code: project.code }, impact, storage: cleanup };
  }

  async clientImpact(clientId: string) {
    const client = await this.loadClient(clientId);
    const projectIds = client.projects.map((project) => project.id);
    const [impact, sessions, userNotifications, userReadStates, blockers] = await Promise.all([
      this.countProjectData(projectIds),
      this.prisma.authSession.count({ where: { OR: [{ userId: client.userId }, { impersonatedUserId: client.userId }] } }),
      this.prisma.notification.count({ where: { userId: client.userId, NOT: { projectId: { in: projectIds } } } }),
      this.prisma.projectChatReadState.count({ where: { userId: client.userId, projectId: { notIn: projectIds } } }),
      this.authoredElsewhere(client.userId, projectIds)
    ]);
    const clientImpact: ClientDeletionImpact = {
      ...impact,
      notifications: impact.notifications + userNotifications,
      chatReadStates: impact.chatReadStates + userReadStates,
      userAccounts: 1,
      sessions
    };
    return {
      client: { id: client.id, displayName: client.user.displayName, email: client.user.email },
      projects: client.projects.map((project) => ({ id: project.id, code: project.code, name: project.name })),
      confirmationPhrase: CLIENT_CONFIRMATION,
      impact: clientImpact,
      blockers
    };
  }

  async deleteClient(actorId: string, clientId: string, rawBody: unknown) {
    const body = (rawBody ?? {}) as { acknowledgedProjectCount?: unknown };
    const { confirmation } = parseBody(permanentDeleteSchema, { confirmation: (rawBody as { confirmation?: unknown } | null)?.confirmation });
    if (normalizeConfirmation(confirmation) !== normalizeConfirmation(CLIENT_CONFIRMATION)) {
      throw new BadRequestException({ code: "DELETE_CONFIRMATION_MISMATCH", message: `Type ${CLIENT_CONFIRMATION} to confirm permanent deletion.` });
    }

    const preflight = await this.clientImpact(clientId);
    // The Admin confirmed a specific number of owned projects; if it changed since the
    // impact was shown, stop instead of deleting more than they saw.
    if (typeof body.acknowledgedProjectCount !== "number" || body.acknowledgedProjectCount !== preflight.projects.length) {
      throw new ConflictException({ code: "DELETE_IMPACT_CHANGED", message: "The client's projects changed since the impact was shown. Review it again." });
    }
    if (preflight.blockers.total > 0) {
      throw new ConflictException({
        code: "DELETE_BLOCKED_AUTHORED_RECORDS",
        message: "This client authored records inside projects owned by another client. Those records belong to that project's history."
      });
    }

    const client = await this.loadClient(clientId);
    const projectIds = client.projects.map((project) => project.id);
    const storagePaths = await this.projectStoragePaths(projectIds);
    const cleanup = await this.withQuarantine(projectIds, storagePaths, async () => {
      await this.prisma.$transaction(
        async (tx) => {
          if (projectIds.length > 0) {
            await tx.auditLog.deleteMany({ where: { projectId: { in: projectIds } } });
            await tx.notification.deleteMany({ where: { projectId: { in: projectIds } } });
            await tx.project.deleteMany({ where: { id: { in: projectIds } } });
          }
          await tx.authSession.deleteMany({ where: { OR: [{ userId: client.userId }, { impersonatedUserId: client.userId }] } });
          await tx.notification.deleteMany({ where: { userId: client.userId } });
          await tx.projectChatReadState.deleteMany({ where: { userId: client.userId } });
          await tx.clientProfile.delete({ where: { id: client.id } });
          await tx.user.delete({ where: { id: client.userId } });
          await tx.auditLog.create({
            data: {
              actorId,
              action: "client.deleted_permanently",
              metadata: { clientId: client.id, userId: client.userId, projectCodes: client.projects.map((project) => project.code ?? project.id), ...impactSummary(preflight.impact) }
            }
          });
        },
        { timeout: 60_000, maxWait: 10_000 }
      );
    });
    this.realtime.disconnectUser(client.userId);
    for (const projectId of projectIds) this.realtime.evictProjectRoom(projectId);
    return { deleted: { clientId: client.id, userId: client.userId, projects: projectIds.length }, impact: preflight.impact, storage: cleanup };
  }

  private async withQuarantine(projectIds: string[], storagePaths: string[], deleteRows: () => Promise<void>): Promise<StorageCleanupResult> {
    const deletionId = randomUUID();
    const quarantine: StorageQuarantine = await this.storage.quarantine(deletionId, projectIds, storagePaths);
    try {
      await deleteRows();
    } catch (error) {
      const unrestored = await this.storage.restoreQuarantine(quarantine);
      if (unrestored.length > 0) {
        this.logger.error(`Deletion ${deletionId} rolled back but ${unrestored.length} storage path(s) could not be restored: ${unrestored.join(", ")}`);
      }
      throw error;
    }
    const purge = await this.storage.purgeQuarantine(quarantine, projectIds);
    if (purge.failed.length > 0) {
      this.logger.error(`Deletion ${deletionId} committed; storage cleanup incomplete for: ${purge.failed.join(", ")}`);
    }
    return { status: purge.failed.length > 0 ? "partial" : "complete", filesRemoved: storagePaths.length, failedPaths: purge.failed };
  }

  private async loadClient(clientId: string) {
    const client = await this.prisma.clientProfile.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        userId: true,
        user: { select: { displayName: true, email: true, role: true } },
        projects: { select: { id: true, code: true, name: true }, orderBy: { createdAt: "asc" } }
      }
    });
    if (!client || client.user.role !== "CLIENT") throw new NotFoundException("Client not found.");
    return client;
  }

  /** Every protected file row owned by these projects. */
  private async projectStoragePaths(projectIds: string[]): Promise<string[]> {
    if (projectIds.length === 0) return [];
    const where = { projectId: { in: projectIds } };
    const [media, revisions, versions, attachments, voice] = await Promise.all([
      this.prisma.siteMedia.findMany({ where, select: { storagePath: true } }),
      this.prisma.designRevision.findMany({ where, select: { storagePath: true } }),
      this.prisma.projectDocumentVersion.findMany({ where, select: { storagePath: true } }),
      this.prisma.financialAttachment.findMany({ where, select: { storagePath: true } }),
      this.prisma.projectMessage.findMany({ where: { ...where, storagePath: { not: null } }, select: { storagePath: true } })
    ]);
    return [...media, ...revisions, ...versions, ...attachments, ...voice]
      .map((row) => row.storagePath)
      .filter((path): path is string => typeof path === "string" && path.length > 0);
  }

  private async countProjectData(projectIds: string[]): Promise<DeletionImpact> {
    const where = { projectId: { in: projectIds } };
    const [
      executionStages,
      executionStageAssignments,
      teamAssignments,
      siteUpdates,
      siteMedia,
      designs,
      designRevisions,
      designEvents,
      documents,
      documentVersions,
      financialProfiles,
      costEstimates,
      costEstimateItems,
      boqItems,
      expenses,
      clientPayments,
      contractorPayments,
      financialAttachments,
      chatMessages,
      chatReadStates,
      notifications,
      activityEntries,
      fileSizes
    ] = await Promise.all([
      this.prisma.executionStage.count({ where }),
      this.prisma.executionStageAssignment.count({ where: { stage: where } }),
      this.prisma.projectAssignment.count({ where }),
      this.prisma.siteUpdate.count({ where }),
      this.prisma.siteMedia.count({ where }),
      this.prisma.designItem.count({ where }),
      this.prisma.designRevision.count({ where }),
      this.prisma.designEvent.count({ where: { design: where } }),
      this.prisma.projectDocument.count({ where }),
      this.prisma.projectDocumentVersion.count({ where }),
      this.prisma.projectFinancialProfile.count({ where }),
      this.prisma.costEstimate.count({ where }),
      this.prisma.costEstimateItem.count({ where: { estimate: where } }),
      this.prisma.bOQItem.count({ where }),
      this.prisma.expense.count({ where }),
      this.prisma.clientPayment.count({ where }),
      this.prisma.contractorPayment.count({ where }),
      this.prisma.financialAttachment.count({ where }),
      this.prisma.projectMessage.count({ where }),
      this.prisma.projectChatReadState.count({ where }),
      this.prisma.notification.count({ where }),
      this.prisma.auditLog.count({ where }),
      Promise.all([
        this.prisma.siteMedia.aggregate({ where, _sum: { fileSize: true }, _count: { _all: true } }),
        this.prisma.designRevision.aggregate({ where, _sum: { fileSize: true }, _count: { _all: true } }),
        this.prisma.projectDocumentVersion.aggregate({ where, _sum: { fileSize: true }, _count: { _all: true } }),
        this.prisma.financialAttachment.aggregate({ where, _sum: { fileSize: true }, _count: { _all: true } }),
        this.prisma.projectMessage.aggregate({ where: { ...where, storagePath: { not: null } }, _sum: { fileSize: true }, _count: { _all: true } })
      ])
    ]);
    return {
      projects: projectIds.length,
      executionStages,
      executionStageAssignments,
      teamAssignments,
      siteUpdates,
      siteMedia,
      designs,
      designRevisions,
      designEvents,
      documents,
      documentVersions,
      financialProfiles,
      costEstimates,
      costEstimateItems,
      boqItems,
      expenses,
      clientPayments,
      contractorPayments,
      financialAttachments,
      chatMessages,
      chatReadStates,
      notifications,
      activityEntries,
      files: fileSizes.reduce((sum, row) => sum + row._count._all, 0),
      fileBytes: fileSizes.reduce((sum, row) => sum + (row._sum.fileSize ?? 0), 0)
    };
  }

  /**
   * Rows the client user authored inside projects that are NOT being deleted (only possible
   * when a project was re-assigned to another client after this one took part). Those rows
   * belong to the other project's history, so deletion is refused rather than rewriting it.
   */
  private async authoredElsewhere(userId: string, deletedProjectIds: string[]) {
    const outside = { projectId: { notIn: deletedProjectIds } };
    const [designEvents, chatMessages, siteUpdates, documents] = await Promise.all([
      this.prisma.designEvent.count({ where: { actorId: userId, design: outside } }),
      this.prisma.projectMessage.count({ where: { authorId: userId, ...outside } }),
      this.prisma.siteUpdate.count({ where: { authorId: userId, ...outside } }),
      this.prisma.projectDocument.count({ where: { createdById: userId, ...outside } })
    ]);
    return { designEvents, chatMessages, siteUpdates, documents, total: designEvents + chatMessages + siteUpdates + documents };
  }
}

function projectConfirmationPhrase(project: { code: string | null; name: string }) {
  return project.code ?? project.name;
}

function normalizeConfirmation(value: string) {
  return value.normalize("NFKC").trim().toUpperCase();
}

function impactSummary(impact: DeletionImpact) {
  return {
    projects: impact.projects,
    siteUpdates: impact.siteUpdates,
    designs: impact.designs,
    documents: impact.documents,
    chatMessages: impact.chatMessages,
    files: impact.files
  };
}
