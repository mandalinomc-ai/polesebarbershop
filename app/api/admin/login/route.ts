import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  ADMIN_MISSING_IT,
  ADMIN_WEAK_DEFAULTS_IT,
  adminCookieOptions,
  isAdminConfigured,
  isUsingDefaultAdminCredentials,
  verifyAdminCredentials,
  createAdminToken,
} from "@/lib/admin-auth";
import { getClientIp } from "@/lib/client-ip";
import { RATE_LIMITS, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { adminLoginSchema, flattenZodError } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: ADMIN_MISSING_IT }, { status: 503 });
  }
  if (
    process.env.NODE_ENV === "production" &&
    isUsingDefaultAdminCredentials()
  ) {
    return NextResponse.json({ error: ADMIN_WEAK_DEFAULTS_IT }, { status: 503 });
  }

  const ip = getClientIp(request);
  const limited = rateLimit(`admin-login:${ip}`, RATE_LIMITS.adminLogin);
  if (!limited.ok) {
    const rl = rateLimitResponse(
      limited.retryAfterSec,
      "Troppi tentativi di accesso. Riprova tra qualche minuto.",
    );
    return NextResponse.json(rl.body, {
      status: rl.status,
      headers: rl.headers,
    });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }
  const parsed = adminLoginSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
  }
  if (!verifyAdminCredentials(parsed.data.username, parsed.data.password)) {
    return NextResponse.json(
      { error: "Utente o password non corretti." },
      { status: 401 },
    );
  }
  const token = createAdminToken();
  if (!token) {
    return NextResponse.json({ error: ADMIN_MISSING_IT }, { status: 503 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, adminCookieOptions());
  return res;
}
