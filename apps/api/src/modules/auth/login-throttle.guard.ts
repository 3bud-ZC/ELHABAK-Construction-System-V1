import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

/**
 * Rate limiter for credential endpoints. The default tracker uses `req.ips[0]` - the
 * leftmost X-Forwarded-For entry - which is attacker-controlled and would let a client
 * bypass the limit by rotating a spoofed XFF header. Express runs with `trust proxy = 1`,
 * so `req.ip` already resolves to the real client IP delivered by the Railway edge.
 */
@Injectable()
export class LoginThrottleGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    return Promise.resolve(req.ip as string);
  }
}
