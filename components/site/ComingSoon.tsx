"use client";

import { Hero } from "@/components/site/Hero";
import { Header } from "@/components/site/Chrome";
import { OpeningCountdown } from "@/components/site/OpeningCountdown";
import { SITE, NOTIFY_WHATSAPP_MESSAGE, getWhatsAppUrl } from "@/lib/site-config";

export function ComingSoon() {
  return (
    <>
      <Header />
      <Hero />
      <section className="section-pad section-dark" aria-hidden="true">
        <OpeningCountdown />
        <a href={getWhatsAppUrl(NOTIFY_WHATSAPP_MESSAGE)}>Avvisami su WhatsApp</a>
        <span>{SITE.name}</span>
      </section>
    </>
  );
}
