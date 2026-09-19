import {
  computeLineTotalMinor,
  decimalToMinorUnits,
  minorUnitsToDecimal
} from "@elhabak/validation";

/**
 * ELHABAK V6 - row-level import validation.
 *
 * Pure functions: every validator receives the projected record plus a context object
 * built by the service (existing emails, lookup maps, in-file duplicates). They never
 * touch the database, which keeps the full validation matrix unit-testable and lets
 * preview and commit share the exact same rules.
 */

export type FieldIssue = {
  field: string;
  code: string;
  message: string;
  suggestion?: string;
};

export type RowStatus = "valid" | "duplicate" | "error";

export type RowValidation<T> = {
  index: number;
  status: RowStatus;
  issues: FieldIssue[];
  data: T | null;
};

export type DuplicateStrategy = "error" | "skip" | "update";

export const DUPLICATE_STRATEGIES: DuplicateStrategy[] = ["error", "skip", "update"];

/* ---------------------------------- shared ---------------------------------- */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_ALLOWED = /^[+()\-./\s\d]{5,25}$/;

export function normalizeEmailValue(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function normalizePhone(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!PHONE_ALLOWED.test(trimmed)) return null;
  return trimmed;
}

export function parseImportDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!DATE_PATTERN.test(trimmed)) {
    const parsed = Date.parse(trimmed);
    if (Number.isNaN(parsed)) return null;
    return new Date(parsed);
  }
  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseBooleanFlag(value: string): boolean | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (["1", "true", "yes", "y", "active", "نشط", "نعم"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "inactive", "غير نشط", "لا"].includes(normalized)) return false;
  return null;
}

function formulaIssue(field: string): FieldIssue {
  return { field, code: "formula", message: "Spreadsheet formulas are not allowed in business values." };
}

export function flagFormulaFields(record: Record<string, string>, formulaFields: string[]): FieldIssue[] {
  return formulaFields
    .filter((field) => field in record)
    .map((field) => formulaIssue(field));
}

/* ---------------------------------- clients ---------------------------------- */

export const CLIENT_FIELD_ALIASES: Record<string, string[]> = {
  name: ["name", "client name", "full name", "الاسم", "اسم العميل", "اسم"],
  email: ["email", "e-mail", "mail", "البريد الالكتروني", "الايميل", "بريد"],
  phone: ["phone", "phone number", "mobile", "tel", "الهاتف", "رقم الهاتف", "موبايل", "جوال", "تليفون"],
  notes: ["notes", "note", "ملاحظات", "ملاحظه"],
  active: ["active", "is active", "status", "نشط", "الحاله", "حالة الحساب"]
};

export type ClientImportRow = {
  name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  isActive: boolean;
};

export type ClientImportContext = {
  /** Normalized email -> existing user id (any role). */
  existingUsers: Map<string, string>;
  /** Normalized email -> existing client profile id. */
  existingClients: Map<string, string>;
};

export function validateClientRow(
  index: number,
  record: Record<string, string>,
  formulaFields: string[],
  ctx: ClientImportContext,
  fileEmails: Map<string, number>
): RowValidation<ClientImportRow> {
  const issues: FieldIssue[] = flagFormulaFields(record, formulaFields);

  const name = (record.name ?? "").trim();
  if (!name) {
    issues.push({ field: "name", code: "required", message: "Client name is required." });
  } else if (name.length > 255) {
    issues.push({ field: "name", code: "too_long", message: "Client name is too long." });
  }

  const email = normalizeEmailValue(record.email ?? "");
  if (!email) {
    issues.push({ field: "email", code: "required", message: "Email is required." });
  } else if (!isValidEmail(email)) {
    issues.push({ field: "email", code: "invalid_email", message: "Enter a valid email address.", suggestion: "name@example.com" });
  }

  const phoneRaw = (record.phone ?? "").trim();
  let phone: string | null = null;
  if (phoneRaw) {
    phone = normalizePhone(phoneRaw);
    if (!phone) {
      issues.push({ field: "phone", code: "invalid_phone", message: "Enter a valid phone number (digits and +()-./ only)." });
    }
  }

  let isActive = true;
  const activeRaw = (record.active ?? "").trim();
  if (activeRaw) {
    const parsed = parseBooleanFlag(activeRaw);
    if (parsed === null) {
      issues.push({ field: "active", code: "invalid_flag", message: "Use yes/no (or true/false) for the active flag." });
    } else {
      isActive = parsed;
    }
  }

  const notes = (record.notes ?? "").trim() || null;
  if (notes && notes.length > 3000) {
    issues.push({ field: "notes", code: "too_long", message: "Notes are too long." });
  }

  let rowStatus: RowStatus = issues.length > 0 ? "error" : "valid";
  if (email && isValidEmail(email)) {
    if (fileEmails.has(email) && fileEmails.get(email) !== index) {
      rowStatus = "duplicate";
      issues.push({
        field: "email",
        code: "duplicate_in_file",
        message: `Duplicate email inside the file (also on row ${fileEmails.get(email)}).`
      });
    } else if (ctx.existingClients.has(email) || ctx.existingUsers.has(email)) {
      rowStatus = "duplicate";
      issues.push({
        field: "email",
        code: ctx.existingClients.has(email) ? "existing_client" : "existing_account",
        message: ctx.existingClients.has(email)
          ? "A client with this email already exists."
          : "A user account with this email already exists.",
        suggestion: "Choose a duplicate strategy (skip/update) or fix the row."
      });
    }
  }

  const fatal = issues.some((issue) => !["existing_client", "existing_account", "duplicate_in_file"].includes(issue.code));
  return {
    index,
    status: fatal ? "error" : rowStatus,
    issues,
    data: fatal ? null : { name, email, phone, notes, isActive }
  };
}

/* ---------------------------------- projects ---------------------------------- */

export const PROJECT_FIELD_ALIASES: Record<string, string[]> = {
  code: ["project_code", "code", "project code", "كود المشروع", "رقم المشروع", "الكود"],
  name: ["name", "project name", "project_name", "اسم المشروع", "المشروع"],
  category: ["category", "project category", "الفئه", "فئة المشروع", "التصنيف"],
  clientEmail: ["client_email", "client email", "بريد العميل", "ايميل العميل", "العميل"],
  engineerEmail: ["engineer_email", "engineer email", "بريد المهندس", "ايميل المهندس", "المهندس"],
  location: ["location", "address", "city", "الموقع", "العنوان", "المكان"],
  startDate: ["start_date", "start date", "تاريخ البدء", "تاريخ البدايه"],
  targetDate: ["target_date", "target date", "deadline", "تاريخ التسليم", "التسليم المستهدف"],
  phase: ["phase", "current phase", "المرحله", "المرحلة الحاليه"],
  progress: ["progress", "progress %", "الانجاز", "نسبة الانجاز", "التقدم"],
  status: ["status", "project status", "الحاله", "حالة المشروع"],
  notes: ["notes", "note", "ملاحظات", "ملاحظه"]
};

export const PROJECT_CATEGORY_KEYS = ["DESIGN", "CONSTRUCTION", "FINISHING", "GENERAL_CONTRACTING", "FURNITURE", "MIXED"] as const;
export const PROJECT_PHASE_KEYS = [
  "SITE_INSPECTION",
  "DESIGN",
  "PRELIMINARY_ESTIMATION",
  "EXECUTION",
  "INITIAL_HANDOVER",
  "FINAL_HANDOVER"
] as const;
export const PROJECT_STATUS_KEYS = ["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"] as const;

const ARABIC_CATEGORY_MAP: Record<string, (typeof PROJECT_CATEGORY_KEYS)[number]> = {
  "تصميم": "DESIGN",
  "انشاءات": "CONSTRUCTION",
  "تشييد": "CONSTRUCTION",
  "تشطيب": "FINISHING",
  "تشطيبات": "FINISHING",
  "مقاولات عامه": "GENERAL_CONTRACTING",
  "مقاولات": "GENERAL_CONTRACTING",
  "اثاث": "FURNITURE",
  "تاثيث": "FURNITURE",
  "متنوع": "MIXED",
  "مختلط": "MIXED"
};

const ARABIC_PHASE_MAP: Record<string, (typeof PROJECT_PHASE_KEYS)[number]> = {
  "المعاينه": "SITE_INSPECTION",
  "معاينه": "SITE_INSPECTION",
  "التصميم": "DESIGN",
  "المقايسه التقريبيه": "PRELIMINARY_ESTIMATION",
  "المقايسه": "PRELIMINARY_ESTIMATION",
  "التنفيذ": "EXECUTION",
  "التسليم الابتدائي": "INITIAL_HANDOVER",
  "التسليم النهائي": "FINAL_HANDOVER"
};

const ARABIC_STATUS_MAP: Record<string, (typeof PROJECT_STATUS_KEYS)[number]> = {
  "مخطط": "PLANNED",
  "نشط": "ACTIVE",
  "متوقف": "ON_HOLD",
  "معلق": "ON_HOLD",
  "مكتمل": "COMPLETED",
  "ملغي": "CANCELLED"
};

function lookupEnum<T extends string>(
  raw: string,
  allowed: readonly T[],
  arabicMap: Record<string, T>
): T | null {
  const normalized = raw.trim();
  if (!normalized) return null;
  const upper = normalized.toUpperCase().replace(/[\s-]+/g, "_");
  const direct = allowed.find((value) => value === upper);
  if (direct) return direct;
  const arabic = normalized.toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه");
  return arabicMap[arabic] ?? null;
}

export type ProjectImportRow = {
  code: string;
  name: string;
  category: (typeof PROJECT_CATEGORY_KEYS)[number];
  clientEmail: string;
  engineerEmail: string;
  clientProfileId: string;
  engineerId: string;
  location: string | null;
  startDate: Date | null;
  targetDate: Date | null;
  phase: (typeof PROJECT_PHASE_KEYS)[number];
  progress: number;
  status: (typeof PROJECT_STATUS_KEYS)[number];
  notes: string | null;
};

export type ProjectImportContext = {
  /** Normalized project code -> existing project id. */
  existingCodes: Map<string, string>;
  /** Normalized email -> client profile id. */
  clientsByEmail: Map<string, string>;
  /** Normalized email -> engineer user id (role ENGINEER only). */
  engineersByEmail: Map<string, string>;
};

export function validateProjectRow(
  index: number,
  record: Record<string, string>,
  formulaFields: string[],
  ctx: ProjectImportContext,
  fileCodes: Map<string, number>
): RowValidation<ProjectImportRow> {
  const issues: FieldIssue[] = flagFormulaFields(record, formulaFields);

  const code = (record.code ?? "").trim().toUpperCase();
  if (!code) {
    issues.push({ field: "code", code: "required", message: "Project code is required." });
  } else if (code.length < 2 || code.length > 64) {
    issues.push({ field: "code", code: "invalid", message: "Project code must be 2-64 characters." });
  }

  const name = (record.name ?? "").trim();
  if (!name) {
    issues.push({ field: "name", code: "required", message: "Project name is required." });
  } else if (name.length > 255) {
    issues.push({ field: "name", code: "too_long", message: "Project name is too long." });
  }

  const category = lookupEnum(record.category ?? "", PROJECT_CATEGORY_KEYS, ARABIC_CATEGORY_MAP);
  if (!category) {
    issues.push({
      field: "category",
      code: "invalid_enum",
      message: "Unknown project category.",
      suggestion: PROJECT_CATEGORY_KEYS.join(" / ")
    });
  }

  const clientEmail = normalizeEmailValue(record.clientEmail ?? "");
  let clientProfileId = "";
  if (!clientEmail) {
    issues.push({ field: "clientEmail", code: "required", message: "Client email is required." });
  } else if (!isValidEmail(clientEmail)) {
    issues.push({ field: "clientEmail", code: "invalid_email", message: "Enter a valid client email." });
  } else {
    const found = ctx.clientsByEmail.get(clientEmail);
    if (!found) {
      issues.push({
        field: "clientEmail",
        code: "unknown_client",
        message: "No client exists with this email.",
        suggestion: "Import the client first or correct the email."
      });
    } else {
      clientProfileId = found;
    }
  }

  const engineerEmail = normalizeEmailValue(record.engineerEmail ?? "");
  let engineerId = "";
  if (!engineerEmail) {
    issues.push({ field: "engineerEmail", code: "required", message: "Engineer email is required." });
  } else if (!isValidEmail(engineerEmail)) {
    issues.push({ field: "engineerEmail", code: "invalid_email", message: "Enter a valid engineer email." });
  } else {
    const found = ctx.engineersByEmail.get(engineerEmail);
    if (!found) {
      issues.push({
        field: "engineerEmail",
        code: "unknown_engineer",
        message: "No ENGINEER account exists with this email.",
        suggestion: "Create the engineer user first or correct the email."
      });
    } else {
      engineerId = found;
    }
  }

  const location = (record.location ?? "").trim() || null;
  const startDate = (record.startDate ?? "").trim() ? parseImportDate(record.startDate ?? "") : null;
  if ((record.startDate ?? "").trim() && !startDate) {
    issues.push({ field: "startDate", code: "invalid_date", message: "Invalid start date.", suggestion: "YYYY-MM-DD" });
  }
  const targetDate = (record.targetDate ?? "").trim() ? parseImportDate(record.targetDate ?? "") : null;
  if ((record.targetDate ?? "").trim() && !targetDate) {
    issues.push({ field: "targetDate", code: "invalid_date", message: "Invalid target date.", suggestion: "YYYY-MM-DD" });
  }
  if (startDate && targetDate && targetDate.getTime() < startDate.getTime()) {
    issues.push({ field: "targetDate", code: "date_order", message: "Target date must not be before the start date." });
  }

  let phase: (typeof PROJECT_PHASE_KEYS)[number] = "SITE_INSPECTION";
  const phaseRaw = (record.phase ?? "").trim();
  if (phaseRaw) {
    const parsed = lookupEnum(phaseRaw, PROJECT_PHASE_KEYS, ARABIC_PHASE_MAP);
    if (!parsed) {
      issues.push({ field: "phase", code: "invalid_enum", message: "Unknown project phase.", suggestion: PROJECT_PHASE_KEYS.join(" / ") });
    } else {
      phase = parsed;
    }
  }

  let progress = 0;
  const progressRaw = (record.progress ?? "").trim().replace(/%$/, "");
  if (progressRaw) {
    const parsed = Number(progressRaw);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
      issues.push({ field: "progress", code: "invalid_progress", message: "Progress must be an integer between 0 and 100." });
    } else {
      progress = parsed;
    }
  }

  let status: (typeof PROJECT_STATUS_KEYS)[number] = "PLANNED";
  const statusRaw = (record.status ?? "").trim();
  if (statusRaw) {
    const parsed = lookupEnum(statusRaw, PROJECT_STATUS_KEYS, ARABIC_STATUS_MAP);
    if (!parsed) {
      issues.push({ field: "status", code: "invalid_enum", message: "Unknown project status.", suggestion: PROJECT_STATUS_KEYS.join(" / ") });
    } else {
      status = parsed;
    }
  }

  const notes = (record.notes ?? "").trim() || null;

  let rowStatus: RowStatus = issues.length > 0 ? "error" : "valid";
  if (code) {
    if (fileCodes.has(code) && fileCodes.get(code) !== index) {
      rowStatus = "duplicate";
      issues.push({
        field: "code",
        code: "duplicate_in_file",
        message: `Duplicate project code inside the file (also on row ${fileCodes.get(code)}).`
      });
    } else if (ctx.existingCodes.has(code)) {
      rowStatus = "duplicate";
      issues.push({
        field: "code",
        code: "existing_code",
        message: "A project with this code already exists.",
        suggestion: "Choose a duplicate strategy (skip/update) or change the code."
      });
    }
  }

  return {
    index,
    status: issues.some((issue) => issue.code !== "existing_code" && issue.code !== "duplicate_in_file") ? "error" : rowStatus,
    issues,
    data: issues.some((issue) => !["existing_code", "duplicate_in_file"].includes(issue.code))
      ? null
      : {
          code,
          name,
          category: category ?? "MIXED",
          clientEmail,
          engineerEmail,
          clientProfileId,
          engineerId,
          location,
          startDate,
          targetDate,
          phase,
          progress,
          status,
          notes
        }
  };
}

/* ------------------------------------ BOQ ------------------------------------ */

export const BOQ_FIELD_ALIASES: Record<string, string[]> = {
  code: ["code", "item code", "boq code", "الكود", "كود البند", "رقم البند"],
  section: ["section", "group", "القسم", "الباب", "الفصل"],
  description: ["description", "item", "item description", "الوصف", "البيان", "البند"],
  unit: ["unit", "uom", "الوحده", "وحدة القياس"],
  quantity: ["quantity", "qty", "الكميه", "الكمية"],
  unitRate: ["unit_rate", "unit rate", "rate", "price", "unit price", "السعر", "سعر الوحده", "الفئه"],
  note: ["note", "notes", "ملاحظات", "ملاحظه"],
  sortOrder: ["sort_order", "sort order", "order", "sort", "الترتيب", "ترتيب"]
};

const BOQ_UNITS = ["M", "M2", "M3", "ITEM", "LOT"] as const;
const UNIT_ALIASES: Record<string, (typeof BOQ_UNITS)[number]> = {
  m: "M",
  meter: "M",
  "م": "M",
  "متر": "M",
  m2: "M2",
  "m²": "M2",
  sqm: "M2",
  "م2": "M2",
  "م²": "M2",
  "متر مربع": "M2",
  m3: "M3",
  "m³": "M3",
  "م3": "M3",
  "م³": "M3",
  "متر مكعب": "M3",
  item: "ITEM",
  pcs: "ITEM",
  piece: "ITEM",
  "قطعه": "ITEM",
  "عدد": "ITEM",
  lot: "LOT",
  "دفعه": "LOT",
  "مقطوعيه": "LOT"
};

export function lookupBoqUnit(raw: string): (typeof BOQ_UNITS)[number] | null {
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return null;
  const upper = normalized.toUpperCase();
  const direct = BOQ_UNITS.find((unit) => unit === upper);
  if (direct) return direct;
  return UNIT_ALIASES[normalized] ?? null;
}

export type BoqImportRow = {
  code: string;
  section: string | null;
  description: string;
  unit: (typeof BOQ_UNITS)[number];
  quantityMilli: number;
  unitRateMinor: number;
  lineTotalMinor: number;
  note: string | null;
  sortOrder: number;
};

export type BoqImportContext = {
  /** Existing BOQ codes inside the target project -> item id. */
  existingCodes: Map<string, string>;
};

const MONEY_INPUT = /^\d{1,15}(\.\d{1,2})?$/;
const QUANTITY_INPUT = /^\d{1,12}(\.\d{1,3})?$/;

export function validateBoqRow(
  index: number,
  record: Record<string, string>,
  formulaFields: string[],
  ctx: BoqImportContext,
  fileCodes: Map<string, number>
): RowValidation<BoqImportRow> {
  const issues: FieldIssue[] = flagFormulaFields(record, formulaFields);

  const code = (record.code ?? "").trim();
  if (!code) {
    issues.push({ field: "code", code: "required", message: "Item code is required." });
  } else if (code.length > 40) {
    issues.push({ field: "code", code: "too_long", message: "Item code must be at most 40 characters." });
  }

  const description = (record.description ?? "").trim();
  if (!description) {
    issues.push({ field: "description", code: "required", message: "Item description is required." });
  } else if (description.length > 255) {
    issues.push({ field: "description", code: "too_long", message: "Item description is too long." });
  }

  const unit = lookupBoqUnit(record.unit ?? "");
  if (!unit) {
    issues.push({ field: "unit", code: "invalid_enum", message: "Unknown unit.", suggestion: "M / M2 / M3 / ITEM / LOT" });
  }

  const quantityRaw = (record.quantity ?? "").trim().replace(/,/g, "");
  let quantityMilli = 0;
  if (!quantityRaw) {
    issues.push({ field: "quantity", code: "required", message: "Quantity is required." });
  } else if (!QUANTITY_INPUT.test(quantityRaw)) {
    issues.push({ field: "quantity", code: "invalid_quantity", message: "Enter a valid quantity (up to 3 decimal places)." });
  } else {
    quantityMilli = decimalToMinorUnits(quantityRaw, 3);
    if (quantityMilli <= 0) {
      issues.push({ field: "quantity", code: "invalid_quantity", message: "Quantity must be greater than zero." });
    }
  }

  const rateRaw = (record.unitRate ?? "").trim().replace(/,/g, "");
  let unitRateMinor = 0;
  if (!rateRaw) {
    issues.push({ field: "unitRate", code: "required", message: "Unit rate is required." });
  } else if (!MONEY_INPUT.test(rateRaw)) {
    issues.push({ field: "unitRate", code: "invalid_amount", message: "Enter a valid amount (up to 2 decimal places)." });
  } else {
    unitRateMinor = decimalToMinorUnits(rateRaw, 2);
  }

  const note = (record.note ?? "").trim() || null;

  let sortOrder = 0;
  const sortRaw = (record.sortOrder ?? "").trim();
  if (sortRaw) {
    const parsed = Number(sortRaw);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100000) {
      issues.push({ field: "sortOrder", code: "invalid_sort", message: "Sort order must be an integer between 0 and 100000." });
    } else {
      sortOrder = parsed;
    }
  }

  let rowStatus: RowStatus = issues.length > 0 ? "error" : "valid";
  if (code) {
    if (fileCodes.has(code) && fileCodes.get(code) !== index) {
      rowStatus = "duplicate";
      issues.push({
        field: "code",
        code: "duplicate_in_file",
        message: `Duplicate item code inside the file (also on row ${fileCodes.get(code)}).`
      });
    } else if (ctx.existingCodes.has(code)) {
      rowStatus = "duplicate";
      issues.push({
        field: "code",
        code: "existing_code",
        message: "An item with this code already exists in the project BOQ.",
        suggestion: "Choose a duplicate strategy (skip/update) or change the code."
      });
    }
  }

  const fatal = issues.some((issue) => !["existing_code", "duplicate_in_file"].includes(issue.code));
  const lineTotalMinor = quantityMilli > 0 ? computeLineTotalMinor(quantityMilli, unitRateMinor) : 0;

  return {
    index,
    status: fatal ? "error" : rowStatus,
    issues,
    data: fatal
      ? null
      : {
          code,
          section: (record.section ?? "").trim() || null,
          description,
          unit: unit ?? "ITEM",
          quantityMilli,
          unitRateMinor,
          lineTotalMinor,
          note,
          sortOrder
        }
  };
}

/** Display helper: computed line total preview in major units (string, exact). */
export function previewLineTotal(row: BoqImportRow): string {
  return minorUnitsToDecimal(row.lineTotalMinor, 2);
}

/* --------------------------- import summary helpers --------------------------- */

export function firstSeenKeys(rows: Array<{ index: number; key: string }>): Map<string, number> {
  const seen = new Map<string, number>();
  for (const row of rows) {
    if (row.key && !seen.has(row.key)) seen.set(row.key, row.index);
  }
  return seen;
}
