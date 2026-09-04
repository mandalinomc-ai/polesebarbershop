/** Cookie consent — only real cookies used by this site. */

export const CONSENT_STORAGE_KEY = "polese_cookie_consent";
export const CONSENT_COOKIE_NAME = "polese_cookie_consent";

export type ConsentCategory = "necessary" | "preferences";

export type CookieConsentState = {
  necessary: true;
  preferences: boolean;
  updatedAt: string;
  version: 1;
};

export const CONSENT_VERSION = 1 as const;

/** Cookies actually used by Felice Polese (no analytics/marketing). */
export const SITE_COOKIES = [
  {
    name: "polese_admin",
    category: "necessary" as const,
    purpose:
      "Sessione autenticata dell'area gestionale (HttpOnly, Secure in produzione). Non usata sul sito pubblico.",
    duration: "12 ore",
  },
  {
    name: CONSENT_COOKIE_NAME,
    category: "preferences" as const,
    purpose: "Memorizza la scelta sul banner cookie (Accetta / Rifiuta / Personalizza).",
    duration: "12 mesi",
  },
] as const;

export function defaultConsent(preferences = false): CookieConsentState {
  return {
    necessary: true,
    preferences,
    updatedAt: new Date().toISOString(),
    version: CONSENT_VERSION,
  };
}

export function parseConsent(raw: string | null | undefined): CookieConsentState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CookieConsentState>;
    if (parsed.version !== CONSENT_VERSION) return null;
    if (parsed.necessary !== true) return null;
    return {
      necessary: true,
      preferences: Boolean(parsed.preferences),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
      version: CONSENT_VERSION,
    };
  } catch {
    return null;
  }
}

export function serializeConsent(state: CookieConsentState): string {
  return JSON.stringify(state);
}
