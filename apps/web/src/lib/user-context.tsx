"use client";

import { createContext, useContext } from "react";
import type { UserRecord } from "./api";

/**
 * Populated once by AppShell after its authoritative `/auth/me` check succeeds (see the
 * comment in middleware.ts). Every page under `/app/*` renders only after AppShell has
 * resolved a non-null user, so pages can read it here instead of re-fetching `/auth/me`.
 */
export const UserContext = createContext<UserRecord | null>(null);

export function useCurrentUser(): UserRecord {
  const user = useContext(UserContext);
  if (!user) {
    throw new Error("useCurrentUser() was called outside of AppShell's UserContext.Provider.");
  }
  return user;
}
