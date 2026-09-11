import type { Prisma } from "@elhabak/database";
import { toRequestUser } from "../auth/auth.service";

const userSummarySelect = { id: true, email: true, displayName: true, role: true, isActive: true } satisfies Prisma.UserSelect;

/**
 * `siteUpdates` is filtered to client-visible rows in the query itself (not after fetch) when the
 * viewer is a CLIENT, so the `take: 20` window is never filled by internal-only rows a client can't see.
 */
export function projectIncludeFor(viewerRole?: string) {
  return {
    client: { include: { user: { select: userSummarySelect } } },
    engineer: { select: userSummarySelect },
    assignments: { include: { user: { select: userSummarySelect } }, orderBy: { createdAt: "asc" } },
    siteUpdates: {
      ...(viewerRole === "CLIENT" ? { where: { isClientVisible: true } } : {}),
      include: { author: { select: { id: true, displayName: true, role: true } }, media: { orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "desc" },
      take: 20
    }
  } satisfies Prisma.ProjectInclude;
}

export type ProjectWithRelations = Prisma.ProjectGetPayload<{ include: ReturnType<typeof projectIncludeFor> }>;

export function toProjectResponse(project: ProjectWithRelations, viewerRole?: string) {
  return {
    id: project.id,
    code: project.code,
    name: project.name,
    category: project.category,
    phase: project.phase,
    status: project.status,
    progress: project.progress,
    location: project.location,
    startDate: project.startDate?.toISOString() ?? null,
    targetDate: project.targetDate?.toISOString() ?? null,
    notes: project.notes,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    client: project.client
      ? {
          id: project.client.id,
          phone: project.client.phone,
          user: toRequestUser(project.client.user)
        }
      : null,
    engineer: project.engineer ? toRequestUser(project.engineer) : null,
    workers: project.assignments.filter((assignment) => assignment.user.role === "WORKER").map((assignment) => toRequestUser(assignment.user)),
    siteUpdates: project.siteUpdates
      .filter((update) => (viewerRole === "CLIENT" ? update.isClientVisible : true))
      .map((update) => ({
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
      }))
  };
}

