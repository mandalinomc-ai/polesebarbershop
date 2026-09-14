/** Shared constants safe for Edge middleware (no Node crypto / next/headers). */
export const ADMIN_COOKIE = "polese_admin";
export const DEFAULT_ADMIN_USER = "admin";
/** Password gestionale richiesta: smda2026 (override con ADMIN_PASSWORD in env). */
export const DEFAULT_ADMIN_PASSWORD = "smda2026";
/** Historical insecure pair — still blocked in production if somehow used. */
export const LEGACY_WEAK_ADMIN_PASSWORD = "admin";
/** 12 hours */
export const ADMIN_SESSION_MAX_AGE_SEC = 60 * 60 * 12;
