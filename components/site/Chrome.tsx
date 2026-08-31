"use client";

import { useEffect, useState } from "react";
import { SITE, SALON_CONTACT, getWhatsAppUrl } from "@/lib/site-config";

const LINKS = [
  { href: "/#about", label: "Chi siamo" },
  { href: "/#services", label: "Servizi" },
  { href: "/#gallery", label: "Galleria" },
  { href: `/#${SALON_CONTACT.id}`, label: "Scrivici" },
  { href: "/#contact", label: "Contatti" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      const mobile = window.matchMedia("(max-width: 899px)").matches;
      setHidden(!mobile && y > lastY && y > 120);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("nav-open", open);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("nav-open");
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <a className="skip-link" href="#main-content">
        Vai al contenuto
      </a>
      <header
        id="site-header"
        className={`site-header${scrolled ? " header-scrolled" : ""}${hidden && !open ? " header-hidden" : ""}`}
      >
        <a href="/#hero" className="header-logo">
          <img
            src="/assets/images/logo.png"
            alt="Felice Polese — Polese Barbershop"
            className="brand-logo brand-logo--sm"
            width={1209}
            height={823}
          />
          <span>{SITE.name}</span>
        </a>
        <nav aria-label="Principale">
          <ul className="nav-desktop">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href}>{l.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <a href="/#prenota" className="btn btn-gold btn-magnetic header-cta header-cta--live">
          Prenota ora
        </a>
        <button
          id="nav-toggle"
          className="nav-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="nav-panel"
          aria-label={open ? "Chiudi menu" : "Menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
      </header>
      <div
        id="nav-backdrop"
        className="nav-backdrop"
        aria-hidden={!open}
        onClick={() => setOpen(false)}
      />
      <nav id="nav-panel" className={`nav-panel${open ? " open" : ""}`} aria-label="Menu mobile">
        <ul>
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} onClick={() => setOpen(false)}>
                {l.label}
              </a>
            </li>
          ))}
          <li>
            <a href="/#prenota" className="nav-panel-cta" onClick={() => setOpen(false)}>
              Prenota ora
            </a>
          </li>
        </ul>
      </nav>
    </>
  );
}

export function WhatsAppFab() {
  return (
    <a
      id="wa-fab"
      className="wa-fab"
      href={getWhatsAppUrl()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Parla con il salone su WhatsApp"
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    </a>
  );
}

export function Footer() {
  return (
    <footer className="site-footer legal-footer">
      <div>
        <p>
          {SITE.name} | {SITE.addressFull}
        </p>
        <p>
          Tel. <a href={`tel:${SITE.phoneTel}`}>{SITE.phone}</a>
        </p>
        <p>
          C.F.: {SITE.fiscalCode} | P.IVA: {SITE.vatNumber}
        </p>
        <p>{SITE.pricesIncludeVat}</p>
      </div>
      <div className="footer-links">
        <a href="/privacy-policy">Privacy</a>
        <a href="/terms">Termini</a>
        <a href="/gestionale">Gestionale</a>
        <a href={SITE.instagram} target="_blank" rel="noopener noreferrer">
          {SITE.instagramHandle}
        </a>
      </div>
    </footer>
  );
}

export function ClientEffects() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll(".reveal"));
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -24px 0px" },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (window.matchMedia("(hover: none)").matches) return;
    const buttons = Array.from(document.querySelectorAll<HTMLElement>(".btn-magnetic"));
    const move = (e: MouseEvent) => {
      const btn = e.currentTarget as HTMLElement;
      const rect = btn.getBoundingClientRect();
      btn.style.setProperty("--mx", `${(e.clientX - rect.left - rect.width / 2) * 0.15}px`);
      btn.style.setProperty("--my", `${(e.clientY - rect.top - rect.height / 2) * 0.15}px`);
    };
    const leave = (e: MouseEvent) => {
      const btn = e.currentTarget as HTMLElement;
      btn.style.setProperty("--mx", "0px");
      btn.style.setProperty("--my", "0px");
    };
    buttons.forEach((btn) => {
      btn.addEventListener("mousemove", move);
      btn.addEventListener("mouseleave", leave);
    });
    return () => {
      buttons.forEach((btn) => {
        btn.removeEventListener("mousemove", move);
        btn.removeEventListener("mouseleave", leave);
      });
    };
  }, []);

  return null;
}
