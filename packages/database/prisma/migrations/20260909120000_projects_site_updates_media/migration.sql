ALTER TABLE "Project" ADD COLUMN "engineerId" TEXT;

CREATE TYPE "SiteMediaType" AS ENUM ('IMAGE', 'VIDEO');

CREATE TABLE "SiteUpdate" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteUpdate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SiteMedia" (
    "id" TEXT NOT NULL,
    "siteUpdateId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "mediaType" "SiteMediaType" NOT NULL,
    "storagePath" TEXT NOT NULL,
    "storedFilename" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteMedia_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Project_engineerId_idx" ON "Project"("engineerId");
CREATE INDEX "SiteUpdate_projectId_createdAt_idx" ON "SiteUpdate"("projectId", "createdAt");
CREATE INDEX "SiteUpdate_authorId_idx" ON "SiteUpdate"("authorId");
CREATE INDEX "SiteMedia_siteUpdateId_idx" ON "SiteMedia"("siteUpdateId");
CREATE INDEX "SiteMedia_projectId_idx" ON "SiteMedia"("projectId");
CREATE INDEX "SiteMedia_uploaderId_idx" ON "SiteMedia"("uploaderId");

ALTER TABLE "Project" ADD CONSTRAINT "Project_engineerId_fkey" FOREIGN KEY ("engineerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SiteUpdate" ADD CONSTRAINT "SiteUpdate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SiteUpdate" ADD CONSTRAINT "SiteUpdate_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SiteMedia" ADD CONSTRAINT "SiteMedia_siteUpdateId_fkey" FOREIGN KEY ("siteUpdateId") REFERENCES "SiteUpdate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SiteMedia" ADD CONSTRAINT "SiteMedia_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SiteMedia" ADD CONSTRAINT "SiteMedia_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
