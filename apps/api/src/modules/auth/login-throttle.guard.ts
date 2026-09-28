import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { emailSchema } from "@elhabak/validation";

/**
 * Rate limiter for credential endpoints. The default tracker uses `req.ips[0]` - the
 * leftmost X-Forwarded-For entry - which is attacker-controlled and would let a client
 * bypass the limit by rotating a spoofed XFF header. Express runs with `trust proxy = 1`,
 * so `req.ip` already resolves to the real client IP forwarded by Nginx.
 */
@Injectable()
export class LoginThrottleGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    return Promise.resolve(ipTracker(req));
  }
}

/** Real client IP (`trust proxy` = 1 behind Nginx), never the spoofable leftmost XFF. */
export function ipTracker(req: Record<string, unknown>): string {
  return typeof req.ip === "string" && req.ip ? req.ip : "unknown";
}

/**
 * Client IP + target account: the submitted login email on /auth/login, the session's
 * user id on /auth/password/change. Invisible marks and case are folded so trivial
 * variations of one email share a budget.
 */
export function accountTracker(req: Record<string, unknown>): string {
  const body = (req.body ?? {}) as { email?: unknown };
  const user = req.user as { id?: string } | undefined;
  let account = user?.id ?? "anonymous";
  if (typeof body.email === "string") {
    // Same normalisation as login itself (invisible bidi marks stripped, trimmed).
    const parsed = emailSchema.safeParse(body.email);
    account = (parsed.success ? parsed.data : body.email.trim()).toLowerCase();
  }
  return `${ipTracker(req)}|${account}`;
}
