import { randomInt } from "node:crypto";
import { normalizeEgyptianMobile } from "@elhabak/validation";

/**
 * Unambiguous alphabet for Admin-generated temporary credentials: uppercase letters and
 * digits minus the look-alikes 0/O, 1/I/L. Uppercase-only survives mobile keyboards that
 * auto-capitalize, and nothing here is a WhatsApp formatting marker (`_`, `*`, `~`).
 */
export const TEMPORARY_PASSWORD_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const RANDOM_GROUPS = 2;
const RANDOM_GROUP_LENGTH = 5;
const PREFIX = "EH";
const PHONE_FRAGMENT_LENGTH = 4;

/** Random symbols per credential; 10 symbols over a 31-symbol alphabet ~= 49.5 bits. */
export const TEMPORARY_PASSWORD_RANDOM_SYMBOLS = RANDOM_GROUPS * RANDOM_GROUP_LENGTH;

/**
 * Generates a client temporary password such as `EH-6726-K7P4Q-9ZXMA`:
 *  - `EH` and the last four digits of the client's canonical mobile number are only a
 *    human-recognizable label so the Admin and the client can tell credentials apart;
 *  - all of the secret strength comes from ten symbols drawn with `crypto.randomInt`
 *    (CSPRNG, rejection-sampled, no modulo bias).
 * Knowing the phone number therefore gives an attacker nothing beyond the public label.
 * When the stored phone is missing or not a valid mobile the label is simply omitted.
 */
export function generateClientTemporaryPassword(phone: string | null | undefined): string {
  const mobile = normalizeEgyptianMobile(phone);
  const groups = Array.from({ length: RANDOM_GROUPS }, () =>
    Array.from({ length: RANDOM_GROUP_LENGTH }, () => TEMPORARY_PASSWORD_ALPHABET[randomInt(TEMPORARY_PASSWORD_ALPHABET.length)]).join("")
  );
  return [PREFIX, mobile ? mobile.slice(-PHONE_FRAGMENT_LENGTH) : null, ...groups].filter(Boolean).join("-");
}

const GENERATED_COMPACT = new RegExp(
  `^${PREFIX}([0-9]{${PHONE_FRAGMENT_LENGTH}})?([${TEMPORARY_PASSWORD_ALPHABET}]{${TEMPORARY_PASSWORD_RANDOM_SYMBOLS}})$`
);

/**
 * Copy/paste and retyping tolerance scoped strictly to generated temporary credentials.
 * A credential relayed through WhatsApp or read aloud is often re-entered in lowercase,
 * with spaces or "smart" dashes instead of hyphens, or wrapped in the invisible bidi marks
 * an Arabic message carries. Returns the canonical generated form when the input is such
 * a credential modulo case, separators and invisible marks - otherwise null, so every
 * other password keeps exact semantics. The alphabet is uppercase-only, so case folding
 * costs no entropy.
 */
export function canonicalGeneratedTemporaryPassword(input: string): string | null {
  if (input.length > 64) return null;
  const compact = Array.from(input)
    .filter((ch) => {
      const code = ch.codePointAt(0) as number;
      const invisible =
        (code >= 0x200b && code <= 0x200f) ||
        (code >= 0x202a && code <= 0x202e) ||
        (code >= 0x2066 && code <= 0x2069) ||
        code === 0xfeff ||
        code === 0x061c;
      const separator = /\s/u.test(ch) || ch === "-" || (code >= 0x2010 && code <= 0x2015) || code === 0x2212;
      return !invisible && !separator;
    })
    .join("")
    .toUpperCase();
  const match = GENERATED_COMPACT.exec(compact);
  if (!match) return null;
  const random = match[2] as string;
  const groups = Array.from({ length: RANDOM_GROUPS }, (_, index) =>
    random.slice(index * RANDOM_GROUP_LENGTH, (index + 1) * RANDOM_GROUP_LENGTH)
  );
  return [PREFIX, match[1] ?? null, ...groups].filter(Boolean).join("-");
}
