import type { Prisma } from "@elhabak/database";

const actorSelect = { id: true, displayName: true, role: true } satisfies Prisma.UserSelect;

export const documentInclude = {
  versions: { include: { uploadedBy: { select: actorSelect } }, orderBy: { versionNumber: "desc" } },
  createdBy: { select: actorSelect }
} satisfies Prisma.ProjectDocumentInclude;

export type DocumentWithRelations = Prisma.ProjectDocumentGetPayload<{ include: typeof documentInclude }>;

export function versionCode(versionNumber: number) {
  return `V${String(versionNumber).padStart(2, "0")}`;
}

export function toDocumentResponse(document: DocumentWithRelations, viewerRole: string) {
  const isClient = viewerRole === "CLIENT";
  return {
    id: document.id,
    projectId: document.projectId,
    reference: document.reference,
    title: document.title,
    description: document.description,
    category: document.category,
    status: document.status,
    isClientVisible: document.isClientVisible,
    currentVersionNumber: document.currentVersionNumber,
    currentVersion: document.versions[0] ? toVersionResponse(document.versions[0], isClient) : null,
    versions: document.versions.map((version) => toVersionResponse(version, isClient)),
    createdBy: {
      id: document.createdBy.id,
      displayName: document.createdBy.displayName,
      role: document.createdBy.role
    },
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString()
  };
}

function toVersionResponse(version: DocumentWithRelations["versions"][number], isClient: boolean) {
  return {
    id: version.id,
    versionNumber: version.versionNumber,
    versionCode: versionCode(version.versionNumber),
    originalFilename: version.originalFilename,
    mimeType: version.mimeType,
    extension: version.extension,
    fileSize: version.fileSize,
    note: version.note,
    // The checksum is an internal integrity/traceability aid, not shown to Client users.
    ...(isClient ? {} : { checksumSha256: version.checksumSha256 }),
    uploadedBy: {
      id: version.uploadedBy.id,
      displayName: version.uploadedBy.displayName,
      role: version.uploadedBy.role
    },
    createdAt: version.createdAt.toISOString()
  };
}
