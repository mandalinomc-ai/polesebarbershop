import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "polese_admin";
export const DEFAULT_ADMIN_USER = "admin";
export const DEFAULT_ADMIN_PASSWORD = "admin";

function expectedToken(user: string, password: string) {
  return createHmac("sha256", `${user}:${password}`).update("polese-admin-session").digest("hex");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Username for /gestionale. Env ADMIN_USER, otherwise `admin`. */
export function getAdminUser() {
  const value = process.env.ADMIN_USER?.trim();
  return value ? value : DEFAULT_ADMIN_USER;
}

/**
 * Password for /gestionale. Env ADMIN_PASSWORD if set (any length),
 * otherwise `admin` so local/dev works without .env.
 */
export function getAdminPassword() {
  const value = process.env.ADMIN_PASSWORD;
  if (value == null || value.length === 0) return DEFAULT_ADMIN_PASSWORD;
  return value;
}

export function isAdminConfigured() {
  return getAdminPassword().length >= 4;
}

export function verifyAdminPassword(password: string) {
  return safeEqual(password, getAdminPassword());
}

export function verifyAdminCredentials(username: string, password: string) {
  if (!isAdminConfigured()) return false;
  const userOk = safeEqual(username.trim().toLowerCase(), getAdminUser().toLowerCase());
  const passOk = safeEqual(password, getAdminPassword());
  return userOk && passOk;
}

export function createAdminToken() {
  if (!isAdminConfigured()) return null;
  return expectedToken(getAdminUser(), getAdminPassword());
}

export function isAdminTokenValid(token: string | undefined | null) {
  if (!token) return false;
  const expected = createAdminToken();
  if (!expected) return false;
  return safeEqual(token, expected);
}

export async function isAdminRequest() {
  const jar = await cookies();
  return isAdminTokenValid(jar.get(ADMIN_COOKIE)?.value);
}

export function adminCookieOptions() {
  const onVercel = process.env.VERCEL === "1";
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && onVercel,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 12,
  };
}

export const ADMIN_MISSING_IT =
  "Area gestionale non configurata: ADMIN_PASSWORD deve avere almeno 4 caratteri.";
