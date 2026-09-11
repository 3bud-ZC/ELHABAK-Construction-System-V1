-- Performance pass: Project.status and Project.updatedAt are filtered/sorted on every
-- project list query (admin list, dashboard, visible list) and were not covered by an
-- index (the existing composite index is [phase, status], whose leading column is "phase").
CREATE INDEX "Project_status_idx" ON "Project"("status");

CREATE INDEX "Project_updatedAt_idx" ON "Project"("updatedAt");
