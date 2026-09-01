"use client";

import { SITE, NOTIFY_WHATSAPP_MESSAGE, getWhatsAppUrl } from "@/lib/site-config";
import { formatItalianDate } from "@/lib/availability";
import { OpeningCountdown } from "@/components/site/OpeningCountdown";
import { SiteLogo } from "@/components/site/SiteImage";

export function ComingSoon() {
  const notifyUrl = getWhatsAppUrl(NOTIFY_WHATSAPP_MESSAGE);

  return (
    <main id="main-content" className="coming-soon-page">
      <div className="coming-soon-inner">
        <SiteLogo
          alt="Felice Polese — Polese Barbershop"
          className="brand-logo brand-logo--pulse brand-logo--hero"
          sizes="(max-width: 640px) 60vw, 240px"
          priority
        />
        <p className="coming-soon-brand">{SITE.brand}</p>
        <h1 className="coming-soon-title font-serif">{SITE.name}</h1>
        <p className="coming-soon-tagline font-serif">{SITE.heroHeadline}</p>
        <div className="coming-soon-address">
          <strong>{SITE.address}</strong>
          <span>
            {SITE.city} · Apertura {formatItalianDate(SITE.openingDate)}
          </span>
        </div>
        <OpeningCountdown />
        <a
          className="btn btn-dark btn-magnetic"
          href={notifyUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Avvisami su WhatsApp
        </a>
        <div className="coming-soon-social">
          <a href={SITE.instagram} target="_blank" rel="noopener noreferrer">
            {SITE.instagramHandle}
          </a>
          <a href={`tel:${SITE.phoneTel}`}>{SITE.phone}</a>
        </div>
      </div>
    </main>
  );
}
