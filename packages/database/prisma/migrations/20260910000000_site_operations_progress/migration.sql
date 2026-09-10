-- CreateEnum
CREATE TYPE "SiteUpdateType" AS ENUM ('PROGRESS', 'INSPECTION', 'ISSUE', 'MATERIAL', 'GENERAL');

-- AlterTable
ALTER TABLE "SiteUpdate" ADD COLUMN "type" "SiteUpdateType" NOT NULL DEFAULT 'GENERAL';
ALTER TABLE "SiteUpdate" ADD COLUMN "phase" "ProjectPhase";
ALTER TABLE "SiteUpdate" ADD COLUMN "progressImpact" INTEGER;
ALTER TABLE "SiteUpdate" ADD COLUMN "isClientVisible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SiteUpdate" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "SiteUpdate_projectId_type_createdAt_idx" ON "SiteUpdate"("projectId", "type", "createdAt");
