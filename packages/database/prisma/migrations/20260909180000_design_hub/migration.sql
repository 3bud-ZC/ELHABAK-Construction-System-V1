-- CreateEnum
CREATE TYPE "DesignDiscipline" AS ENUM ('ARCHITECTURAL', 'STRUCTURAL', 'INTERIOR', 'ELECTRICAL', 'PLUMBING', 'FURNITURE', 'RENDERS', 'OTHER');

-- CreateEnum
CREATE TYPE "DesignStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DesignEventType" AS ENUM ('DESIGN_CREATED', 'DESIGN_UPDATED', 'REVISION_UPLOADED', 'SUBMITTED_FOR_REVIEW', 'CLIENT_APPROVED', 'CLIENT_REJECTED', 'COMMENT_ADDED');

-- CreateTable
CREATE TABLE "DesignItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "discipline" "DesignDiscipline" NOT NULL,
    "status" "DesignStatus" NOT NULL DEFAULT 'DRAFT',
    "currentRevisionNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DesignItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignRevision" (
    "id" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "status" "DesignStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "storagePath" TEXT NOT NULL,
    "storedFilename" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DesignRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignEvent" (
    "id" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "revisionId" TEXT,
    "actorId" TEXT NOT NULL,
    "action" "DesignEventType" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DesignEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DesignItem_projectId_updatedAt_idx" ON "DesignItem"("projectId", "updatedAt");
CREATE INDEX "DesignItem_projectId_status_discipline_idx" ON "DesignItem"("projectId", "status", "discipline");
CREATE UNIQUE INDEX "DesignRevision_designId_revisionNumber_key" ON "DesignRevision"("designId", "revisionNumber");
CREATE INDEX "DesignRevision_projectId_idx" ON "DesignRevision"("projectId");
CREATE INDEX "DesignRevision_uploaderId_idx" ON "DesignRevision"("uploaderId");
CREATE INDEX "DesignEvent_designId_createdAt_idx" ON "DesignEvent"("designId", "createdAt");
CREATE INDEX "DesignEvent_revisionId_createdAt_idx" ON "DesignEvent"("revisionId", "createdAt");
CREATE INDEX "DesignEvent_actorId_idx" ON "DesignEvent"("actorId");

-- AddForeignKey
ALTER TABLE "DesignItem" ADD CONSTRAINT "DesignItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DesignRevision" ADD CONSTRAINT "DesignRevision_designId_fkey" FOREIGN KEY ("designId") REFERENCES "DesignItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DesignRevision" ADD CONSTRAINT "DesignRevision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DesignRevision" ADD CONSTRAINT "DesignRevision_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DesignEvent" ADD CONSTRAINT "DesignEvent_designId_fkey" FOREIGN KEY ("designId") REFERENCES "DesignItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DesignEvent" ADD CONSTRAINT "DesignEvent_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "DesignRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DesignEvent" ADD CONSTRAINT "DesignEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
