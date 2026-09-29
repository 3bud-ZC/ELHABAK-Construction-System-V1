-- Execution work packages + multi-engineer project teams + staff specialty.
-- Additive only: new enum/tables and nullable/defaulted columns. Existing rows stay valid,
-- and the previous release keeps working against this schema (it ignores the new objects).

-- CreateEnum
CREATE TYPE "ExecutionStageStatus" AS ENUM ('PLANNED', 'READY', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED');

-- AlterTable
ALTER TABLE "ProjectAssignment" ADD COLUMN     "isLead" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "responsibility" TEXT;

-- AlterTable
ALTER TABLE "SiteUpdate" ADD COLUMN     "executionStageId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "specialty" TEXT;

-- CreateTable
CREATE TABLE "ExecutionStage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ExecutionStageStatus" NOT NULL DEFAULT 'PLANNED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "plannedStartDate" TIMESTAMP(3),
    "plannedEndDate" TIMESTAMP(3),
    "actualStartDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExecutionStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionStageAssignment" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutionStageAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExecutionStage_projectId_sortOrder_idx" ON "ExecutionStage"("projectId", "sortOrder");

-- CreateIndex
CREATE INDEX "ExecutionStage_projectId_status_idx" ON "ExecutionStage"("projectId", "status");

-- CreateIndex
CREATE INDEX "ExecutionStageAssignment_userId_idx" ON "ExecutionStageAssignment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutionStageAssignment_stageId_userId_key" ON "ExecutionStageAssignment"("stageId", "userId");

-- CreateIndex
CREATE INDEX "SiteUpdate_executionStageId_idx" ON "SiteUpdate"("executionStageId");

-- AddForeignKey
ALTER TABLE "SiteUpdate" ADD CONSTRAINT "SiteUpdate_executionStageId_fkey" FOREIGN KEY ("executionStageId") REFERENCES "ExecutionStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionStage" ADD CONSTRAINT "ExecutionStage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionStage" ADD CONSTRAINT "ExecutionStage_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionStageAssignment" ADD CONSTRAINT "ExecutionStageAssignment_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "ExecutionStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionStageAssignment" ADD CONSTRAINT "ExecutionStageAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Stage progress is an integer percentage.
ALTER TABLE "ExecutionStage" ADD CONSTRAINT "ExecutionStage_progress_range" CHECK ("progress" >= 0 AND "progress" <= 100);

-- Backfill: every existing lead engineer (Project.engineerId) becomes an explicit team
-- member flagged isLead. Project.engineerId is kept as the lead pointer, so no existing
-- engineer relationship is lost and older code paths keep reading it.
INSERT INTO "ProjectAssignment" ("id", "projectId", "userId", "isLead", "createdAt")
SELECT 'lead_' || md5(p."id" || ':' || p."engineerId"), p."id", p."engineerId", true, p."createdAt"
FROM "Project" p
WHERE p."engineerId" IS NOT NULL
ON CONFLICT ("projectId", "userId") DO UPDATE SET "isLead" = true;
