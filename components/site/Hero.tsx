"use client";

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
import { HERO_VIDEOS } from "@/lib/site-videos";

function HeroVideoCell({
  video,
  className,
}: {
  video: (typeof HERO_VIDEOS)[number];
  className?: string;
}) {
  return (
    <div className={`hero-media-cell${className ? ` ${className}` : ""}`}>
      <video
        src={video.src}
        poster={video.poster}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-label={video.alt}
      />
    </div>
  );
}

export function Hero() {
  const beforeOpening = isBeforeOfficialOpening();
  const [primary, secondaryTop, secondaryBottom] = HERO_VIDEOS;

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
            <a href="/#prenota" className="btn btn-dark">
              {HERO_CTA}
            </a>
            <a
              href={getWhatsAppUrl()}
              className="btn btn-outline"
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp
            </a>
            <a
              href={getMapsUrl()}
              className="btn btn-outline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Raggiungici ora
            </a>
          </div>
          <HeroCalendar />
        </div>
        <div className="hero-media reveal reveal-d1">
          {primary ? <HeroVideoCell video={primary} className="hero-media-cell--primary" /> : null}
          {secondaryTop ? (
            <HeroVideoCell video={secondaryTop} className="hero-media-cell--secondary" />
          ) : null}
          {secondaryBottom ? (
            <HeroVideoCell video={secondaryBottom} className="hero-media-cell--secondary" />
          ) : null}
        </div>
      </div>
    </section>
  );
}
