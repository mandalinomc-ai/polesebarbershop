"use client";

import { SITE, getWhatsAppUrl, NOTIFY_WHATSAPP_MESSAGE } from "@/lib/site-config";
import {
  CANONICAL_SITE_HOST,
  CANONICAL_SITE_URL,
} from "@/lib/canonical-host";
import { SiteLogo } from "@/components/site/SiteImage";

type ComingSoonProps = {
  /**
   * Shown on Vercel / old hosts: the live site moved to .it
   * (legacy “social offline” holding page).
   */
  showMovedNotice?: boolean;
};

/** Legacy social-offline landing — logo, address, Instagram, WhatsApp. */
export function ComingSoon({ showMovedNotice = false }: ComingSoonProps) {
  const notifyUrl = getWhatsAppUrl(NOTIFY_WHATSAPP_MESSAGE);

  return (
    <main id="main-content" className="coming-soon-page">
      <div className="coming-soon-inner">
        <SiteLogo
          alt={`${SITE.name} — logo`}
          className="brand-logo brand-logo--hero"
          sizes="(max-width: 640px) 60vw, 240px"
          priority
        />
        <p className="coming-soon-brand">{SITE.brand}</p>
        <h1 className="coming-soon-title font-serif">{SITE.name}</h1>
        <p className="coming-soon-tagline font-serif">{SITE.tagline}</p>

        {showMovedNotice ? (
          <div className="coming-soon-moved" role="status">
            <p className="coming-soon-moved-label">Nuovo sito disponibile</p>
            <p className="coming-soon-moved-text">
              Prenotazioni, listino e gestionale sono online solo su
            </p>
            <a className="btn btn-dark coming-soon-moved-btn" href={CANONICAL_SITE_URL}>
              {CANONICAL_SITE_HOST}
            </a>
            <p className="coming-soon-moved-hint">
              Questo indirizzo resta solo come pagina di avviso: prenota e naviga
              dal dominio .it.
            </p>
          </div>
        ) : null}

        <div className="coming-soon-address">
          <strong>{SITE.address}</strong>
          <span>
            {SITE.postalCode} {SITE.city} ({SITE.province})
          </span>
        </div>

        {!showMovedNotice ? (
          <a
            className="btn btn-whatsapp"
            href={notifyUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Scrivici su WhatsApp
          </a>
        ) : null}

        <div className="coming-soon-social">
          <a href={SITE.instagram} target="_blank" rel="noopener noreferrer">
            {SITE.instagramHandle}
          </a>
          <a href={`tel:${SITE.phoneTel}`}>{SITE.phoneDisplay}</a>
        </div>
      </div>
    </main>
  );
}
