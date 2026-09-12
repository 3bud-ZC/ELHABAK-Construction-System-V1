-- Preserve existing account state while distinguishing future archive operations.
ALTER TABLE "User" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- Impersonation changes only effective identity inside an existing Admin-owned session.
ALTER TABLE "AuthSession" ADD COLUMN "impersonatedUserId" TEXT;

CREATE INDEX "User_isActive_archivedAt_idx" ON "User"("isActive", "archivedAt");
CREATE INDEX "AuthSession_impersonatedUserId_idx" ON "AuthSession"("impersonatedUserId");

ALTER TABLE "AuthSession"
ADD CONSTRAINT "AuthSession_impersonatedUserId_fkey"
FOREIGN KEY ("impersonatedUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
