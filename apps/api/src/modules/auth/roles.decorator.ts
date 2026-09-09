import { SetMetadata } from "@nestjs/common";
import type { UserRole } from "@elhabak/database";

export const ROLES_KEY = "roles";

export function Roles(...roles: UserRole[]) {
  return SetMetadata(ROLES_KEY, roles);
}
