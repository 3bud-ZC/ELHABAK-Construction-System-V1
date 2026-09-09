import { NextResponse, type NextRequest } from "next/server";

const sessionCookieName = process.env.SESSION_COOKIE_NAME ?? "elhabak_session";

export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has(sessionCookieName);

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    const lang = request.nextUrl.searchParams.get("lang");

    if (lang) {
      loginUrl.searchParams.set("lang", lang);
    }

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"]
};
