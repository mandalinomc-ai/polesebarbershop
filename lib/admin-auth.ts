import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "polese_admin";
const COOKIE_MAX_AGE = 60 * 60 * 12;

function expectedToken(password: string): string {
  return createHmac("sha256", password).update("polese-admin-session").digest("hex");
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 4);
}

export function verifyAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function createAdminToken(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return expectedToken(password);
}

export function isAdminTokenValid(token: string | undefined | null): boolean {
  if (!token) return false;
  const expected = createAdminToken();
  if (!expected) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function getAdminCookieValue(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(ADMIN_COOKIE)?.value;
}

export async function isAdminRequest(): Promise<boolean> {
  return isAdminTokenValid(await getAdminCookieValue());
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };
}

export const ADMIN_MISSING_IT =
  "Area admin non configurata: imposta ADMIN_PASSWORD nelle variabili d'ambiente.";
