import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

/**
 * Sends signed-out visitors to /login before a dashboard page renders, so a
 * typed URL, a bookmark or Back after logout never shows the app.
 *
 * This is an optimistic check on the "signed in" cookie set by lib/auth.ts —
 * the real check is the backend rejecting requests without a valid token, and
 * AuthGate still verifies the token in the browser.
 */

export function proxy(request: NextRequest) {
  if (request.cookies.get(SESSION_COOKIE)?.value) {
    const res = NextResponse.next();
    // Don't let the browser keep signed-in pages around after logout.
    res.headers.set("Cache-Control", "private, no-store");
    return res;
  }
  const login = request.nextUrl.clone();
  login.pathname = "/login";
  login.search = "";
  login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/customers/:path*",
    "/sales/:path*",
    "/ai-assistant/:path*",
    "/voice-assistant/:path*",
    "/insights/:path*",
    "/follow-up/:path*",
    "/settings/:path*",
    "/templates/:path*",
  ],
};
