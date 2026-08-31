"use client";

import { FormEvent, useEffect, useState } from "react";
import { SITE, getMapsUrl, getWhatsAppUrl, isComingSoon } from "@/lib/site-config";

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

export function Hero() {
  const soon = isComingSoon();
  const [remain, setRemain] = useState({ d: "00", h: "00", m: "00", s: "00", done: false });
  const [feedback, setFeedback] = useState("");

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

  return (
    <section id="hero" className="hero hero--soon bg-noise">
      <div className="hero-bg" />
      <div className="hero-glow" />
      {soon ? (
        <div className="hero-inner hero-inner--soon">
          <img
            src="/assets/images/logo.png"
            alt="Felice Polese — logo ufficiale Polese Barbershop"
            className="brand-logo brand-logo--hero"
            width={1209}
            height={823}
          />
          <p className="coming-soon-brand">{SITE.brand}</p>
          <h1 className="hero-title font-serif">Prossimamente</h1>
          <p className="hero-soon-msg">
            {SITE.name} si trasferisce in <strong>{SITE.address}</strong>, {SITE.city}.
            Lascia il tuo contatto: ti avvisiamo su WhatsApp all&apos;apertura del nuovo salone.
            Puoi già prenotare dal 1 settembre.
          </p>
          <div className="coming-soon-address">
            <span className="eyebrow">Nuova sede</span>
            <strong>{SITE.addressFull}</strong>
            <a className="map-link" href={getMapsUrl()} target="_blank" rel="noopener noreferrer">
              Google Maps →
            </a>
          </div>
          <div id="countdown" className="countdown" aria-live="polite">
            <div className="countdown-item">
              <span className="countdown-value">{remain.d}</span>
              <span className="countdown-label">Giorni</span>
            </div>
            <div className="countdown-item">
              <span className="countdown-value">{remain.h}</span>
              <span className="countdown-label">Ore</span>
            </div>
            <div className="countdown-item">
              <span className="countdown-value">{remain.m}</span>
              <span className="countdown-label">Min</span>
            </div>
            <div className="countdown-item">
              <span className="countdown-value">{remain.s}</span>
              <span className="countdown-label">Sec</span>
            </div>
            {remain.done ? <p className="countdown-done">Apertura imminente.</p> : null}
          </div>
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
      ) : (
        <div className="hero-inner hero-inner--live" style={{ display: "block" }}>
          <p className="eyebrow">{SITE.brand}</p>
          <h1 className="hero-title font-serif">{SITE.name}</h1>
          <p className="hero-text">{SITE.tagline}</p>
          <p className="hero-text">Taglio sartoriale, rasatura tradizionale e grooming premium a Benevento.</p>
          <div className="hero-actions">
            <a href="#prenota" className="btn btn-gold btn-magnetic">
              Prenota ora
            </a>
            <a href="#services" className="btn btn-outline btn-magnetic">
              Servizi
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
