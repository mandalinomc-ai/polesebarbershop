import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "polese_admin";

function expectedToken(password: string) {
  return createHmac("sha256", password).update("polese-admin-session").digest("hex");
}

export function isAdminConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 4);
}

export function verifyAdminPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function createAdminToken() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return expectedToken(password);
}

export function isAdminTokenValid(token: string | undefined | null) {
  if (!token) return false;
  const expected = createAdminToken();
  if (!expected) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function isAdminRequest() {
  const jar = await cookies();
  return isAdminTokenValid(jar.get(ADMIN_COOKIE)?.value);
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 60 * 60 * 12,
  };
}

export const ADMIN_MISSING_IT =
  "Area admin non configurata: imposta ADMIN_PASSWORD nelle variabili d'ambiente.";
