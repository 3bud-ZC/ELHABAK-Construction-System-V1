import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Two responsibilities:
 *
 * 1. Emit a per-request nonce Content-Security-Policy. Next.js reads the nonce back out of
 *    the request CSP during server rendering and stamps it onto every framework/page
 *    script and its own inline styles, so scripts still require a fresh nonce while style
 *    attributes (used for progress widths, reveal delays, etc.) stay allowed.
 * 2. Keep the deliberate auth-passthrough the old middleware performed: the session cookie
 *    lives on the API domain, so no check can run here - `AppShell` verifies the session
 *    client-side via `GET /auth/me` and redirects signed-out visitors to /login.
 *
 * The API origin is allowed for fetch/XHR (connect-src), protected media (img/media-src),
 * and inline PDF preview iframes (frame-src); the Socket.IO endpoint additionally gets its
 * ws(s) scheme.
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isProduction = process.env.NODE_ENV === "production";

  const apiOrigin = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");
  const socketOrigin = (process.env.NEXT_PUBLIC_SOCKET_URL ?? apiOrigin).replace(/\/+$/, "");
  const socketWsOrigin = socketOrigin.replace(/^http/, "ws");

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isProduction ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${apiOrigin}`,
    "font-src 'self' data:",
    `connect-src 'self' ${apiOrigin} ${socketOrigin} ${socketWsOrigin}`,
    `media-src 'self' blob: ${apiOrigin}`,
    `frame-src 'self' ${apiOrigin}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'"
  ];
  // Upgrading localhost http requests to https would break local dev; production only.
  if (isProduction) directives.push("upgrade-insecure-requests");
  const csp = directives.join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);

  // Deployment traceability: Railway injects the git SHA; harmless to expose and lets
  // operators confirm exactly which commit a response came from.
  const commit = process.env.RAILWAY_GIT_COMMIT_SHA;
  if (commit) response.headers.set("x-deployed-commit", commit);

  return response;
}

export const config = {
  matcher: [
    // Every HTML route - skipping static assets, the image optimizer, public marketing
    // assets, generated metadata routes, and client-router prefetch requests.
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|icon.png|robots.txt|sitemap.xml|brand|marketing).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" }
      ]
    }
  ]
};
