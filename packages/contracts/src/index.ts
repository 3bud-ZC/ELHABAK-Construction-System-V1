export const supportedLocales = ["ar", "en"] as const;
export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = "ar";

export const textDirections = {
  ar: "rtl",
  en: "ltr"
} as const satisfies Record<Locale, "rtl" | "ltr">;

export const companyContact = {
  email: "elhabakconstruction.eg@gmail.com",
  // Official company phone display format: 01130666726
  phone: "01130666726",
  phoneFormatted: "(+20) 011 306 667 26",
  // Canonical E.164 form (+20 then national number without trunk 0).
  phoneE164: "+201130666726",
  // Digits-only international form for wa.me deep links.
  whatsappNumber: "201130666726",
  address: "Uptown Mall, New Sohag City, Sohag, Egypt"
} as const;

export type ContactChannels = typeof companyContact;

/**
 * Normalizes an Egyptian phone number to E.164 ("+20XXXXXXXXXX"). Handles the formats the
 * number is realistically encountered in: "(+20) 011 306 667 26", "+20 113 066 6726",
 * "011 306 667 26", "00201130666726", or a bare national number. Returns null for empty,
 * implausible, or non-Egyptian input - this is deliberately scoped to EG because the only
 * numbers this product publishes or stores for clients are Egyptian. Arabic-Indic digits
 * and the invisible bidi marks an RTL clipboard embeds are folded away first.
 */
export function normalizePhoneToE164(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = toLatinPhoneText(input).trim();
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

const EGYPTIAN_MOBILE_E164 = /^\+201[0125]\d{8}$/;
const PHONE_TEXT_ALLOWED = /^[\d\s+\-().]+$/;

/**
 * Canonical client mobile number: E.164 "+201XXXXXXXXX" for the Egyptian mobile ranges
 * (010, 011, 012, 015), accepting every everyday spelling - "01130666726", "+20 11 3066
 * 6726", "00201130666726", "011 3066 6726", Arabic-Indic digits. Anything containing
 * letters or other symbols, landlines, and foreign numbers return null so the caller
 * can reject the input instead of silently storing a malformed number. This is the single
 * normalizer shared by the client forms (web + API validation) and the client temporary
 * password generator.
 */
export function normalizeEgyptianMobile(input: string | null | undefined): string | null {
  if (!input) return null;
  const text = toLatinPhoneText(input).trim();
  if (!text || !PHONE_TEXT_ALLOWED.test(text)) return null;
  const e164 = normalizePhoneToE164(text);
  return e164 && EGYPTIAN_MOBILE_E164.test(e164) ? e164 : null;
}

/** Folds Arabic-Indic / Extended Arabic-Indic digits to ASCII and drops bidi/zero-width marks. */
function toLatinPhoneText(value: string): string {
  let out = "";
  for (const ch of value) {
    const code = ch.codePointAt(0) as number;
    if (code >= 0x0660 && code <= 0x0669) out += String(code - 0x0660);
    else if (code >= 0x06f0 && code <= 0x06f9) out += String(code - 0x06f0);
    else if (
      (code >= 0x200b && code <= 0x200f) ||
      (code >= 0x202a && code <= 0x202e) ||
      (code >= 0x2066 && code <= 0x2069) ||
      code === 0xfeff ||
      code === 0x061c
    ) continue;
    else out += ch;
  }
  return out;
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
