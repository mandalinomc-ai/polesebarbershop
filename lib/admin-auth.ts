import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_MAX_AGE_SEC,
  DEFAULT_ADMIN_USER,
} from "./admin-auth-constants";

export {
  ADMIN_COOKIE,
  ADMIN_SESSION_MAX_AGE_SEC,
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
 * Password for /gestionale. Requires `process.env.ADMIN_PASSWORD`.
 * No hardcoded fallback — unset/empty means login is disabled.
 */
export function getAdminPassword() {
  const value = process.env.ADMIN_PASSWORD;
  if (value == null || value.length === 0) return "";
  return value;
}

export function isAdminConfigured() {
  return getAdminPassword().length >= 4;
}

/** True when ADMIN_USER and ADMIN_PASSWORD are both set in the environment. */
export function hasExplicitAdminCredentials() {
  const userFromEnv = process.env.ADMIN_USER?.trim();
  const passFromEnv = process.env.ADMIN_PASSWORD;
  return Boolean(userFromEnv && passFromEnv != null && passFromEnv.length > 0);
}

export function verifyAdminPassword(password: string) {
  const expected = getAdminPassword();
  if (!expected) return false;
  return safeEqual(password, expected);
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
  const secure = process.env.NODE_ENV === "production";
  /** Share session across apex + www so agenda/storico load after login. */
  let domain: string | undefined;
  try {
    const host = new URL(
      process.env.NEXT_PUBLIC_SITE_URL || "https://felicepolesebarbershop.it",
    ).hostname.replace(/^www\./, "");
    if (host === "felicepolesebarbershop.it") {
      domain = ".felicepolesebarbershop.it";
    }
  } catch {
    /* ignore invalid SITE_URL */
  }
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SEC,
    ...(domain ? { domain } : {}),
  };
}

export const ADMIN_MISSING_IT =
  "Area gestionale non configurata: imposta ADMIN_PASSWORD (almeno 4 caratteri) nell'ambiente.";
