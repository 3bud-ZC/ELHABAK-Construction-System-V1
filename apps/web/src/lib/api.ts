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
export type DesignDiscipline =
  | "ARCHITECTURAL"
  | "STRUCTURAL"
  | "INTERIOR"
  | "ELECTRICAL"
  | "PLUMBING"
  | "FURNITURE"
  | "RENDERS"
  | "OTHER";
export type DesignStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "REJECTED";
export type DesignEventType =
  | "DESIGN_CREATED"
  | "DESIGN_UPDATED"
  | "REVISION_UPLOADED"
  | "SUBMITTED_FOR_REVIEW"
  | "CLIENT_APPROVED"
  | "CLIENT_REJECTED"
  | "COMMENT_ADDED";

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

export type SiteUpdateType = "PROGRESS" | "INSPECTION" | "ISSUE" | "MATERIAL" | "GENERAL";

export type SiteUpdateRecord = {
  id: string;
  type: SiteUpdateType;
  phase?: ProjectPhase | null;
  progressImpact?: number | null;
  isClientVisible: boolean;
  note: string | null;
  createdAt: string;
  updatedAt?: string;
  author: { id: string; displayName: string; role: UserRole };
  media: SiteMediaRecord[];
};

export type TimelineEventRecord = {
  id: string;
  kind: "SITE_UPDATE" | "PROGRESS_CHANGE" | "PHASE_CHANGE" | "PROJECT_CREATED";
  type?: SiteUpdateType;
  title: string;
  description?: string | null;
  timestamp: string;
  actor: { id: string; displayName: string; role: string } | null;
  phase?: string | null;
  progress?: number | null;
  isClientVisible?: boolean;
  media?: SiteMediaRecord[];
  metadata?: Record<string, unknown> | null;
};


export type SiteMediaRecord = {

  id: string;
  mediaType: "IMAGE" | "VIDEO";
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  createdAt?: string;
};

export type DesignRevisionRecord = {
  id: string;
  revisionNumber: number;
  revisionCode: string;
  status: DesignStatus;
  notes: string | null;
  originalFilename: string;
  mimeType: "application/pdf" | "image/png" | "image/jpeg";
  fileSize: number;
  uploader: { id: string; displayName: string; role: UserRole };
  createdAt: string;
  updatedAt: string;
};

export type DesignEventRecord = {
  id: string;
  revisionId: string | null;
  action: DesignEventType;
  comment: string | null;
  actor: { id: string; displayName: string; role: UserRole };
  createdAt: string;
};

export type DesignRecord = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  discipline: DesignDiscipline;
  status: DesignStatus;
  currentRevisionNumber: number;
  currentRevision: DesignRevisionRecord;
  revisions: DesignRevisionRecord[];
  events: DesignEventRecord[];
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

export function uploadRequest<T>(path: string, body: FormData, onProgress: (value: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${apiBaseUrl}${path}`);
    request.withCredentials = true;
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener("load", () => {
      const payload = safeJson(request.responseText);
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve(payload as T);
        return;
      }
      const message = typeof payload?.message === "string" ? payload.message : "Request failed.";
      reject(new ApiError(message, request.status));
    });
    request.addEventListener("error", () => reject(new ApiError("Network request failed.", 0)));
    request.send(body);
  });
}

function safeJson(value: string): { message?: unknown } {
  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function mediaUrl(projectId: string, mediaId: string) {
  return `${apiBaseUrl}/projects/${projectId}/media/${mediaId}`;
}

export function designFileUrl(projectId: string, designId: string, revisionId: string, download = false) {
  return `${apiBaseUrl}/projects/${projectId}/designs/${designId}/revisions/${revisionId}/file${download ? "?download=1" : ""}`;
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

export function designStatusLabel(status: DesignStatus, locale: "ar" | "en") {
  const labels: Record<DesignStatus, { ar: string; en: string }> = {
    DRAFT: { ar: "مسودة", en: "Draft" },
    IN_REVIEW: { ar: "قيد المراجعة", en: "In review" },
    APPROVED: { ar: "معتمد", en: "Approved" },
    REJECTED: { ar: "مرفوض", en: "Rejected" }
  };
  return labels[status][locale];
}

export function designStatusTone(status: DesignStatus): BadgeTone {
  return { DRAFT: "neutral", IN_REVIEW: "info", APPROVED: "success", REJECTED: "danger" }[status] as BadgeTone;
}

export function disciplineLabel(discipline: DesignDiscipline, locale: "ar" | "en") {
  const labels: Record<DesignDiscipline, { ar: string; en: string }> = {
    ARCHITECTURAL: { ar: "معماري", en: "Architectural" },
    STRUCTURAL: { ar: "إنشائي", en: "Structural" },
    INTERIOR: { ar: "تصميم داخلي", en: "Interior" },
    ELECTRICAL: { ar: "كهرباء", en: "Electrical" },
    PLUMBING: { ar: "صحي", en: "Plumbing" },
    FURNITURE: { ar: "أثاث", en: "Furniture" },
    RENDERS: { ar: "مناظير", en: "Renders" },
    OTHER: { ar: "أخرى", en: "Other" }
  };
  return labels[discipline][locale];
}

export function designEventLabel(action: DesignEventType, locale: "ar" | "en") {
  const labels: Record<DesignEventType, { ar: string; en: string }> = {
    DESIGN_CREATED: { ar: "تم إنشاء التصميم", en: "Design created" },
    DESIGN_UPDATED: { ar: "تم تحديث بيانات التصميم", en: "Design details updated" },
    REVISION_UPLOADED: { ar: "تم رفع مراجعة جديدة", en: "New revision uploaded" },
    SUBMITTED_FOR_REVIEW: { ar: "تم الإرسال لمراجعة العميل", en: "Submitted for client review" },
    CLIENT_APPROVED: { ar: "اعتمد العميل المراجعة", en: "Client approved revision" },
    CLIENT_REJECTED: { ar: "رفض العميل المراجعة", en: "Client rejected revision" },
    COMMENT_ADDED: { ar: "تمت إضافة تعليق", en: "Comment added" }
  };
  return labels[action][locale];
}

export const DESIGN_DISCIPLINES: DesignDiscipline[] = [
  "ARCHITECTURAL",
  "STRUCTURAL",
  "INTERIOR",
  "ELECTRICAL",
  "PLUMBING",
  "FURNITURE",
  "RENDERS",
  "OTHER"
];

export const DESIGN_STATUSES: DesignStatus[] = ["DRAFT", "IN_REVIEW", "APPROVED", "REJECTED"];

export const SITE_UPDATE_TYPES: SiteUpdateType[] = [
  "PROGRESS",
  "INSPECTION",
  "ISSUE",
  "MATERIAL",
  "GENERAL"
];

export function siteUpdateTypeLabel(type: string, locale: "ar" | "en") {
  const labels: Record<string, { ar: string; en: string }> = {
    PROGRESS: { ar: "تقدم أعمال", en: "Progress" },
    INSPECTION: { ar: "معاينة / فحص", en: "Inspection" },
    ISSUE: { ar: "ملاحظة / مشكلة", en: "Issue / Defect" },
    MATERIAL: { ar: "توريدات ومواد", en: "Materials" },
    GENERAL: { ar: "تحديث عام", en: "General" }
  };
  return labels[type]?.[locale] ?? type;
}

export function siteUpdateTypeTone(type: string): BadgeTone {
  const tones: Record<string, BadgeTone> = {
    PROGRESS: "success",
    INSPECTION: "info",
    ISSUE: "danger",
    MATERIAL: "orange",
    GENERAL: "navy"
  };
  return tones[type] ?? "neutral";
}



export function formatFileSize(bytes: number, locale: "ar" | "en") {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", { maximumFractionDigits: 1 }).format(bytes / 1024)} KB`;
  return `${new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024))} MB`;
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
    "design.created": { ar: "تم إنشاء تصميم جديد", en: "New design created" },
    "design.updated": { ar: "تم تحديث بيانات تصميم", en: "Design details updated" },
    "design.revision_uploaded": { ar: "تم رفع مراجعة تصميم", en: "Design revision uploaded" },
    "design.submitted_for_review": { ar: "تم إرسال تصميم للمراجعة", en: "Design submitted for review" },
    "design.client_approved": { ar: "اعتمد العميل تصميماً", en: "Client approved a design" },
    "design.client_rejected": { ar: "رفض العميل تصميماً", en: "Client rejected a design" },
    "design.comment_added": { ar: "تمت إضافة تعليق على تصميم", en: "Design comment added" },
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
