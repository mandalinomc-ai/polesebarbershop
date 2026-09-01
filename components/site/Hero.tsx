"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  SITE,
  IS_COMING_SOON,
  getMapsUrl,
  getWhatsAppUrl,
  getHeroHeadline,
  HERO_PRE_OPENING_EYEBROW,
  isBeforeOfficialOpening,
} from "@/lib/site-config";
import { OpeningCountdown } from "@/components/site/OpeningCountdown";

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

export function Hero() {
  const soon = IS_COMING_SOON;
  const [remain, setRemain] = useState({ d: "00", h: "00", m: "00", s: "00", done: false });
  const [feedback, setFeedback] = useState("");
  const [beforeOpening, setBeforeOpening] = useState(true);

  useEffect(() => {
    setBeforeOpening(isBeforeOfficialOpening());
    const id = setInterval(() => setBeforeOpening(isBeforeOfficialOpening()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!soon) return;
    const target = Date.parse(`${SITE.openingDate}T10:00:00+02:00`);
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setRemain({ d: "00", h: "00", m: "00", s: "00", done: true });
        return;
      }
      setRemain({
        d: pad(Math.floor(diff / 86400000)),
        h: pad(Math.floor((diff % 86400000) / 3600000)),
        m: pad(Math.floor((diff % 3600000) / 60000)),
        s: pad(Math.floor((diff % 60000) / 1000)),
        done: false,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [soon]);

  function onNotify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value.trim();
    const contact = (form.elements.namedItem("contact") as HTMLInputElement).value.trim();
    if (!name || !contact) return;
    const msg =
      `Ciao, vorrei essere avvisato all'apertura del nuovo ${SITE.name} in ${SITE.address}, ${SITE.city}.\n\n` +
      `Nome: ${name}\nWhatsApp: ${contact}`;
    window.open(getWhatsAppUrl(msg), "_blank", "noopener,noreferrer");
    setFeedback("Perfetto! Completa l'invio su WhatsApp.");
    form.reset();
  }

  if (soon) {
    return (
      <section id="hero" className="hero hero--soon bg-marble-light">
        <div className="hero-inner hero-inner--soon">
          <img
            src="/assets/images/logo.png"
            alt="Felice Polese — logo ufficiale Felice Polese Barber Shop"
            className="brand-logo brand-logo--hero"
            width={512}
            height={331}
          />
          <p className="coming-soon-brand">{SITE.brand}</p>
          <h1 className="hero-title font-serif">Prossimamente</h1>
          <p className="hero-soon-msg">
            {SITE.name} si trasferisce in <strong>{SITE.address}</strong>, {SITE.city}.
            Lascia il tuo contatto: ti avvisiamo su WhatsApp all&apos;apertura del nuovo salone.
          </p>
          <div className="coming-soon-address">
            <span className="eyebrow">Nuova sede</span>
            <strong>{SITE.addressFull}</strong>
            <a className="map-link" href={getMapsUrl()} target="_blank" rel="noopener noreferrer">
              📍 Raggiungimi ora su Google Maps
            </a>
          </div>
          <OpeningCountdown />
          <form id="notify-form" className="notify-form" onSubmit={onNotify} noValidate>
            <p className="eyebrow" id="hero-notify">
              Resta aggiornato su WhatsApp
            </p>
            <input className="input-lux" type="text" name="name" placeholder="Il tuo nome" required autoComplete="name" />
            <input className="input-lux" type="tel" name="contact" placeholder="Numero WhatsApp" required autoComplete="tel" />
            <button type="submit" className="btn btn-gold btn-magnetic">
              Avvisami all&apos;apertura
            </button>
            {feedback ? (
              <p className="notify-feedback" role="status">
                {feedback}
              </p>
            ) : null}
          </form>
          <div className="hero-soon-social">
            <a href={SITE.instagram} target="_blank" rel="noopener noreferrer">
              {SITE.instagramHandle}
            </a>
          </div>
        </div>
      </section>
    );
  }

  const ctaLabel = getHeroHeadline();

  return (
    <section id="hero" className="hero hero--soon bg-marble-light">
      <div className="hero-inner hero-inner--live">
        <img
          src="/assets/images/logo.png"
          alt="Felice Polese — logo ufficiale Felice Polese Barber Shop"
          className="brand-logo brand-logo--hero"
          width={512}
          height={331}
        />
        <p className="eyebrow hero-brand">{SITE.brand}</p>
        <h1 className="hero-title font-serif">{SITE.name}</h1>
        <p className="hero-text hero-tagline">{SITE.tagline}</p>
        <p className="hero-text hero-city">{SITE.city} · Italy</p>
        {beforeOpening ? (
          <p className="hero-pre-opening">{HERO_PRE_OPENING_EYEBROW}</p>
        ) : null}
        {beforeOpening ? <OpeningCountdown /> : null}
        <div className="hero-actions">
          <a href="/#prenota" className="btn btn-gold btn-magnetic">
            {ctaLabel}
          </a>
          <a href="/#prenota" className="btn btn-outline btn-magnetic">
            Servizi
          </a>
          <a
            href={getMapsUrl()}
            className="btn btn-outline btn-magnetic"
            target="_blank"
            rel="noopener noreferrer"
          >
            📍 Raggiungimi ora su Google Maps
          </a>
        </div>
      </div>
    </section>
  );
}
