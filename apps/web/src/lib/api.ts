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
  status?: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  archivedAt?: string | null;
  impersonation?: {
    actorId: string;
    actorDisplayName: string;
  };
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

export type BoqUnit = "M" | "M2" | "M3" | "ITEM" | "LOT";
export type ExpenseCategory = "MATERIAL" | "LABOR" | "TRANSPORT" | "EQUIPMENT" | "SUBCONTRACTOR" | "OTHER";
export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "CHECK" | "OTHER";
export type FinancialRecordStatus = "ACTIVE" | "VOID";

export type FinanceProjectContext = {
  id: string;
  code: string | null;
  name: string;
  category: ProjectCategory;
  phase: ProjectPhase;
  status: ProjectStatus;
  progress: number;
  location: string | null;
  client: { id: string; phone: string | null; user: UserRecord } | null;
  engineer: UserRecord | null;
};

export type FinanceProjectListItem = {
  id: string;
  code: string | null;
  name: string;
  category: ProjectCategory;
  phase: ProjectPhase;
  status: ProjectStatus;
  progress: number;
  client: { id: string; user: UserRecord } | null;
};

export type FinanceSummary = {
  currency: string;
  contractValue: string | null;
  boqTotal?: string;
  estimateTotal?: string;
  clientPaymentsTotal?: string;
  paidAmount?: string;
  outstandingBalance: string | null;
  expensesTotal?: string;
  contractorPaymentsTotal?: string;
  committedCostTotal?: string;
};

export type FinancialAttachmentRecord = {
  id: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  uploadedBy?: UserRecord;
  createdAt: string;
};

export type BoqItemRecord = {
  id: string;
  code: string;
  section: string | null;
  description: string;
  unit: BoqUnit;
  quantity: string;
  unitRate: string;
  lineTotal: string;
  note: string | null;
  sortOrder: number;
  createdBy: UserRecord;
  createdAt: string;
  updatedAt: string;
};

export type BoqListResponse = {
  items: BoqItemRecord[];
  overallTotal: string;
  sectionTotals: Array<{ section: string | null; total: string }>;
};

export type CostEstimateItemRecord = {
  id: string;
  description: string;
  unit: BoqUnit;
  quantity: string;
  unitRate: string;
  lineTotal: string;
  note: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CostEstimateRecord = {
  id: string;
  title: string;
  version: number;
  isCurrent: boolean;
  description: string | null;
  items: CostEstimateItemRecord[];
  total: string;
  createdBy: UserRecord;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseRecord = {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: string;
  currency: string;
  expenseDate: string;
  vendor: string | null;
  reference: string | null;
  note: string | null;
  status: FinancialRecordStatus;
  voidReason: string | null;
  attachments: FinancialAttachmentRecord[];
  createdBy: UserRecord;
  createdAt: string;
  updatedAt: string;
};

export type ClientPaymentRecord = {
  id: string;
  amount: string;
  currency: string;
  paymentDate: string;
  method: PaymentMethod;
  reference: string | null;
  description: string | null;
  status: FinancialRecordStatus;
  voidReason?: string | null;
  attachments: FinancialAttachmentRecord[];
  createdBy?: UserRecord;
  createdAt?: string;
  updatedAt?: string;
};

export type ContractorPaymentRecord = {
  id: string;
  payee: string;
  amount: string;
  currency: string;
  paymentDate: string;
  method: PaymentMethod;
  category: ExpenseCategory | null;
  reference: string | null;
  description: string | null;
  status: FinancialRecordStatus;
  voidReason: string | null;
  attachments: FinancialAttachmentRecord[];
  createdBy: UserRecord;
  createdAt: string;
  updatedAt: string;
};

export type FinanceHistoryEvent = {
  id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  actor: { id: string; displayName: string; role: string } | null;
  createdAt: string;
};

export function financeAttachmentUrl(
  projectId: string,
  kind: "expenses" | "client-payments" | "contractor-payments",
  recordId: string,
  attachmentId: string
) {
  return `${apiBaseUrl}/projects/${projectId}/finance/${kind}/${recordId}/attachments/${attachmentId}/file`;
}

export const BOQ_UNITS: BoqUnit[] = ["M", "M2", "M3", "ITEM", "LOT"];
export const EXPENSE_CATEGORIES: ExpenseCategory[] = ["MATERIAL", "LABOR", "TRANSPORT", "EQUIPMENT", "SUBCONTRACTOR", "OTHER"];
export const PAYMENT_METHODS: PaymentMethod[] = ["CASH", "BANK_TRANSFER", "CHECK", "OTHER"];

export function boqUnitLabel(unit: BoqUnit, locale: "ar" | "en") {
  const labels: Record<BoqUnit, { ar: string; en: string }> = {
    M: { ar: "م", en: "m" },
    M2: { ar: "م²", en: "m²" },
    M3: { ar: "م³", en: "m³" },
    ITEM: { ar: "قطعة", en: "item" },
    LOT: { ar: "دفعة", en: "lot" }
  };
  return labels[unit][locale];
}

export function expenseCategoryLabel(category: ExpenseCategory, locale: "ar" | "en") {
  const labels: Record<ExpenseCategory, { ar: string; en: string }> = {
    MATERIAL: { ar: "مواد", en: "Material" },
    LABOR: { ar: "عمالة", en: "Labor" },
    TRANSPORT: { ar: "نقل", en: "Transport" },
    EQUIPMENT: { ar: "معدات", en: "Equipment" },
    SUBCONTRACTOR: { ar: "مقاول فرعي", en: "Subcontractor" },
    OTHER: { ar: "أخرى", en: "Other" }
  };
  return labels[category][locale];
}

export function paymentMethodLabel(method: PaymentMethod, locale: "ar" | "en") {
  const labels: Record<PaymentMethod, { ar: string; en: string }> = {
    CASH: { ar: "نقدي", en: "Cash" },
    BANK_TRANSFER: { ar: "تحويل بنكي", en: "Bank transfer" },
    CHECK: { ar: "شيك", en: "Check" },
    OTHER: { ar: "أخرى", en: "Other" }
  };
  return labels[method][locale];
}

export function financialStatusLabel(status: FinancialRecordStatus, locale: "ar" | "en") {
  return status === "VOID" ? (locale === "ar" ? "ملغي" : "Void") : locale === "ar" ? "فعّال" : "Active";
}

export function financialStatusTone(status: FinancialRecordStatus): BadgeTone {
  return status === "VOID" ? "danger" : "success";
}

export function formatMoney(decimalAmount: string, currency: string, locale: "ar" | "en") {
  const isNegative = decimalAmount.trim().startsWith("-");
  const numeric = Number(decimalAmount);
  // Always render in Western digits: BOQ quantities, codes, and progress elsewhere in the
  // app never switch to Eastern Arabic-Indic numerals, and financial figures must stay
  // scannable and consistent with those regardless of UI language.
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(numeric));
  const sign = isNegative ? "-" : "";
  return locale === "ar" ? `${sign}${formatted} ${currency}` : `${currency} ${sign}${formatted}`;
}

export function financeActionLabel(action: string, locale: "ar" | "en"): string {
  const labels: Record<string, { ar: string; en: string }> = {
    "finance.contract_value_set": { ar: "تحديد/تعديل القيمة التعاقدية", en: "Contract value set" },
    "finance.estimate_created": { ar: "إنشاء مقايسة تقريبية", en: "Estimate created" },
    "finance.estimate_updated": { ar: "تحديث بيانات المقايسة", en: "Estimate updated" },
    "finance.estimate_versioned": { ar: "إصدار نسخة جديدة من المقايسة", en: "New estimate version started" },
    "finance.estimate_item_added": { ar: "إضافة بند للمقايسة", en: "Estimate item added" },
    "finance.estimate_item_updated": { ar: "تعديل بند في المقايسة", en: "Estimate item updated" },
    "finance.estimate_item_removed": { ar: "حذف بند من المقايسة", en: "Estimate item removed" },
    "finance.boq_item_created": { ar: "إضافة بند لجدول الكميات", en: "BOQ item created" },
    "finance.boq_item_updated": { ar: "تعديل بند في جدول الكميات", en: "BOQ item updated" },
    "finance.boq_item_deleted": { ar: "حذف بند من جدول الكميات", en: "BOQ item deleted" },
    "finance.expense_recorded": { ar: "تسجيل مصروف داخلي", en: "Expense recorded" },
    "finance.expense_updated": { ar: "تعديل مصروف داخلي", en: "Expense updated" },
    "finance.expense_voided": { ar: "إلغاء مصروف داخلي", en: "Expense voided" },
    "finance.client_payment_recorded": { ar: "تسجيل دفعة من العميل", en: "Client payment recorded" },
    "finance.client_payment_updated": { ar: "تعديل دفعة عميل", en: "Client payment updated" },
    "finance.client_payment_voided": { ar: "إلغاء دفعة عميل", en: "Client payment voided" },
    "finance.contractor_payment_recorded": { ar: "تسجيل دفعة لمقاول", en: "Contractor payment recorded" },
    "finance.contractor_payment_updated": { ar: "تعديل دفعة مقاول", en: "Contractor payment updated" },
    "finance.contractor_payment_voided": { ar: "إلغاء دفعة مقاول", en: "Contractor payment voided" }
  };
  return labels[action]?.[locale] ?? action;
}

export type DocumentCategory = "CONTRACT" | "PERMIT" | "REPORT" | "CORRESPONDENCE" | "HANDOVER" | "OTHER";
export type DocumentRecordStatus = "ACTIVE" | "ARCHIVED";

export type DocumentVersionRecord = {
  id: string;
  versionNumber: number;
  versionCode: string;
  originalFilename: string;
  mimeType: string;
  extension: string;
  fileSize: number;
  note: string | null;
  checksumSha256?: string;
  uploadedBy: { id: string; displayName: string; role: UserRole };
  createdAt: string;
};

export type ProjectDocumentRecord = {
  id: string;
  projectId: string;
  reference: string;
  title: string;
  description: string | null;
  category: DocumentCategory;
  status: DocumentRecordStatus;
  isClientVisible: boolean;
  currentVersionNumber: number;
  currentVersion: DocumentVersionRecord | null;
  versions: DocumentVersionRecord[];
  createdBy: { id: string; displayName: string; role: UserRole };
  createdAt: string;
  updatedAt: string;
};

export function documentFileUrl(projectId: string, documentId: string, versionId: string, download = false) {
  return `${apiBaseUrl}/projects/${projectId}/documents/${documentId}/versions/${versionId}/file${download ? "?download=1" : ""}`;
}

export const DOCUMENT_CATEGORIES: DocumentCategory[] = ["CONTRACT", "PERMIT", "REPORT", "CORRESPONDENCE", "HANDOVER", "OTHER"];
export const DOCUMENT_STATUSES: DocumentRecordStatus[] = ["ACTIVE", "ARCHIVED"];

export function documentCategoryLabel(category: DocumentCategory, locale: "ar" | "en") {
  const labels: Record<DocumentCategory, { ar: string; en: string }> = {
    CONTRACT: { ar: "عقد / اتفاقية", en: "Contract" },
    PERMIT: { ar: "تصريح", en: "Permit" },
    REPORT: { ar: "تقرير", en: "Report" },
    CORRESPONDENCE: { ar: "مراسلات", en: "Correspondence" },
    HANDOVER: { ar: "مستندات التسليم", en: "Handover" },
    OTHER: { ar: "أخرى", en: "Other" }
  };
  return labels[category][locale];
}

export function documentStatusLabel(status: DocumentRecordStatus, locale: "ar" | "en") {
  return status === "ARCHIVED" ? (locale === "ar" ? "مؤرشف" : "Archived") : locale === "ar" ? "فعّال" : "Active";
}

export function documentStatusTone(status: DocumentRecordStatus): BadgeTone {
  return status === "ARCHIVED" ? "neutral" : "success";
}

export function documentVisibilityLabel(isClientVisible: boolean, locale: "ar" | "en") {
  if (locale === "ar") return isClientVisible ? "مشترك مع العميل" : "داخلي فقط";
  return isClientVisible ? "Client Shared" : "Internal Only";
}

export function documentVisibilityTone(isClientVisible: boolean): BadgeTone {
  return isClientVisible ? "info" : "neutral";
}

export function documentFormatCode(mime: string, filename: string): string {
  const lower = filename.toLowerCase();
  if (mime.includes("pdf") || lower.endsWith(".pdf")) return "PDF";
  if (mime.includes("png") || lower.endsWith(".png")) return "PNG";
  if (mime.includes("jpeg") || mime.includes("jpg") || lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "JPG";
  if (mime.includes("wordprocessingml") || lower.endsWith(".docx")) return "DOCX";
  if (mime.includes("spreadsheetml") || lower.endsWith(".xlsx")) return "XLSX";
  return "FILE";
}

export function documentActionLabel(action: string, locale: "ar" | "en"): string {
  const labels: Record<string, { ar: string; en: string }> = {
    "documents.created": { ar: "تم تسجيل مستند جديد", en: "Document registered" },
    "documents.metadata_updated": { ar: "تم تحديث بيانات المستند", en: "Document metadata updated" },
    "documents.version_uploaded": { ar: "تم رفع نسخة جديدة", en: "New version uploaded" },
    "documents.client_visibility_changed": { ar: "تم تغيير مشاركة المستند مع العميل", en: "Client visibility changed" },
    "documents.archived": { ar: "تمت أرشفة المستند", en: "Document archived" },
    "documents.restored": { ar: "تمت استعادة المستند", en: "Document restored" }
  };
  return labels[action]?.[locale] ?? action;
}

export type ChatMessageType = "TEXT" | "VOICE";

export type ChatVoiceMeta = {
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  durationSeconds: number | null;
};

export type ChatMessageRecord = {
  id: string;
  projectId: string;
  type: ChatMessageType;
  text: string | null;
  voice: ChatVoiceMeta | null;
  author: { id: string; displayName: string; role: UserRole };
  createdAt: string;
};

export type ChatHistoryResponse = {
  messages: ChatMessageRecord[];
  nextCursor: string | null;
};

export type ChatReadState = {
  lastReadAt: string;
  unreadCount: number;
};

export function voiceNoteUrl(projectId: string, messageId: string) {
  return `${apiBaseUrl}/projects/${projectId}/messages/${messageId}/voice`;
}

export function formatVoiceDuration(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const remaining = total % 60;
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

export type NotificationType =
  | "CHAT_MESSAGE"
  | "VOICE_MESSAGE"
  | "DESIGN_REVIEW_REQUIRED"
  | "DESIGN_APPROVED"
  | "DESIGN_REJECTED"
  | "SITE_UPDATE"
  | "PROJECT_PROGRESS_CHANGED"
  | "DOCUMENT_SHARED";

export type NotificationRecord = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  projectId: string | null;
  project: { id: string; code: string | null; name: string } | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
};

export function notificationDestination(notification: NotificationRecord): string | null {
  if (!notification.projectId) return null;
  const base = `/app/projects/${notification.projectId}`;
  switch (notification.type) {
    case "CHAT_MESSAGE":
    case "VOICE_MESSAGE":
      return `${base}/chat`;
    case "DESIGN_REVIEW_REQUIRED":
    case "DESIGN_APPROVED":
    case "DESIGN_REJECTED":
      return notification.entityId ? `${base}/design/${notification.entityId}` : `${base}/design`;
    case "DOCUMENT_SHARED":
      return `${base}/documents`;
    case "SITE_UPDATE":
    case "PROJECT_PROGRESS_CHANGED":
      return `${base}/site-activity`;
    default:
      return base;
  }
}

export function notificationTypeLabel(type: NotificationType, locale: "ar" | "en") {
  const labels: Record<NotificationType, { ar: string; en: string }> = {
    CHAT_MESSAGE: { ar: "رسالة دردشة", en: "Chat message" },
    VOICE_MESSAGE: { ar: "رسالة صوتية", en: "Voice message" },
    DESIGN_REVIEW_REQUIRED: { ar: "مطلوب مراجعة تصميم", en: "Design review required" },
    DESIGN_APPROVED: { ar: "تم اعتماد التصميم", en: "Design approved" },
    DESIGN_REJECTED: { ar: "تم رفض التصميم", en: "Design rejected" },
    SITE_UPDATE: { ar: "تحديث موقع", en: "Site update" },
    PROJECT_PROGRESS_CHANGED: { ar: "تحديث نسبة الإنجاز", en: "Progress updated" },
    DOCUMENT_SHARED: { ar: "مستند جديد", en: "Document shared" }
  };
  return labels[type][locale];
}

export function relativeTime(iso: string, locale: "ar" | "en") {
  const then = new Date(iso).getTime();
  const diffSeconds = Math.round((Date.now() - then) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale === "ar" ? "ar" : "en", { numeric: "auto" });
  const thresholds: Array<[number, Intl.RelativeTimeFormatUnit]> = [
    [60, "second"],
    [3600, "minute"],
    [86400, "hour"],
    [2592000, "day"],
    [31536000, "month"]
  ];
  if (diffSeconds < 60) return rtf.format(-diffSeconds, "second");
  for (let i = 1; i < thresholds.length; i += 1) {
    const [limit] = thresholds[i]!;
    const [divisor, unit] = thresholds[i - 1]!;
    if (diffSeconds < limit) return rtf.format(-Math.round(diffSeconds / divisor), unit);
  }
  return rtf.format(-Math.round(diffSeconds / 31536000), "year");
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
    "user.deactivated": { ar: "تم إيقاف الحساب", en: "Account deactivated" },
    "chat.message_sent": { ar: "رسالة دردشة جديدة", en: "New chat message" },
    "chat.voice_sent": { ar: "رسالة صوتية جديدة", en: "New voice note" }
  };
  return labels[action]?.[locale] ?? action;
}
