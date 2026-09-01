"use client";

import { useEffect, useState } from "react";
import {
  SITE,
  HERO_CTA,
  getWhatsAppUrl,
  getMapsUrl,
  getHeroHeadline,
  isBeforeOfficialOpening,
} from "@/lib/site-config";
import { formatItalianDate } from "@/lib/availability";
import { OpeningCountdown } from "@/components/site/OpeningCountdown";
import { HeroCalendar } from "@/components/site/HeroCalendar";
import { FillCoverImage } from "@/components/site/SiteImage";
import { VIDEO_REELS } from "@/lib/site-videos";

export function Hero() {
  const beforeOpening = isBeforeOfficialOpening();
  const heroVideo = VIDEO_REELS[0];

  return (
    <section id="hero" className="hero hero-editorial">
      <div className="hero-grid">
        <div className="hero-copy reveal">
          <p className="eyebrow">{SITE.brand}</p>
          <h1 className="hero-title font-serif">{SITE.heroHeadline}</h1>
          {beforeOpening ? <OpeningCountdown /> : null}
          <p className="hero-kicker">{getHeroHeadline()}</p>
          <p className="hero-text">
            {beforeOpening
              ? `Apriamo il ${formatItalianDate(SITE.openingDate)} in ${SITE.address}, ${SITE.city}. Il calendario è già aperto: scegli un giorno e prenota online.`
              : `Felice e Davide — taglio, barba, colore e consulenza tricologica a ${SITE.address}, ${SITE.city}.`}
          </p>
          <div className="hero-actions">
            <a href="/#prenota" className="btn btn-dark btn-magnetic">
              {HERO_CTA}
            </a>
            <a
              href={getWhatsAppUrl()}
              className="btn btn-outline btn-magnetic"
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp
            </a>
            <a
              href={getMapsUrl()}
              className="btn btn-outline btn-magnetic"
              target="_blank"
              rel="noopener noreferrer"
            >
              Raggiungici ora
            </a>
          </div>
          <HeroCalendar />
        </div>
        <div className="hero-media reveal reveal-d1">
          <div className="hero-media-video">
            <video
              src={heroVideo.src}
              poster={heroVideo.poster}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-label={heroVideo.alt}
            />
          </div>
          <div className="hero-media-photo">
            <FillCoverImage
              src="/assets/images/gallery/fresha-01.jpg"
              alt="Interno Polese Barbershop"
              sizes="(max-width: 900px) 100vw, 45vw"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
