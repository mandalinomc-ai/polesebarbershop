import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_MAX_AGE_SEC,
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_ADMIN_USER,
} from "./admin-auth-constants";

export {
  ADMIN_COOKIE,
  ADMIN_SESSION_MAX_AGE_SEC,
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_ADMIN_USER,
} from "./admin-auth-constants";

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

/** True when credentials are the insecure local defaults. */
export function isUsingDefaultAdminCredentials() {
  return (
    getAdminUser().toLowerCase() === DEFAULT_ADMIN_USER &&
    getAdminPassword() === DEFAULT_ADMIN_PASSWORD
  );
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

function sessionSecret(): string {
  const fromEnv = process.env.ADMIN_SESSION_SECRET?.trim();
  if (fromEnv && fromEnv.length >= 16) return fromEnv;
  // Derive from credentials so password rotation invalidates sessions.
  return createHmac("sha256", `${getAdminUser()}:${getAdminPassword()}`)
    .update("polese-admin-session-v2")
    .digest("hex");
}

/**
 * Signed, expiring session token: `{expMs}.{nonce}.{hmac}`.
 * HttpOnly cookie only — never readable by client JS.
 */
export function createAdminToken(now = Date.now()) {
  if (!isAdminConfigured()) return null;
  const exp = now + ADMIN_SESSION_MAX_AGE_SEC * 1000;
  const nonce = randomBytes(16).toString("hex");
  const payload = `${exp}.${nonce}`;
  const sig = createHmac("sha256", sessionSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function isAdminTokenValid(token: string | undefined | null, now = Date.now()) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [expStr, nonce, sig] = parts;
  if (!expStr || !nonce || !sig) return false;
  if (!/^\d{10,16}$/.test(expStr)) return false;
  if (!/^[a-f0-9]{32}$/.test(nonce)) return false;
  if (!/^[a-f0-9]{64}$/.test(sig)) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || now > exp) return false;
  const expected = createHmac("sha256", sessionSecret())
    .update(`${expStr}.${nonce}`)
    .digest("hex");
  return safeEqual(sig, expected);
}

export async function isAdminRequest() {
  const jar = await cookies();
  return isAdminTokenValid(jar.get(ADMIN_COOKIE)?.value);
}

export function adminCookieOptions() {
  const secure =
    process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SEC,
  };
}

export const ADMIN_MISSING_IT =
  "Area gestionale non configurata: ADMIN_PASSWORD deve avere almeno 4 caratteri.";

export const ADMIN_WEAK_DEFAULTS_IT =
  "Credenziali gestionale di default non ammesse in produzione. Imposta ADMIN_USER e ADMIN_PASSWORD.";
