// Dependency-free (no zod) so the web client can import it without bundling zod.

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

export type PasswordPolicyIssue = "too_short" | "too_long" | "edge_whitespace" | "needs_letter_and_number";

/**
 * Policy for a password a user chooses for themselves. Shared by the web form (live hint)
 * and the API (authoritative check). Leading/trailing whitespace is refused because the
 * mobile clipboard path cannot reproduce it reliably at the next sign-in.
 */
export function passwordPolicyIssue(password: string): PasswordPolicyIssue | null {
  const length = Array.from(password).length;
  if (length < PASSWORD_MIN_LENGTH) return "too_short";
  if (length > PASSWORD_MAX_LENGTH) return "too_long";
  if (password !== password.trim()) return "edge_whitespace";
  if (!/\p{L}/u.test(password) || !/[\p{N}\p{P}\p{S}]/u.test(password)) return "needs_letter_and_number";
  return null;
}
