import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin-auth-constants";
import {
  CANONICAL_SITE_HOST,
  isCanonicalHost,
  requestHost,
} from "@/lib/canonical-host";

/**
 * On non-.it hosts only robots.txt is served locally (Disallow: /).
 * Everything else — including `/` — permanent-redirects to the .it site so
 * Google and clients never see the old Vercel full-site mirror.
 */
function isLegacyRobotsOnly(pathname: string): boolean {
  return pathname === "/robots.txt";
}

/**
 * Non-.it hosts: 308 → .it (except robots.txt + API 410).
 * Deny-by-default for /api/admin/* except login/logout (HMAC still in Node).
 */
export function middleware(request: NextRequest) {
  const host = requestHost(request.headers);
  const { pathname, search } = request.nextUrl;

  if (!isCanonicalHost(host)) {
    if (pathname.startsWith("/api/")) {
      const res = NextResponse.json(
        {
          error: "Questo indirizzo non è più attivo. Usa il sito .it.",
          url: `https://${CANONICAL_SITE_HOST}`,
        },
        { status: 410 },
      );
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
      return res;
    }

    if (isLegacyRobotsOnly(pathname)) {
      const res = NextResponse.next();
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
      res.headers.set("Cache-Control", "no-store");
      return res;
    }

    const dest = new URL(`https://${CANONICAL_SITE_HOST}${pathname}${search}`);
    const res = NextResponse.redirect(dest, 308);
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    res.headers.set("Cache-Control", "no-store");
    return res;
  }

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
  matcher: ["/((?!_next/static|_next/image).*)"],
};
