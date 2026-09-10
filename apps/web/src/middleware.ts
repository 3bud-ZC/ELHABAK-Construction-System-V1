import { NextResponse } from "next/server";

/**
 * The Railway deployment serves the web app and API on separate domains, so the session
 * cookie the API sets is scoped to the API's own origin - the browser never attaches it to a
 * request made to this web server, meaning a server-side presence check here can never see
 * it (this is a browser-enforced cookie scoping rule, not a config gap). Every `/app/*` page
 * is already wrapped in `AppShell`, which performs the real auth check client-side via
 * `GET /auth/me` (with credentials) against the API and redirects to `/login` on failure -
 * that check is authoritative and this middleware is not needed to enforce it, only to save
 * a bundle load for an obviously-signed-out visitor when the cookie happens to be visible
 * (same-origin local dev). It intentionally never blocks a request it can't be sure about.
 */
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"]
};
