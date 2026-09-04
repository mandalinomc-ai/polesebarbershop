"use client";

import { Hero } from "@/components/site/Hero";
import { Header } from "@/components/site/Chrome";
import { OpeningCountdown } from "@/components/site/OpeningCountdown";
import {
  SITE,
  NOTIFY_WHATSAPP_MESSAGE,
  getWhatsAppUrl,
  isPreOpeningCountdownVisible,
} from "@/lib/site-config";

export function ComingSoon() {
  const beforeOpening = isPreOpeningCountdownVisible();

  return (
    <>
      <Header />
      <Hero />
      {beforeOpening ? (
        <section className="section-pad section-dark" aria-hidden="true">
          <OpeningCountdown />
          <a
            className="btn btn-whatsapp"
            href={getWhatsAppUrl(NOTIFY_WHATSAPP_MESSAGE)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Avvisami su WhatsApp
          </a>
          <span>{SITE.name}</span>
        </section>
      ) : null}
    </>
  );
}
