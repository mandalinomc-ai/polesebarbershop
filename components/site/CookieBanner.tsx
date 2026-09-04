"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CONSENT_COOKIE_NAME,
  CONSENT_STORAGE_KEY,
  SITE_COOKIES,
  defaultConsent,
  parseConsent,
  serializeConsent,
  type CookieConsentState,
} from "@/lib/cookie-consent";

function writeConsent(state: CookieConsentState) {
  const raw = serializeConsent(state);
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, raw);
  } catch {
    /* private mode */
  }
  if (state.preferences) {
    const maxAge = 60 * 60 * 24 * 365;
    document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(raw)};path=/;max-age=${maxAge};samesite=lax`;
  } else {
    document.cookie = `${CONSENT_COOKIE_NAME}=;path=/;max-age=0;samesite=lax`;
  }
  window.dispatchEvent(new CustomEvent("polese-cookie-consent", { detail: state }));
}

function readStored(): CookieConsentState | null {
  try {
    return parseConsent(localStorage.getItem(CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [panel, setPanel] = useState(false);
  const [prefs, setPrefs] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gestisci-cookie") === "1") {
      setVisible(true);
      setPanel(true);
      return;
    }
    if (!readStored()) setVisible(true);
  }, []);

  useEffect(() => {
    const open = () => {
      setVisible(true);
      setPanel(true);
      const stored = readStored();
      if (stored) setPrefs(stored.preferences);
    };
    window.addEventListener("polese-open-cookie-settings", open);
    return () => window.removeEventListener("polese-open-cookie-settings", open);
  }, []);

  const closeWith = useCallback((preferences: boolean) => {
    writeConsent(defaultConsent(preferences));
    setVisible(false);
    setPanel(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="cookie-banner"
      role="dialog"
      aria-label="Informativa cookie"
      aria-modal="false"
    >
      {!panel ? (
        <>
          <p className="cookie-banner-text">
            Usiamo solo cookie tecnici necessari al sito e, se accetti, un cookie
            per ricordare la tua scelta. Nessun cookie di profilazione o
            pubblicità.{" "}
            <a href="/cookie-policy">Cookie policy</a>
          </p>
          <div className="cookie-banner-actions">
            <button type="button" className="btn btn-ink" onClick={() => closeWith(true)}>
              Accetta
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => closeWith(false)}
            >
              Rifiuta
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setPanel(true)}
            >
              Personalizza
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="cookie-banner-text">
            Scegli le categorie. I cookie necessari restano sempre attivi.
          </p>
          <ul className="cookie-banner-list">
            <li>
              <label>
                <input type="checkbox" checked disabled readOnly />
                <span>
                  <strong>Necessari</strong> — sessione gestionale (HttpOnly),
                  funzionamento del sito.
                </span>
              </label>
            </li>
            <li>
              <label>
                <input
                  type="checkbox"
                  checked={prefs}
                  onChange={(e) => setPrefs(e.target.checked)}
                />
                <span>
                  <strong>Preferenze</strong> — ricorda la scelta sul banner (
                  {SITE_COOKIES.find((c) => c.category === "preferences")?.name}).
                </span>
              </label>
            </li>
          </ul>
          <div className="cookie-banner-actions">
            <button type="button" className="btn btn-ink" onClick={() => closeWith(prefs)}>
              Salva
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setPanel(false)}
            >
              Indietro
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** Footer / legal link — opens the banner personalization panel. */
export function ManageCookiesButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={className || "cookie-manage-link"}
      onClick={() => {
        window.dispatchEvent(new Event("polese-open-cookie-settings"));
      }}
    >
      Gestisci cookie
    </button>
  );
}
