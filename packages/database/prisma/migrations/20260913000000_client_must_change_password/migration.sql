-- Accounts provisioned with a temporary password must replace it on first
-- authenticated login before any other application surface is reachable.
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
