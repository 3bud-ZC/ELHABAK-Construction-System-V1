// Dependency-free (no zod) so the web client can import it without bundling zod.

/** Staff (Admin/Engineer/Accountant/Worker) self-chosen passwords. */
export const PASSWORD_MIN_LENGTH = 10;
/** Client self-chosen passwords: length only, no composition rules (owner policy). */
export const CLIENT_PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export type PasswordPolicyAudience = "client" | "staff";
export type PasswordPolicyIssue = "too_short" | "too_long" | "edge_whitespace" | "needs_letter_and_number";

export function passwordMinLength(audience: PasswordPolicyAudience): number {
  return audience === "client" ? CLIENT_PASSWORD_MIN_LENGTH : PASSWORD_MIN_LENGTH;
}

/**
 * Policy for a password a user chooses for themselves. Shared by the web form (live hint)
 * and the API (authoritative check).
 *  - client: at least 8 characters, nothing else required ("12345678" is accepted);
 *  - staff:  at least 10 characters with a letter plus a number or symbol (unchanged).
 * Leading/trailing whitespace is refused for everyone because the mobile clipboard path
 * cannot reproduce it reliably at the next sign-in.
 */
export function passwordPolicyIssue(password: string, audience: PasswordPolicyAudience = "staff"): PasswordPolicyIssue | null {
  const length = Array.from(password).length;
  if (length < passwordMinLength(audience)) return "too_short";
  if (length > PASSWORD_MAX_LENGTH) return "too_long";
  if (password !== password.trim()) return "edge_whitespace";
  if (audience === "staff" && (!/\p{L}/u.test(password) || !/[\p{N}\p{P}\p{S}]/u.test(password))) return "needs_letter_and_number";
  return null;
}
