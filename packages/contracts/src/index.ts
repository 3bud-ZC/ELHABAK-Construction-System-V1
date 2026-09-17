export const supportedLocales = ["ar", "en"] as const;
export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = "ar";

export const textDirections = {
  ar: "rtl",
  en: "ltr"
} as const satisfies Record<Locale, "rtl" | "ltr">;

export const companyContact = {
  email: "elhabakconstruction.eg@gmail.com",
  // Human-facing Egyptian display format only - never derive machine URLs (tel:, wa.me)
  // from this string; use the canonical `phoneE164`/`whatsappNumber` values below.
  phone: "(+20) 011 111 309 18",
  // Canonical E.164 form of the number above (+20 then the national number without the
  // trunk 0). `tel:` links and JSON-LD use this verbatim.
  phoneE164: "+201111130918",
  // Digits-only international form for wa.me deep links (wa.me rejects "+", spaces, and
  // trunk zeros).
  whatsappNumber: "201111130918",
  address: "Uptown Mall, New Sohag City, Sohag, Egypt"
} as const;

export type ContactChannels = typeof companyContact;

/**
 * Normalizes an Egyptian phone number to E.164 ("+20XXXXXXXXXX"). Handles the formats the
 * number is realistically encountered in: "(+20) 011 111 309 18", "+20 111 113 0918",
 * "011 111 309 18", "00201111130918", or a bare national number. Returns null for empty,
 * implausible, or non-Egyptian input - this is deliberately scoped to EG because the only
 * numbers this product publishes are Egyptian.
 */
export function normalizePhoneToE164(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const hadPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 8) return null;

  let national: string;
  if (hadPlus) {
    national = digits;
  } else if (digits.startsWith("0020")) {
    national = digits.slice(2); // 00 international prefix -> "+..."
  } else if (digits.startsWith("20") && digits.length >= 12) {
    national = digits; // already carries the country code, missing the "+"
  } else if (digits.startsWith("0")) {
    national = `20${digits.slice(1)}`; // domestic trunk 0 -> +20
  } else {
    national = `20${digits}`; // bare national significant number
  }

  // A "+20" followed by a trunk 0 is the classic copy/paste defect - E.164 forbids it.
  if (national.startsWith("20") && national.charAt(2) === "0") {
    national = `20${national.slice(3)}`;
  }

  // Egyptian national significant numbers are 9-10 digits (mobile 10, landline 8-9 after
  // area code); anything shorter/longer is not a usable destination.
  const nationalSignificant = national.length - 2;
  if (!national.startsWith("20") || nationalSignificant < 8 || nationalSignificant > 10) {
    return null;
  }
  return `+${national}`;
}

/** `tel:` URI for the contact's canonical E.164 number. */
export function telHref(contact: Pick<ContactChannels, "phoneE164"> = companyContact): string {
  return `tel:${contact.phoneE164}`;
}

/** wa.me click-to-chat URL with a URL-encoded predefined message. */
export function whatsappHref(
  contact: Pick<ContactChannels, "whatsappNumber"> = companyContact,
  message = ""
): string {
  return `https://wa.me/${contact.whatsappNumber}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}

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
