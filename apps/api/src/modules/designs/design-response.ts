import type { Prisma } from "@elhabak/database";

export const designInclude = {
  revisions: { include: { uploader: true }, orderBy: { revisionNumber: "desc" } },
  events: { include: { actor: true }, orderBy: { createdAt: "desc" } }
} satisfies Prisma.DesignItemInclude;

export type DesignWithRelations = Prisma.DesignItemGetPayload<{ include: typeof designInclude }>;

export function revisionCode(revisionNumber: number) {
  return `REV ${String(revisionNumber).padStart(2, "0")}`;
}

export function toDesignResponse(design: DesignWithRelations) {
  return {
    id: design.id,
    projectId: design.projectId,
    title: design.title,
    description: design.description,
    discipline: design.discipline,
    status: design.status,
    currentRevisionNumber: design.currentRevisionNumber,
    currentRevision: design.revisions[0] ? toRevisionResponse(design.revisions[0]) : null,
    revisions: design.revisions.map(toRevisionResponse),
    events: design.events.map((event) => ({
      id: event.id,
      revisionId: event.revisionId,
      action: event.action,
      comment: event.comment,
      actor: {
        id: event.actor.id,
        displayName: event.actor.displayName,
        role: event.actor.role
      },
      createdAt: event.createdAt.toISOString()
    })),
    createdAt: design.createdAt.toISOString(),
    updatedAt: design.updatedAt.toISOString()
  };
}

function toRevisionResponse(revision: DesignWithRelations["revisions"][number]) {
  return {
    id: revision.id,
    revisionNumber: revision.revisionNumber,
    revisionCode: revisionCode(revision.revisionNumber),
    status: revision.status,
    notes: revision.notes,
    originalFilename: revision.originalFilename,
    mimeType: revision.mimeType,
    fileSize: revision.fileSize,
    uploader: {
      id: revision.uploader.id,
      displayName: revision.uploader.displayName,
      role: revision.uploader.role
    },
    createdAt: revision.createdAt.toISOString(),
    updatedAt: revision.updatedAt.toISOString()
  };
}
