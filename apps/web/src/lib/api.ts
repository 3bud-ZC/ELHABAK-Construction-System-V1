"use client";

export type UserRole = "ADMIN" | "ENGINEER" | "ACCOUNTANT" | "WORKER" | "CLIENT";

export type UserRecord = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ClientRecord = {
  id: string;
  user: UserRecord;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    }
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as { message?: unknown } | undefined;
    const message = Array.isArray(body?.message)
      ? "Validation failed."
      : typeof body?.message === "string"
        ? body.message
        : "Request failed.";
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}

export function roleLabel(role: UserRole, locale: "ar" | "en") {
  const labels: Record<UserRole, { ar: string; en: string }> = {
    ADMIN: { ar: "مدير", en: "Admin" },
    ENGINEER: { ar: "مهندس", en: "Engineer" },
    ACCOUNTANT: { ar: "محاسب", en: "Accountant" },
    WORKER: { ar: "عامل / مقاول", en: "Worker / Contractor" },
    CLIENT: { ar: "عميل", en: "Client" }
  };

  return labels[role][locale];
}
