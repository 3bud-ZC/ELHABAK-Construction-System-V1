"use client";

export type UserRole = "ADMIN" | "ENGINEER" | "ACCOUNTANT" | "WORKER" | "CLIENT";
export type ProjectCategory = "DESIGN" | "CONSTRUCTION" | "FINISHING" | "GENERAL_CONTRACTING" | "FURNITURE" | "MIXED";
export type ProjectPhase =
  | "SITE_INSPECTION"
  | "DESIGN"
  | "PRELIMINARY_ESTIMATION"
  | "EXECUTION"
  | "INITIAL_HANDOVER"
  | "FINAL_HANDOVER";
export type ProjectStatus = "PLANNED" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";

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

export type ProjectRecord = {
  id: string;
  code: string | null;
  name: string;
  category: ProjectCategory;
  phase: ProjectPhase;
  status: ProjectStatus;
  progress: number;
  location: string | null;
  startDate: string | null;
  targetDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  client: { id: string; phone: string | null; user: UserRecord } | null;
  engineer: UserRecord | null;
  workers: UserRecord[];
  siteUpdates: SiteUpdateRecord[];
};

export type SiteUpdateRecord = {
  id: string;
  note: string | null;
  createdAt: string;
  author: { id: string; displayName: string; role: UserRole };
  media: SiteMediaRecord[];
};

export type SiteMediaRecord = {
  id: string;
  mediaType: "IMAGE" | "VIDEO";
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  createdAt?: string;
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
  const isFormData = init?.body instanceof FormData;
  const requestInit: RequestInit = {
    ...init,
    credentials: "include"
  };

  if (!isFormData) {
    requestInit.headers = {
      "Content-Type": "application/json",
      ...init?.headers
    };
  } else if (init?.headers) {
    requestInit.headers = init.headers;
  }

  const response = await fetch(`${apiBaseUrl}${path}`, requestInit);

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

export function mediaUrl(projectId: string, mediaId: string) {
  return `${apiBaseUrl}/projects/${projectId}/media/${mediaId}`;
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

export function categoryLabel(category: ProjectCategory, locale: "ar" | "en") {
  const labels: Record<ProjectCategory, { ar: string; en: string }> = {
    DESIGN: { ar: "تصميم", en: "Design" },
    CONSTRUCTION: { ar: "إنشاء", en: "Construction" },
    FINISHING: { ar: "تشطيب", en: "Finishing" },
    GENERAL_CONTRACTING: { ar: "مقاولات عامة", en: "General Contracting" },
    FURNITURE: { ar: "أثاث", en: "Furniture" },
    MIXED: { ar: "مختلط", en: "Mixed" }
  };
  return labels[category][locale];
}

export function phaseLabel(phase: ProjectPhase, locale: "ar" | "en") {
  const labels: Record<ProjectPhase, { ar: string; en: string }> = {
    SITE_INSPECTION: { ar: "المعاينة", en: "Site Inspection" },
    DESIGN: { ar: "التصميم", en: "Design" },
    PRELIMINARY_ESTIMATION: { ar: "المقايسة التقريبية", en: "Preliminary Estimation" },
    EXECUTION: { ar: "التنفيذ", en: "Execution" },
    INITIAL_HANDOVER: { ar: "التسليم الابتدائي", en: "Initial Handover" },
    FINAL_HANDOVER: { ar: "التسليم النهائي", en: "Final Handover" }
  };
  return labels[phase][locale];
}

export function statusLabel(status: ProjectStatus, locale: "ar" | "en") {
  const labels: Record<ProjectStatus, { ar: string; en: string }> = {
    PLANNED: { ar: "مخطط", en: "Planned" },
    ACTIVE: { ar: "نشط", en: "Active" },
    ON_HOLD: { ar: "متوقف", en: "On hold" },
    COMPLETED: { ar: "مكتمل", en: "Completed" },
    CANCELLED: { ar: "ملغي", en: "Cancelled" }
  };
  return labels[status][locale];
}

export type BadgeTone = "neutral" | "navy" | "orange" | "success" | "info" | "danger";

export function statusTone(status: ProjectStatus): BadgeTone {
  const tones: Record<ProjectStatus, BadgeTone> = {
    PLANNED: "info",
    ACTIVE: "success",
    ON_HOLD: "orange",
    COMPLETED: "navy",
    CANCELLED: "danger"
  };
  return tones[status];
}

export function accountStatusTone(isActive: boolean): BadgeTone {
  return isActive ? "success" : "neutral";
}

export const LIFECYCLE_PHASES: ProjectPhase[] = [
  "SITE_INSPECTION",
  "DESIGN",
  "PRELIMINARY_ESTIMATION",
  "EXECUTION",
  "INITIAL_HANDOVER",
  "FINAL_HANDOVER"
];

export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function actionLabel(action: string, locale: "ar" | "en"): string {
  const labels: Record<string, { ar: string; en: string }> = {
    "project.created": { ar: "تم إنشاء مشروع جديد", en: "New project created" },
    "project.edited": { ar: "تم تعديل بيانات المشروع", en: "Project details updated" },
    "project.phase_changed": { ar: "تم تحديث مرحلة المشروع", en: "Project phase updated" },
    "project.progress_changed": { ar: "تم تحديث نسبة الإنجاز", en: "Project progress updated" },
    "project.engineer_assigned": { ar: "تم تعيين مهندس مسؤول", en: "Engineer assigned" },
    "project.worker_assigned": { ar: "تم تعيين عامل/مقاول", en: "Worker assigned" },
    "project.worker_removed": { ar: "تمت إزالة عامل/مقاول", en: "Worker removed" },
    "site_update.submitted": { ar: "تحديث موقع جديد", en: "New site update" },
    "client.created": { ar: "تم إنشاء حساب عميل", en: "Client account created" },
    "client.edited": { ar: "تم تعديل بيانات العميل", en: "Client details updated" },
    "user.created": { ar: "تم إنشاء مستخدم جديد", en: "New user created" },
    "user.updated": { ar: "تم تعديل بيانات المستخدم", en: "User details updated" },
    "user.role_changed": { ar: "تم تغيير دور المستخدم", en: "User role changed" },
    "user.activated": { ar: "تم تفعيل الحساب", en: "Account activated" },
    "user.deactivated": { ar: "تم إيقاف الحساب", en: "Account deactivated" }
  };
  return labels[action]?.[locale] ?? action;
}
