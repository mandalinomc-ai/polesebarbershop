import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin-auth-constants";
import {
  CANONICAL_SITE_HOST,
  isCanonicalHost,
  requestHost,
} from "@/lib/canonical-host";

function isLegacyPassthrough(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/assets")) return true;
  if (
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/apple-touch-icon.png"
  ) {
    return true;
  }
  return /\.(?:png|jpg|jpeg|webp|gif|svg|ico|css|js|mjs|map|woff2?|ttf|txt)$/i.test(
    pathname,
  );
}

/**
 * Non-.it hosts: keep only the legacy social-offline home; send everything else to .it.
 * Deny-by-default for /api/admin/* except login/logout (HMAC still in Node).
 */
export function middleware(request: NextRequest) {
  const host = requestHost(request.headers);
  const { pathname, search } = request.nextUrl;

  if (!isCanonicalHost(host)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          error: "Questo indirizzo non è più attivo. Usa il sito .it.",
          url: `https://${CANONICAL_SITE_HOST}`,
        },
        { status: 410 },
      );
    }

    if (!isLegacyPassthrough(pathname)) {
      const dest = new URL(`https://${CANONICAL_SITE_HOST}${pathname}${search}`);
      return NextResponse.redirect(dest, 308);
    }

    const res = NextResponse.next();
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
