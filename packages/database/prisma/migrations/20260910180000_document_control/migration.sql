-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('CONTRACT', 'PERMIT', 'REPORT', 'CORRESPONDENCE', 'HANDOVER', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentRecordStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "ProjectDocument" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "DocumentCategory" NOT NULL,
    "status" "DocumentRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "isClientVisible" BOOLEAN NOT NULL DEFAULT false,
    "currentVersionNumber" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "storedFilename" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "note" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectDocument_projectId_status_idx" ON "ProjectDocument"("projectId", "status");
CREATE INDEX "ProjectDocument_projectId_category_idx" ON "ProjectDocument"("projectId", "category");
CREATE INDEX "ProjectDocument_projectId_isClientVisible_idx" ON "ProjectDocument"("projectId", "isClientVisible");
CREATE UNIQUE INDEX "ProjectDocumentVersion_documentId_versionNumber_key" ON "ProjectDocumentVersion"("documentId", "versionNumber");
CREATE INDEX "ProjectDocumentVersion_projectId_idx" ON "ProjectDocumentVersion"("projectId");
CREATE INDEX "ProjectDocumentVersion_uploadedById_idx" ON "ProjectDocumentVersion"("uploadedById");

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectDocumentVersion" ADD CONSTRAINT "ProjectDocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ProjectDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectDocumentVersion" ADD CONSTRAINT "ProjectDocumentVersion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectDocumentVersion" ADD CONSTRAINT "ProjectDocumentVersion_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
