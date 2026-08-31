import { NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_MISSING_IT, adminCookieOptions, isAdminConfigured, verifyAdminPassword, createAdminToken } from "@/lib/admin-auth";
import { adminLoginSchema, flattenZodError } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAdminConfigured()) return NextResponse.json({ error: ADMIN_MISSING_IT }, { status: 503 });
  let raw: unknown;
  try { raw = await request.json(); } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }
  const parsed = adminLoginSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
  if (!verifyAdminPassword(parsed.data.password)) return NextResponse.json({ error: "Password non corretta." }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, createAdminToken() as string, adminCookieOptions());
  return res;
}
