import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SITE,
  SALON_CONTACT,
  SALON_CONTACT_MESSAGE,
  ADMIN_EMAIL_FALLBACK,
  HERO_CTA,
  HERO_SLOT_CTA,
  HERO_SENTENCE,
  HERO_BEFORE_OPENING,
  getWhatsAppUrl,
  getMailtoUrl,
  getHeroHeadline,
  getBookingConfirmWhatsAppUrl,
  getCustomerConfirmMessage,
  getSalonToCustomerWhatsAppUrl,
  getSocialChannels,
  getWhatsAppChatUrl,
  getPrenotaUrl,
  getMapsUrl,
  MAPS_DESTINATION,
  CANCEL_MINUTES_BEFORE,
  CANCEL_NOTICE_IT,
  BOOKING_UI_DAYS,
  HERO_CALENDAR_DAYS,
  IS_COMING_SOON,
  NOTIFY_WHATSAPP_MESSAGE,
  getSalonNotifyWhatsApp,
  SALON_NOTIFY_WHATSAPP_FALLBACK,
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

  it("uses MODERN BARBERING tagline and listino price boxes with PRENOTA CTA", () => {
    const listino = readFileSync(join(process.cwd(), "components/booking/ServiceListino.tsx"), "utf8");
    expect(listino).toMatch(/listino-box/);
    expect(listino).toMatch(/serviceBookingHref/);
    expect(listino).toMatch(/formatDuration/);
    expect(listino).toMatch(/btn-listino-prenota/);
    expect(listino).toMatch(/Prenota/);
    expect(SITE.tagline).toBe("MODERN BARBERING & FADE STUDIO");
    const layout = readFileSync(join(process.cwd(), "app/layout.tsx"), "utf8");
    expect(layout).toMatch(/Plus_Jakarta_Sans/);
    expect(layout).toMatch(/fonts\.googleapis\.com/);
    expect(layout).toMatch(/SITE_DOCUMENT_TITLE/);
  });

  it("uses the official phone, address, CF and P.IVA", () => {
    expect(SITE.phone).toBe("+39 327 015 6225");
    expect(SITE.whatsapp).toBe("393270156225");
    expect(SITE.address).toBe("Corso Dante Alighieri, 44");
    expect(SITE.openingDate).toBe("2026-09-07");
    expect(SITE.fiscalCode).toBe("PLSFLC04S21A783K");
    expect(SITE.vatNumber).toBe("01894030624");
    expect(SITE.previousAddress).toBe("ex Via Ungaretti 6");
    expect(SITE.pricesIncludeVat).toMatch(/IVA inclusa/);
    expect(getSalonNotifyWhatsApp()).toBe(SALON_NOTIFY_WHATSAPP_FALLBACK);
    expect(getSalonNotifyWhatsApp()).toBe("+393270156225");
    expect(getSalonNotifyWhatsApp()).not.toBe("+393512523087");
    expect(getSalonNotifyWhatsApp()).not.toMatch(/351/);
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
      /Corso Dante 45/,
      /Alighieri, 45/,
      /Dante 45/,
      /Combo premium/,
      /dermatolog/i,
      /caduta capelli/i,
      /Parla con il salone/i,
      /parlare con il salone/i,
      /mandalinomc@gmail\.com/,
      /200\s+prenotazioni/i,
      /limite\s+di\s+200/i,
      /hero--marble/,
      /393512523087/,
      /351\s*252\s*3087/,
      /\+39\s*351/,
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
    const publicUi = files.filter((file) =>
      /\/(components\/site|components\/booking\/FreshaBookingFlow)/.test(file),
    );
    const publicHits: string[] = [];
    for (const file of publicUi) {
      if (/351\s*252\s*3087|393512523087/.test(readFileSync(file, "utf8"))) publicHits.push(file);
    }
    expect(publicHits).toEqual([]);
  });

  it("uses a generic salon contact message without specialist consult language", () => {
    expect(SALON_CONTACT.title).toBe("Scrivici");
    expect(SALON_CONTACT.id).toBe("scrivici");
    expect(SALON_CONTACT.prefill).toBe(SALON_CONTACT_MESSAGE);
    expect(SALON_CONTACT_MESSAGE).toBe(
      "Ciao, vorrei informazioni su orari, prezzi o servizi.",
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

  it("keeps shop WhatsApp on wa.me/393270156225 without Twilio", () => {
    expect(SITE.whatsapp).toBe("393270156225");
    expect(SITE.phone).toBe("+39 327 015 6225");
    expect(getWhatsAppUrl()).toMatch(/^https:\/\/wa\.me\/393270156225\?text=/);
    const confirm = getBookingConfirmWhatsAppUrl({
      firstName: "Mario",
      lastName: "Rossi",
      phone: "+393331112233",
      email: "mario@example.com",
      service: "Taglio classico",
      dateLabel: "martedì 1 settembre 2026",
      timeLabel: "09:30",
      barberName: "Felice",
      durationMin: 50,
      priceLabel: "25 €",
    });
    expect(confirm).toMatch(/^https:\/\/wa\.me\/393270156225\?text=/);
    expect(confirm).toContain(encodeURIComponent("NUOVA PRENOTAZIONE"));
    expect(confirm).toContain(encodeURIComponent("Nome: Mario"));
    const toClient = getSalonToCustomerWhatsAppUrl("+39 333 111 2233", {
      firstName: "Mario",
      service: "Taglio classico",
      dateLabel: "martedì 1 settembre 2026",
      timeLabel: "09:30",
      barberName: "Felice",
    });
    expect(toClient).toMatch(/^https:\/\/wa\.me\/393331112233\?text=/);
    expect(toClient).toContain(encodeURIComponent("la tua prenotazione"));
    expect(getCustomerConfirmMessage({
      firstName: "Mario",
      service: "Taglio classico",
      dateLabel: "martedì 1 settembre 2026",
      timeLabel: "09:30",
      barberName: "Felice",
    })).toMatch(/Ciao Mario, la tua prenotazione/);
    const chrome = readFileSync(join(process.cwd(), "components/site/Chrome.tsx"), "utf8");
    expect(chrome).toMatch(/getWhatsAppUrl/);
    const wizard = readFileSync(join(process.cwd(), "components/booking/FreshaBookingFlow.tsx"), "utf8");
    expect(wizard).not.toMatch(/postSalonBookingRelay/);
    expect(wizard).not.toMatch(/Conferma su WhatsApp/);
    expect(wizard).toMatch(/Prenotazione confermata/);
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
    expect(landing).not.toMatch(/Tradizione/);
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

  it("keeps bio+Felice video, then reels, then one listino and contact", () => {
    const landing = readFileSync(join(process.cwd(), "components/site/LandingSections.tsx"), "utf8");
    expect(landing).not.toMatch(/Consulenza in sede/);
    expect(landing).not.toMatch(/id="consulenza"/);
    expect(landing).toMatch(/id="about"/);
    expect(landing).toMatch(/Barber Match 2023/);
    expect(landing).toMatch(/giovane talento/i);
    expect(landing).not.toMatch(/Tradizione/);
    expect(landing).not.toMatch(/Santa Maria degli Angeli/);
    const catalog = readFileSync(join(process.cwd(), "lib/catalog.ts"), "utf8");
    expect(catalog).not.toMatch(/Consulenza Tricologica/i);
    expect(catalog).not.toMatch(/Tintura Nero/);
    expect(catalog).not.toMatch(/name: "Razor Taper"/);
    expect(catalog).not.toMatch(/name: "Skin Fade"/);
    expect(catalog).not.toMatch(/id: "combo-classico"/);
    expect(landing).toMatch(/VideoReelGrid/);
    expect(landing).toMatch(/FELICE_WORKING_VIDEO/);
    expect(landing).toMatch(/about-video/);
    expect(landing).toMatch(/felice-video-hero/);
    expect(landing).not.toMatch(/gallery-grid/);
    expect(landing).not.toMatch(/fresha-/);
    expect(landing).toMatch(/ServiceListino/);
    expect((landing.match(/<ServiceListino/g) || []).length).toBe(1);
    expect(landing).toMatch(/listinoBeside/);
    expect(landing).not.toMatch(/id="listino"/);
    expect(landing).not.toMatch(/id="services"/);
    expect(landing).not.toMatch(/hero-bg\.jpg/);
    expect(landing).not.toMatch(/brand-products\.jpg/);
    const aboutIdx = landing.indexOf('id="about"');
    const videoIdx = landing.indexOf("<VideoReelGrid");
    const prenotaIdx = landing.indexOf('id="prenota"');
    const socialIdx = landing.indexOf('id="social"');
    const contactIdx = landing.indexOf('id="contact"');
    expect(aboutIdx).toBeGreaterThan(-1);
    expect(videoIdx).toBeGreaterThan(aboutIdx);
    expect(prenotaIdx).toBeGreaterThan(videoIdx);
    expect(socialIdx).toBeGreaterThan(prenotaIdx);
    expect(contactIdx).toBeGreaterThan(socialIdx);
    expect(landing).toMatch(/SocialQrGrid/);
    expect(landing).toMatch(/Resta in contatto/);
    const wizard = readFileSync(join(process.cwd(), "components/booking/FreshaBookingFlow.tsx"), "utf8");
    expect(wizard).toMatch(/appointment-sidebar/);
    expect(wizard).toMatch(/Il tuo appuntamento/);
    expect(wizard).toMatch(/listinoBeside/);
    expect(wizard).toMatch(/BOOKING_SERVICE_EVENT/);
    expect(wizard).toMatch(/Tocca i servizi nel listino/);
    expect(wizard).not.toMatch(/nel wizard/i);
    expect(wizard).toMatch(/Qualsiasi disponibilità/);
    expect(wizard).toMatch(/booking-note-headline/);
    expect(wizard).toMatch(/booking-note-blocks/);
    expect(wizard).toMatch(/booking-note-block/);
    expect(wizard).toMatch(/Illimitate/);
    expect(wizard).toMatch(/durata prevista si (aggiorna|somma)/i);
    expect(wizard).not.toMatch(/Durata non definita|niente durata inventata|senza durata nota|durationUnknown/i);
    expect(wizard).toMatch(/Scegli la data/);
    expect(wizard).toMatch(/Scegli l&apos;orario/);
    expect(wizard).toMatch(/\/api\/availability/);
    expect(wizard).toMatch(/Riprova/);
    expect(wizard).toMatch(/publicAvailabilityMessage|CALENDAR_UNAVAILABLE_IT/);
    expect(wizard).toMatch(/setStep\(1\)/);
    const reel = readFileSync(join(process.cwd(), "components/site/VideoReelGrid.tsx"), "utf8");
    expect(reel).toMatch(/id="gallery"/);
    expect(reel).toMatch(/SalonVideo/);
    expect(reel).toMatch(/SERVICE_SHOWCASE_VIDEOS/);
    expect(reel).toMatch(/Ogni trattamento con il suo media/);
    expect(reel).toMatch(/service-price-on-media/);
    expect(reel).toMatch(/FillCoverImage/);
    expect(reel).not.toMatch(/Tintura Nero/);
    expect(reel).toMatch(/CUTTING_TECHNIQUE_VIDEOS/);
    expect(reel).toMatch(/Sfumature/);
    expect(reel).toMatch(/Prenota il tuo taglio/);
    expect(reel).toMatch(/formatPriceRange/);
    expect(reel).toMatch(/serviceBookingHref/);
    expect(reel).not.toMatch(/reveal/);
    const videos = readFileSync(join(process.cwd(), "lib/site-videos.ts"), "utf8");
    expect(videos).toMatch(/Razor Fade — Tecnica di sfumatura/);
    expect(videos).toMatch(/Taper Fade — Tecnica di sfumatura/);
    expect(videos).toMatch(/Burst Fade — Tecnica di sfumatura/);
    expect(videos).not.toMatch(/id: "razor-taper"/);
    expect(videos).not.toMatch(/id: "skin-fade"/);
    const chrome = readFileSync(join(process.cwd(), "components/site/Chrome.tsx"), "utf8");
    expect(chrome).toMatch(/href: "\/#gallery", label: "Sfumature"/);
    expect(chrome).toMatch(/href: "\/#listino", label: "Listino"/);
    expect(chrome).not.toMatch(/label: "Fade"/);
    expect(chrome).not.toMatch(/label: "Consulenza"/);
    expect(chrome).toMatch(/href: "\/#about", label: "Servizi"/);
    const hero = readFileSync(join(process.cwd(), "components/site/Hero.tsx"), "utf8");
    expect(hero).toMatch(/hero-editorial/);
    expect(hero).toMatch(/bg-marble-light/);
    expect(hero).toMatch(/HERO_VIDEOS/);
    expect(hero).toMatch(/getHeroHeadline/);
    expect(hero).not.toMatch(/ScissorsIntro/);
    expect(hero).not.toMatch(/hero-media reveal/);
    const listino = readFileSync(join(process.cwd(), "components/booking/ServiceListino.tsx"), "utf8");
    expect(listino).toMatch(/id="listino"/);
    expect((listino.match(/id="listino"/g) || []).length).toBe(1);
    expect(listino).toMatch(/Listino/);
    expect(listino).toMatch(/BOOKING_SERVICE_EVENT/);
    expect(listino).toMatch(/BOOKING_SELECTION_SYNC_EVENT/);
    expect(listino).toMatch(/listino-box--selected/);
    expect(listino).toMatch(/formatPriceRange/);
    expect(listino).toMatch(/listino-box/);
    expect(listino).toMatch(/btn-listino-prenota/);
    expect(listino).toMatch(/Prenota/);
    expect(listino).not.toMatch(/listino-card/);
  });

  it("shows live hero with booking CTA before and after opening", () => {
    expect(HERO_CTA).toBe("Prenota il tuo appuntamento");
    expect(HERO_BEFORE_OPENING).toBe("Prenota il tuo appuntamento per l'apertura");
    expect(getHeroHeadline(new Date("2026-08-31T18:00:00+02:00"))).toBe(HERO_BEFORE_OPENING);
    expect(getHeroHeadline(new Date("2026-09-07T08:00:00+02:00"))).toBe(HERO_CTA);
    expect(getHeroHeadline(new Date("2026-09-08T10:00:00+02:00"))).toBe(HERO_CTA);
    expect(HERO_SLOT_CTA).toBe("Prenota il tuo posto");
    expect(HERO_SENTENCE).toBe("Precisione tecnica, stile contemporaneo.");
    const hero = readFileSync(join(process.cwd(), "components/site/Hero.tsx"), "utf8");
    expect(hero).toMatch(/getHeroHeadline/);
    expect(hero).toMatch(/HERO_PRE_OPENING_EYEBROW/);
    expect(hero).toMatch(/OpeningCountdown/);
    expect(hero).toMatch(/HERO_SENTENCE/);
    const layout = readFileSync(join(process.cwd(), "app/layout.tsx"), "utf8");
    expect(layout).toMatch(/mode-coming-soon|mode-live/);
    expect(layout).toMatch(/site-white-canvas/);
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toMatch(/marble\.png/);
    expect(css).toMatch(/marble-texture/);
    expect(css).toMatch(/bg-marble-light/);
    expect(css).toMatch(/marble-accent/);
    expect(css).toMatch(/glass-card/);
    expect(css).toMatch(/hero-media-cell/);
    expect(css).toMatch(/Plus Jakarta Sans/);
    expect(css).not.toMatch(/\.video-reel-box:hover[\s\S]*transform:/);
  });

  it("puts contact info and maps link in July 3 contact section", () => {
    expect(SITE.hours.monday).toBe("Lun · 15:00 — 19:00");
    expect(SITE.hours.tuesday).toBe("Mar · 08:30 — 19:00");
    expect(SITE.hours.wednesday).toBe("Mer · 08:30 — 19:00");
    expect(SITE.hours.thursday).toBe("Gio · 08:30 — 20:00");
    expect(SITE.hours.friday).toBe("Ven · 08:00 — 21:00");
    expect(SITE.hours.saturday).toBe("Sab · 08:00 — 21:00");
    expect(SITE.hours.sunday).toMatch(/Chiuso/);
    expect(SITE.hours.weekdays).toMatch(/15:00/);
    expect(SITE.hours.weekdays).toMatch(/08:30/);
    expect(SITE.hours.weekdays).toMatch(/08:00—21:00/);
    expect(SITE.instagramHandle).toBe("@felicepolese_barber");
    expect(SITE.instagram).toBe("https://instagram.com/felicepolese_barber");
    expect(getWhatsAppChatUrl()).toBe("https://wa.me/393270156225");
    expect(getPrenotaUrl()).toMatch(/\/#prenota$/);
    const channels = getSocialChannels();
    expect(channels.map((c) => c.id)).toEqual(["instagram", "whatsapp", "prenota"]);
    expect(channels[1]?.qrPayload).toBe("https://wa.me/393270156225");
    expect(channels[2]?.label).toBe(HERO_CTA);
    for (const ch of channels) {
      const file = join(process.cwd(), "public", ch.qr.replace(/^\//, ""));
      expect(statSync(file).isFile()).toBe(true);
      expect(statSync(file).size).toBeGreaterThan(2000);
    }
    const contact = readFileSync(join(process.cwd(), "components/site/LandingSections.tsx"), "utf8");
    expect(contact).toMatch(/id="contact"/);
    expect(contact).toMatch(/Raggiungimi ora su Google Maps/);
    expect(contact).toMatch(/Consulenza su WhatsApp/);
    expect(contact).toMatch(/getWhatsAppUrl/);
    expect(contact).toMatch(/SITE\.hours/);
    const chrome = readFileSync(join(process.cwd(), "components/site/Chrome.tsx"), "utf8");
    expect(chrome).not.toMatch(/SITE_PDFS\.logo/);
    expect(chrome).not.toMatch(/SITE_PDFS\.hoursPanel/);
    expect(chrome).not.toMatch(/Logo \(PDF\)/);
    expect(chrome).not.toMatch(/Orari \(PDF\)/);
    expect(chrome).toMatch(/href="\/gestionale"/);
    expect(chrome).toMatch(/Powered by Genio Digital/);
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toMatch(/\.wa-fab/);
    expect(css).toMatch(/\.tilt-3d/);
    expect(css).toMatch(/\[data-parallax\]/);
    expect(css).toMatch(/footer-powered/);

    expect(css).toMatch(/fx-media--curtain/);
    expect(css).toMatch(/fx-media--mask/);
    expect(css).toMatch(/countdown-digit--tick/);
    expect(css).toMatch(/fresha-step-in/);
    expect(css).toMatch(/is-center/);
    expect(css).toMatch(/fx-media-hover/);
    expect(css).not.toMatch(/\.section-title\.reveal \{[^}]*clip-path/);
    const motion = readFileSync(join(process.cwd(), "components/site/MicroMotion.tsx"), "utf8");
    expect(motion).toMatch(/prefers-reduced-motion/);
    expect(motion).toMatch(/video-reel-player/);
    const effects = readFileSync(join(process.cwd(), "components/site/Chrome.tsx"), "utf8");
    expect(effects).toMatch(/fx-media--curtain/);
    expect(effects).toMatch(/service-reel-box/);
    expect(effects).toMatch(/hero-float/);
    expect(effects).toMatch(/waitForScissorsIntro/);
    const countdownSrc = readFileSync(join(process.cwd(), "components/site/OpeningCountdown.tsx"), "utf8");
    expect(countdownSrc).toMatch(/countdown-digit--tick/);
    const page = readFileSync(join(process.cwd(), "app/page.tsx"), "utf8");
    expect(page).toMatch(/MicroMotion/);
    const intro = readFileSync(join(process.cwd(), "components/site/ScissorsIntro.tsx"), "utf8");
    expect(intro).not.toMatch(/OpeningCountdown/);
    expect(intro).not.toMatch(/HERO_SLOT_CTA/);
    expect(intro).toMatch(/SCISSORS_INTRO_FINISHED_EVENT/);
    expect(intro).toMatch(/prefers-reduced-motion/);
    expect(intro).toMatch(/snip/);
    expect(intro).toMatch(/scissors-intro-shears/);
    expect(css).toMatch(/scissors-photo-snip/);
    expect(css).toMatch(/listino-box--selected/);
    expect(css).not.toMatch(/\.section-title\.reveal \{[^}]*clip-path/);
  });

  it("does not cap total bookings — wizard shows many open days", () => {
    expect(BOOKING_UI_DAYS).toBeGreaterThan(16);
    expect(HERO_CALENDAR_DAYS).toBeGreaterThanOrEqual(12);
    const wizard = readFileSync(join(process.cwd(), "components/booking/FreshaBookingFlow.tsx"), "utf8");
    expect(wizard).toMatch(/BOOKING_UI_DAYS/);
    expect(wizard).toMatch(/Illimitate/);
    expect(wizard).toMatch(/nessun tetto totale/i);
    const crm = readFileSync(join(process.cwd(), "app/api/admin/crm/route.ts"), "utf8");
    expect(crm).toMatch(/fetchAllPages/);
    expect(crm).not.toMatch(/\.limit\(4000\)/);
  });

  it("stacks a Maps FAB Raggiungimi ora to Corso Dante Alighieri, 44", () => {
    expect(CANCEL_MINUTES_BEFORE).toBe(30);
    expect(MAPS_DESTINATION).toBe("Corso Dante Alighieri, 44, 82100 Benevento");
    expect(getMapsUrl()).toBe(
      "https://www.google.com/maps/search/?api=1&query=" +
        encodeURIComponent("Corso Dante Alighieri, 44, 82100 Benevento"),
    );
    expect(getMapsUrl()).toContain(encodeURIComponent("Corso Dante Alighieri, 44"));
    expect(CANCEL_NOTICE_IT).toBe("30 minuti");
    const chrome = readFileSync(join(process.cwd(), "components/site/Chrome.tsx"), "utf8");
    expect(chrome).toMatch(/id="maps-fab"/);
    expect(chrome).toMatch(/aria-label="Raggiungimi ora su Google Maps"/);
    expect(chrome).toMatch(/Raggiungimi ora su Google Maps — \$\{SITE\.address\}/);
    expect(chrome).toMatch(/fab-stack/);
    expect(chrome).toMatch(/<MapsFab \/>/);
    expect(chrome).toMatch(/<WhatsAppFab \/>/);
    const stack = chrome.slice(chrome.indexOf("fab-stack"));
    expect(stack.indexOf("<MapsFab")).toBeLessThan(stack.indexOf("<WhatsAppFab"));
    const page = readFileSync(join(process.cwd(), "app/page.tsx"), "utf8");
    expect(page).toMatch(/SiteFabs/);
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toMatch(/\.maps-fab \{/);
    expect(css).toMatch(/wa-fab-glow/);
    expect(css).toMatch(/maps-fab-glow/);
    expect(css).toMatch(/\.btn-whatsapp/);
    expect(css).toMatch(/#25D366/);
    expect(css).not.toMatch(/body:has\(\.fresha-footer\)\s*\.fab-stack\s*\{\s*display:\s*none/);
    expect(chrome).toMatch(/Raggiungimi ora su Google Maps/);
    const wizard = readFileSync(join(process.cwd(), "components/booking/FreshaBookingFlow.tsx"), "utf8");
    expect(wizard).toMatch(/btn btn-whatsapp appointment-sidebar-wa/);
    expect(wizard).toMatch(/INVIA ORA IL PROMEMORIA APPUNTAMENTO/);
    const contact = readFileSync(join(process.cwd(), "components/site/LandingSections.tsx"), "utf8");
    expect(contact).toMatch(/btn btn-whatsapp contact-wa/);
    const terms = readFileSync(join(process.cwd(), "app/terms/page.tsx"), "utf8");
    expect(terms).toMatch(/CANCEL_NOTICE_IT/);
    expect(terms).toMatch(/SiteFabs/);
    expect(terms).not.toMatch(/24h|24 ore/);
  });
});
