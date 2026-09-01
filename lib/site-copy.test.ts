import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SITE,
  SALON_CONTACT,
  SALON_CONTACT_MESSAGE,
  ADMIN_EMAIL_FALLBACK,
  HERO_CTA,
  HERO_BEFORE_OPENING,
  getWhatsAppUrl,
  getMailtoUrl,
  getHeroHeadline,
  getBookingConfirmWhatsAppUrl,
  getSocialChannels,
  getWhatsAppChatUrl,
  getPrenotaUrl,
  getMapsUrl,
  MAPS_DESTINATION,
  CANCEL_HOURS_BEFORE,
  CANCEL_NOTICE_IT,
  BOOKING_UI_DAYS,
  HERO_CALENDAR_DAYS,
  IS_COMING_SOON,
  NOTIFY_WHATSAPP_MESSAGE,
} from "./site-config";

const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "coverage", "out", ".vercel"]);
const SOURCE_EXT = /\.(ts|tsx|js|jsx|html|txt|xml|css|json|sql|cmd)$/;

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      walk(path, acc);
    } else if (SOURCE_EXT.test(name) && name !== "package-lock.json") {
      acc.push(path);
    }
  }
  return acc;
}

describe("public copy vs official identity", () => {
  it("uses Felice Polese Barber Shop as the official site name", () => {
    expect(SITE.name).toBe("Felice Polese Barber Shop");
    expect(SITE.legalName).toBe("Felice Polese Barber Shop");
    expect(SITE.brand).toBe("FELICE POLESE");
    expect(SITE.seo.description).toMatch(/Felice Polese Barber Shop/);
    expect(NOTIFY_WHATSAPP_MESSAGE).toMatch(/Felice Polese Barber Shop/);
  });

  it("uses MODERN BARBERING tagline and premium listino with PRENOTA links", () => {
    const listino = readFileSync(join(process.cwd(), "components/booking/ServiceListino.tsx"), "utf8");
    expect(listino).toMatch(/listino-card/);
    expect(listino).toMatch(/serviceBookingHref/);
    expect(listino).toMatch(/Prenota/);
    const intro = readFileSync(join(process.cwd(), "components/site/ScissorsIntro.tsx"), "utf8");
    expect(intro).not.toMatch(/OpeningCountdown/);
    expect(intro).toMatch(/scissors-intro-brand/);
    expect(intro).toMatch(/Clicca per entrare/);
    expect(intro).toMatch(/finishIntro\(\)/);
    expect(intro).not.toMatch(/phase !== "dark"/);
    expect(SITE.tagline).toBe("MODERN BARBERING & FADE STUDIO");
  });

  it("uses the official phone, address, CF and P.IVA", () => {
    expect(SITE.phone).toBe("+39 351 252 3087");
    expect(SITE.address).toBe("Corso Dante 45");
    expect(SITE.openingDate).toBe("2026-09-07");
    expect(SITE.fiscalCode).toBe("PLSFLC04S21A783K");
    expect(SITE.vatNumber).toBe("01894030624");
    expect(SITE.previousAddress).toBe("ex Via Ungaretti 6");
    expect(SITE.pricesIncludeVat).toMatch(/IVA inclusa/);
  });

  it("uses Felice Polese Gmail as salon email, not the GitHub Gmail", () => {
    expect(SITE.email).toBe("felicepolese550@gmail.com");
    expect(ADMIN_EMAIL_FALLBACK).toBe("felicepolese550@gmail.com");
    expect(getMailtoUrl()).toContain("mailto:felicepolese550@gmail.com");
    expect(SITE.email).not.toBe("mandalinomc@gmail.com");
  });

  it("has no leftover old phone, wrong address, or banned copy in source", () => {
    const files = walk(process.cwd());
    const banned = [
      /327\s*015\s*6225/,
      /Corso Dante Alighieri, 44/,
      /Corso Dante Alighieri 44/,
      /Combo premium/,
      /dermatolog/i,
      /caduta capelli/i,
      /Parla con il salone/i,
      /parlare con il salone/i,
      /mandalinomc@gmail\.com/,
      /200\s+prenotazioni/i,
      /limite\s+di\s+200/i,
      /hero--marble/,
      /hero-bg\.webp/,
      /Menu grooming/i,
      /grooming premium/i,
    ];
    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const re of banned) {
        if (re.test(text) && !/\.test\.ts$/.test(file)) {
          hits.push(`${file}: ${re}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });

  it("uses a generic salon contact message without specialist consult language", () => {
    expect(SALON_CONTACT.title).toBe("Scrivici");
    expect(SALON_CONTACT.id).toBe("scrivici");
    expect(SALON_CONTACT.prefill).toBe(SALON_CONTACT_MESSAGE);
    expect(SALON_CONTACT_MESSAGE).toBe(
      "Ciao, vorrei un'informazione su orari, prezzi o servizi.",
    );
    expect(SALON_CONTACT.body).toMatch(/info, orari, prezzi/i);
    expect(getWhatsAppUrl()).toContain(encodeURIComponent(SALON_CONTACT_MESSAGE));
    expect(SALON_CONTACT.body + SALON_CONTACT.title + SALON_CONTACT_MESSAGE).not.toMatch(
      /tricolog|dermatolog|caduta|parla con il salone/i,
    );
  });

  it("keeps ADMIN_PASSWORD out of tracked files", () => {
    const gitignore = readFileSync(join(process.cwd(), ".gitignore"), "utf8");
    expect(gitignore).toMatch(/^\.env\.local$/m);
    const example = readFileSync(join(process.cwd(), ".env.example"), "utf8");
    expect(example).toMatch(/^ADMIN_PASSWORD=$/m);
    expect(example).toMatch(/^ADMIN_USER=$/m);
    expect(example).not.toMatch(/ADMIN_PASSWORD=admin/);
  });

  it("keeps the public header free of CRM chrome", () => {
    const chrome = readFileSync(join(process.cwd(), "components/site/Chrome.tsx"), "utf8");
    const header = chrome.slice(0, chrome.indexOf("export function WhatsAppFab"));
    expect(header).not.toMatch(/gestionale/i);
    expect(header).not.toMatch(/Dashboard/);
    expect(chrome).toMatch(/href="\/gestionale"/);
  });

  it("keeps shop WhatsApp on wa.me/393512523087 without Twilio", () => {
    expect(SITE.whatsapp).toBe("393512523087");
    expect(SITE.phone).toBe("+39 351 252 3087");
    expect(getWhatsAppUrl()).toMatch(/^https:\/\/wa\.me\/393512523087\?text=/);
    const confirm = getBookingConfirmWhatsAppUrl({
      firstName: "Mario",
      service: "Taglio classico",
      dateLabel: "martedì 1 settembre 2026",
      timeLabel: "09:30",
      barberName: "Felice",
    });
    expect(confirm).toMatch(/^https:\/\/wa\.me\/393512523087\?text=/);
    expect(confirm).toContain(encodeURIComponent("ho prenotato"));
    const chrome = readFileSync(join(process.cwd(), "components/site/Chrome.tsx"), "utf8");
    expect(chrome).toMatch(/getWhatsAppUrl/);
    const wizard = readFileSync(join(process.cwd(), "components/booking/FreshaBookingFlow.tsx"), "utf8");
    expect(wizard).toMatch(/getBookingConfirmWhatsAppUrl/);
    expect(wizard).not.toMatch(/twilio/i);
    const crm = readFileSync(join(process.cwd(), "components/gestionale/GestionalePanel.tsx"), "utf8");
    expect(crm).toMatch(/waMeUrl/);
    expect(crm).toMatch(/niente Twilio/);
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
    };
    expect(pkg.dependencies?.twilio).toBeUndefined();
  });

  it("defaults to live site with July 3 marble layout and booking", () => {
    expect(IS_COMING_SOON).toBe(false);
    expect(NOTIFY_WHATSAPP_MESSAGE).toMatch(/avvisato all'apertura/i);
    const coming = readFileSync(join(process.cwd(), "components/site/ComingSoon.tsx"), "utf8");
    expect(coming).toMatch(/OpeningCountdown/);
    expect(coming).toMatch(/Avvisami su WhatsApp/);
    const page = readFileSync(join(process.cwd(), "app/page.tsx"), "utf8");
    expect(page).toMatch(/IS_COMING_SOON/);
    expect(page).toMatch(/ComingSoon/);
    expect(page).toMatch(/LandingSections/);
    expect(page).toMatch(/Hero/);
    expect(page).toMatch(/ScissorsIntro/);
    const landing = readFileSync(join(process.cwd(), "components/site/LandingSections.tsx"), "utf8");
    expect(landing).toMatch(/id="about"/);
    expect(landing).not.toMatch(/id="services"/);
    expect(landing).toMatch(/id="prenota"/);
    expect(landing).toMatch(/I nostri servizi/);
    expect(landing).toMatch(/FreshaBookingFlow/);
    expect(landing).not.toMatch(/services-grid/);
    expect(landing).toMatch(/VideoReelGrid/);
    expect(landing).not.toMatch(/gallery-grid/);
    expect(landing).not.toMatch(/fresha-/);
    expect(landing).toMatch(/bg-marble-light/);
    expect(landing).not.toMatch(/section-dark/);
  });

  it("keeps July 3 section order without Marcel rebuild extras", () => {
    const landing = readFileSync(join(process.cwd(), "components/site/LandingSections.tsx"), "utf8");
    expect(landing).not.toMatch(/Consulenza in sede/);
    expect(landing).not.toMatch(/id="consulenza"/);
    expect(landing).toMatch(/Barber Match 2023/);
    const catalog = readFileSync(join(process.cwd(), "lib/catalog.ts"), "utf8");
    expect(catalog).toMatch(/Consulenza Tricologica/i);
    expect(landing).toMatch(/VideoReelGrid/);
    expect(landing).toMatch(/FELICE_WORKING_VIDEO/);
    expect(landing).toMatch(/about-video/);
    expect(landing).not.toMatch(/gallery-grid/);
    expect(landing).not.toMatch(/fresha-/);
    expect(landing).toMatch(/ServiceListino/);
    expect(landing).not.toMatch(/hero-bg\.jpg/);
    expect(landing).not.toMatch(/brand-products\.jpg/);
    const wizard = readFileSync(join(process.cwd(), "components/booking/FreshaBookingFlow.tsx"), "utf8");
    expect(wizard).toMatch(/appointment-sidebar/);
    expect(wizard).toMatch(/Il tuo appuntamento/);
    const reel = readFileSync(join(process.cwd(), "components/site/VideoReelGrid.tsx"), "utf8");
    expect(reel).toMatch(/id="gallery"/);
    expect(reel).toMatch(/SalonVideo/);
    expect(reel).not.toMatch(/<img/);
    expect(reel).not.toMatch(/reveal/);
    const landingVideo = readFileSync(join(process.cwd(), "components/site/LandingSections.tsx"), "utf8");
    expect(landingVideo).toMatch(/FELICE_WORKING_VIDEO/);
    expect(landingVideo).toMatch(/felice-video-hero/);
    const hero = readFileSync(join(process.cwd(), "components/site/Hero.tsx"), "utf8");
    expect(hero).toMatch(/hero--soon/);
    expect(hero).toMatch(/bg-marble-light/);
    expect(hero).not.toMatch(/hero-editorial/);
    expect(hero).not.toMatch(/ScissorsIntro/);
  });

  it("shows live hero with booking CTA before and after opening", () => {
    expect(HERO_CTA).toBe("Prenota il tuo appuntamento");
    expect(HERO_BEFORE_OPENING).toBe("Prenota il tuo appuntamento per l'apertura");
    expect(getHeroHeadline(new Date("2026-08-31T18:00:00+02:00"))).toBe(HERO_BEFORE_OPENING);
    expect(getHeroHeadline(new Date("2026-09-08T10:00:00+02:00"))).toBe(HERO_CTA);
    const hero = readFileSync(join(process.cwd(), "components/site/Hero.tsx"), "utf8");
    expect(hero).toMatch(/getHeroHeadline/);
    expect(hero).toMatch(/HERO_PRE_OPENING_EYEBROW/);
    expect(hero).toMatch(/Raggiungimi ora su Google Maps/);
    const layout = readFileSync(join(process.cwd(), "app/layout.tsx"), "utf8");
    expect(layout).toMatch(/mode-coming-soon|mode-live/);
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toMatch(/marble\.png/);
    expect(css).toMatch(/marble-texture/);
    expect(css).toMatch(/bg-marble-light/);
    expect(css).toMatch(/scissors-intro/);
    expect(css).toMatch(/bg-marble-light \.countdown-value/);
    expect(css).not.toMatch(/scissors-intro-split[\s\S]*marble\.png/);
    const scissors = readFileSync(join(process.cwd(), "components/site/ScissorsIcon.tsx"), "utf8");
    expect(scissors).toMatch(/viewBox="0 0 100 110"/);
    expect(scissors).not.toMatch(/#C9A962|#F4E4BC/);
    expect(css).not.toMatch(/\.video-reel-box:hover[\s\S]*transform:/);
  });

  it("puts contact info and maps link in July 3 contact section", () => {
    expect(SITE.hours.weekdays).toBe("Mar — Sab · 09:30 — 20:00");
    expect(SITE.hours.monday).toMatch(/Chiuso/);
    expect(SITE.hours.sunday).toMatch(/Chiuso/);
    expect(SITE.instagramHandle).toBe("@felicepolese_barber");
    expect(SITE.instagram).toBe("https://instagram.com/felicepolese_barber");
    expect(getWhatsAppChatUrl()).toBe("https://wa.me/393512523087");
    expect(getPrenotaUrl()).toMatch(/\/#prenota$/);
    const channels = getSocialChannels();
    expect(channels.map((c) => c.id)).toEqual(["instagram", "whatsapp", "prenota"]);
    expect(channels[1]?.qrPayload).toBe("https://wa.me/393512523087");
    expect(channels[2]?.label).toBe(HERO_CTA);
    for (const ch of channels) {
      const file = join(process.cwd(), "public", ch.qr.replace(/^\//, ""));
      expect(statSync(file).isFile()).toBe(true);
      expect(statSync(file).size).toBeGreaterThan(2000);
    }
    const contact = readFileSync(join(process.cwd(), "components/site/LandingSections.tsx"), "utf8");
    expect(contact).toMatch(/id="contact"/);
    expect(contact).toMatch(/Raggiungimi ora su Google Maps/);
    expect(contact).toMatch(/SITE\.hours/);
    const chrome = readFileSync(join(process.cwd(), "components/site/Chrome.tsx"), "utf8");
    expect(chrome).toMatch(/SITE_PDFS\.logo/);
    expect(chrome).toMatch(/SITE_PDFS\.hoursPanel/);
    expect(chrome).toMatch(/href="\/gestionale"/);
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toMatch(/\.wa-fab/);
  });

  it("does not cap total bookings — wizard shows many open days", () => {
    expect(BOOKING_UI_DAYS).toBeGreaterThan(16);
    expect(HERO_CALENDAR_DAYS).toBeGreaterThanOrEqual(12);
    const wizard = readFileSync(join(process.cwd(), "components/booking/FreshaBookingFlow.tsx"), "utf8");
    expect(wizard).toMatch(/BOOKING_UI_DAYS/);
    expect(wizard).toMatch(/alcun limite al numero totale/i);
    const crm = readFileSync(join(process.cwd(), "app/api/admin/crm/route.ts"), "utf8");
    expect(crm).toMatch(/fetchAllPages/);
    expect(crm).not.toMatch(/\.limit\(4000\)/);
  });

  it("stacks a Maps FAB Raggiungimi ora to Corso Dante 45", () => {
    expect(CANCEL_HOURS_BEFORE).toBe(1);
    expect(MAPS_DESTINATION).toBe("Corso Dante 45, 82100 Benevento");
    expect(getMapsUrl()).toContain("maps.google.com");
    expect(getMapsUrl()).toContain("destination=");
    expect(getMapsUrl()).toContain(encodeURIComponent("Corso Dante 45"));
    expect(CANCEL_NOTICE_IT).toBe("1 ora");
    const chrome = readFileSync(join(process.cwd(), "components/site/Chrome.tsx"), "utf8");
    expect(chrome).toMatch(/id="maps-fab"/);
    expect(chrome).toMatch(/aria-label="Raggiungimi ora su Google Maps"/);
    expect(chrome).toMatch(/Raggiungimi ora su Google Maps — Corso Dante 45/);
    expect(chrome).toMatch(/fab-stack/);
    expect(chrome).toMatch(/<MapsFab \/>/);
    expect(chrome).toMatch(/<WhatsAppFab \/>/);
    const stack = chrome.slice(chrome.indexOf("fab-stack"));
    expect(stack.indexOf("<MapsFab")).toBeLessThan(stack.indexOf("<WhatsAppFab"));
    const page = readFileSync(join(process.cwd(), "app/page.tsx"), "utf8");
    expect(page).toMatch(/SiteFabs/);
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toMatch(/\.maps-fab \{/);
    const hero = readFileSync(join(process.cwd(), "components/site/Hero.tsx"), "utf8");
    expect(hero).toMatch(/Raggiungimi ora su Google Maps/);
    const terms = readFileSync(join(process.cwd(), "app/terms/page.tsx"), "utf8");
    expect(terms).toMatch(/CANCEL_NOTICE_IT/);
    expect(terms).not.toMatch(/24h|24 ore/);
  });
});
