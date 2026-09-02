"use client";

import {
  HERO_LEAD,
  HERO_MENU_CTA,
  HERO_PRE_OPENING_EYEBROW,
  HERO_SENTENCE,
  HERO_SLOT_CTA,
  SITE,
  getHeroHeadline,
  isBeforeOfficialOpening,
} from "@/lib/site-config";
import { HERO_VIDEOS } from "@/lib/site-videos";

function HeroMediaCell({
  video,
}: {
  video: (typeof HERO_VIDEOS)[number];
}) {
  return (
    <div className="hero-media-cell">
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-label={video.alt}
      >
        <source src={video.src} type="video/mp4" />
      </video>
    </div>
  );
}

export function Hero() {
  const beforeOpening = isBeforeOfficialOpening();

  return (
    <section id="hero" className="hero hero-editorial bg-marble-light marble-accent">
      <div className="hero-grid">
        <div className="hero-copy reveal">
          <p className="eyebrow hero-brand-line">
            {SITE.brand} — {SITE.tagline}
          </p>
          <h1 className="hero-title font-serif">{HERO_SENTENCE}</h1>
          <p className="hero-text">{HERO_LEAD}</p>
          {beforeOpening ? (
            <p className="hero-pre-opening">{HERO_PRE_OPENING_EYEBROW}</p>
          ) : null}
          <div className="hero-actions">
            <a href="/#prenota" className="btn btn-ink btn-dark" aria-label={getHeroHeadline()}>
              {HERO_SLOT_CTA}
            </a>
            <a href="/#trattamenti" className="btn btn-ghost">
              {HERO_MENU_CTA}
            </a>
          </div>
        </div>
        <div className="hero-media">
          {HERO_VIDEOS.map((video) => (
            <HeroMediaCell key={video.id} video={video} />
          ))}
        </div>
      </div>
    </section>
  );
}
