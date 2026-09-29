import { randomInt } from "node:crypto";

/** Client temporary passwords are exactly this many decimal digits (owner policy). */
export const TEMPORARY_PASSWORD_DIGITS = 8;
const TEMPORARY_PASSWORD_SPACE = 10 ** TEMPORARY_PASSWORD_DIGITS;

/**
 * Generates a client temporary password: 8 decimal digits (e.g. `48273160`), drawn as one
 * uniform value in [0, 10^8) with `crypto.randomInt` (CSPRNG, rejection-sampled, no modulo
 * bias) and left-padded, so leading zeros are as likely as any other digit.
 *
 * Nothing about the client is an input: no phone digits, no prefix, no sequence. The
 * credential is only a one-time hand-over secret - it is bcrypt-hashed, forces a password
 * change at first sign-in, and every attempt passes the per-account and per-IP login
 * throttles, which is what bounds guessing against the 10^8 space.
 */
export function generateClientTemporaryPassword(): string {
  return String(randomInt(TEMPORARY_PASSWORD_SPACE)).padStart(TEMPORARY_PASSWORD_DIGITS, "0");
}

function isInvisibleMark(code: number) {
  return (
    (code >= 0x200b && code <= 0x200f) ||
    (code >= 0x202a && code <= 0x202e) ||
    (code >= 0x2066 && code <= 0x2069) ||
    code === 0xfeff ||
    code === 0x061c
  );
}

function isSeparator(ch: string, code: number) {
  return /\s/u.test(ch) || ch === "-" || (code >= 0x2010 && code <= 0x2015) || code === 0x2212;
}

/** Arabic-Indic (U+0660-0669) and Extended Arabic-Indic (U+06F0-06F9) digits to ASCII. */
function foldDigit(ch: string, code: number) {
  if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
  if (code >= 0x06f0 && code <= 0x06f9) return String(code - 0x06f0);
  return ch;
}

function compact(input: string) {
  return Array.from(input)
    .filter((ch) => {
      const code = ch.codePointAt(0) as number;
      return !isInvisibleMark(code) && !isSeparator(ch, code);
    })
    .map((ch) => foldDigit(ch, ch.codePointAt(0) as number))
    .join("");
}

/**
 * Credentials issued before the numeric policy (`EH-6726-K7P4Q-9ZXMA`) are still valid until
 * their holders change them, so their relay tolerance is kept for accounts that still hold
 * a temporary credential.
 */
const LEGACY_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const LEGACY_COMPACT = new RegExp(`^EH([0-9]{4})?([${LEGACY_ALPHABET}]{10})$`);
const NUMERIC_COMPACT = new RegExp(`^[0-9]{${TEMPORARY_PASSWORD_DIGITS}}$`);

/**
 * Copy/paste and retyping tolerance scoped strictly to generated temporary credentials.
 * A credential relayed through WhatsApp or typed on an Arabic phone keyboard often arrives
 * with spaces, Arabic-Indic digits or invisible bidi marks. Returns the canonical generated
 * form when the input is such a credential modulo those differences - otherwise null, so
 * every other password keeps exact semantics. The caller only accepts the canonical form
 * for an account that still holds its temporary credential.
 */
export function canonicalGeneratedTemporaryPassword(input: string): string | null {
  if (input.length > 64) return null;
  const folded = compact(input);
  if (NUMERIC_COMPACT.test(folded)) return folded;
  const legacy = LEGACY_COMPACT.exec(folded.toUpperCase());
  if (!legacy) return null;
  const random = legacy[2] as string;
  return ["EH", legacy[1] ?? null, random.slice(0, 5), random.slice(5)].filter(Boolean).join("-");
}
