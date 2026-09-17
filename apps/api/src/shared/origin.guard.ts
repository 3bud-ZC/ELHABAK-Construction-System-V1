import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { parseApiEnv } from "@elhabak/config";
import type { Request } from "express";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF/browser-origin protection for credentialed cross-site requests.
 *
 * The session cookie is `SameSite=None; Secure` in production because the web app and API
 * live on different Railway domains - which means the browser will attach it to a
 * cross-site request initiated by any page on the internet. SameSite provides no defense
 * here, so state-changing requests are verified against the configured trusted web
 * origins instead.
 *
 * Rules for unsafe methods (POST/PUT/PATCH/DELETE):
 * - `Origin` present  -> must match a trusted origin. Browsers always send Origin on
 *   cross-site unsafe requests and it cannot be forged or removed by an attacker page.
 * - `Origin` absent but `Referer` present -> the Referer's origin must match.
 * - Neither present -> treated as a non-browser client (curl, server-to-server, test
 *   harness). A real browser cannot produce an unsafe request with no Origin, so there is
 *   no CSRF surface to close - but `Sec-Fetch-Site: cross-site` with no usable origin is
 *   still rejected as defense in depth.
 */
@Injectable()
export class OriginGuard implements CanActivate {
  private readonly env = parseApiEnv(process.env);
  private readonly trustedOrigins = new Set(
    [this.env.WEB_ORIGIN, ...this.env.EXTRA_WEB_ORIGINS].map((value) => normalizeOrigin(value)).filter(Boolean) as string[]
  );

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method)) return true;

    const origin = parseOrigin(request.headers.origin);
    if (origin) {
      if (this.isTrusted(origin, request)) return true;
      throw new ForbiddenException("Untrusted request origin.");
    }

    const referer = parseOrigin(request.headers.referer);
    if (referer) {
      if (this.isTrusted(referer, request)) return true;
      throw new ForbiddenException("Untrusted request origin.");
    }

    const secFetchSite = request.headers["sec-fetch-site"];
    if (typeof secFetchSite === "string" && secFetchSite.toLowerCase() === "cross-site") {
      throw new ForbiddenException("Untrusted request origin.");
    }

    return true;
  }

  private isTrusted(origin: string, request: Request): boolean {
    if (this.trustedOrigins.has(origin)) return true;

    // A future same-domain deployment should not fail closed: allow an Origin that is
    // exactly the API's own host as seen through the trusted proxy.
    const host = request.headers["x-forwarded-host"] ?? request.headers.host;
    const forwardedProto = request.headers["x-forwarded-proto"];
    const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto ?? request.protocol;
    const hostValue = Array.isArray(host) ? host[0] : host;
    if (hostValue && origin === `${proto}://${hostValue}`) return true;

    if (this.env.NODE_ENV !== "production") {
      // Local development: the web app may run on any localhost port.
      if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin)) return true;
    }
    return false;
  }
}

function parseOrigin(value: string | undefined): string | null {
  if (!value || typeof value !== "string") return null;
  try {
    return normalizeOrigin(new URL(value).origin);
  } catch {
    return null;
  }
}

function normalizeOrigin(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/\/+$/, "");
  return trimmed || null;
}
