import type { Request } from "express";
import type { UserRole } from "@elhabak/database";

export type RequestUser = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
};

export type AuthenticatedRequest = Request & {
  user?: RequestUser;
  sessionId?: string;
};
