import {
  SITE,
  getMapsUrl,
  getWhatsAppUrl,
  HERO_CTA,
  getHeroHeadline,
  isBeforeOfficialOpening,
} from "@/lib/site-config";
import { formatItalianDate } from "@/lib/availability";
import { HeroCalendar } from "@/components/site/HeroCalendar";

export function Hero() {
  const beforeOpening = isBeforeOfficialOpening();
  return (
    <section id="hero" className="hero hero--story bg-noise">
      <div className="hero-bg" />
      <div className="hero-glow" />
      <div className="hero-inner hero-inner--live">
        <img
          src="/assets/images/logo.png"
          alt="Felice Polese — logo ufficiale Polese Barbershop"
          className="brand-logo brand-logo--hero"
          width={512}
          height={331}
        />
        <p className="eyebrow">{SITE.brand}</p>
        <h1 className="hero-title font-serif">{SITE.name}</h1>
        <p className="hero-kicker">{getHeroHeadline()}</p>
        <p className="hero-text">
          {beforeOpening
            ? `Apriamo il ${formatItalianDate(SITE.openingDate)} in ${SITE.address}, ${SITE.city}. Il calendario è già aperto: scegli un giorno e prenota online.`
            : `Felice e Davide — taglio, barba, colore e trattamenti a ${SITE.address}, ${SITE.city}.`}
        </p>
        <div className="hero-actions">
          <a href="/#prenota" className="btn btn-gold btn-magnetic hero-cta-primary">
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
          <a href={getMapsUrl()} className="btn btn-outline btn-magnetic" target="_blank" rel="noopener noreferrer">
            Maps
          </a>
        </div>
        <HeroCalendar />
      </div>
    </section>
  );
}
