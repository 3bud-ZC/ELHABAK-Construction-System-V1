export const supportedLocales = ["ar", "en"] as const;
export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = "ar";

export const textDirections = {
  ar: "rtl",
  en: "ltr"
} as const satisfies Record<Locale, "rtl" | "ltr">;

export const companyContact = {
  email: "elhabakconstruction.eg@gmail.com",
  phone: "(+20) 011 111 309 18",
  address: "Uptown Mall, New Sohag City, Sohag, Egypt"
} as const;

export const userRoles = ["ADMIN", "ENGINEER", "ACCOUNTANT", "WORKER", "CLIENT"] as const;
export type UserRole = (typeof userRoles)[number];

export const projectCategories = [
  "DESIGN",
  "CONSTRUCTION",
  "FINISHING",
  "GENERAL_CONTRACTING",
  "FURNITURE",
  "MIXED"
] as const;
export type ProjectCategory = (typeof projectCategories)[number];

export const projectPhases = [
  "SITE_INSPECTION",
  "DESIGN",
  "PRELIMINARY_ESTIMATION",
  "EXECUTION",
  "INITIAL_HANDOVER",
  "FINAL_HANDOVER"
] as const;
export type ProjectPhase = (typeof projectPhases)[number];

export const designDisciplines = [
  "ARCHITECTURAL",
  "STRUCTURAL",
  "INTERIOR",
  "ELECTRICAL",
  "PLUMBING",
  "FURNITURE",
  "RENDERS",
  "OTHER"
] as const;
export type DesignDiscipline = (typeof designDisciplines)[number];

export const designStatuses = ["DRAFT", "IN_REVIEW", "APPROVED", "REJECTED"] as const;
export type DesignStatus = (typeof designStatuses)[number];
