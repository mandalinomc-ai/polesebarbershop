import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin-auth-constants";

/**
 * Deny-by-default for /api/admin/* except login/logout.
 * Presence check only on the edge; full HMAC + expiry runs in Node route handlers.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/admin/") &&
    pathname !== "/api/admin/login" &&
    pathname !== "/api/admin/logout"
  ) {
    const token = request.cookies.get(ADMIN_COOKIE)?.value;
    if (!token || token.length < 40) {
      return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
    }
  }

  if (pathname === "/gestionale" || pathname.startsWith("/gestionale/")) {
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    res.headers.set("Cache-Control", "no-store");
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/admin/:path*", "/gestionale", "/gestionale/:path*"],
};
