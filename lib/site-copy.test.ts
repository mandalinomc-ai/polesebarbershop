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
  it("uses the official phone, address, CF and P.IVA", () => {
    expect(SITE.phone).toBe("+39 327 015 6225");
    expect(SITE.address).toBe("Corso Dante Alighieri, 44");
    expect(SITE.openingDate).toBe("2026-09-07");
    expect(SITE.fiscalCode).toBe("PLSFLC04S21A783K");
    expect(SITE.vatNumber).toBe("01894030624");
    expect(SITE.pricesIncludeVat).toMatch(/IVA inclusa/);
  });

  it("uses Felice Polese Gmail as salon email, not the GitHub Gmail", () => {
    expect(SITE.email).toBe("felicepolese550@gmail.com");
    expect(ADMIN_EMAIL_FALLBACK).toBe("felicepolese550@gmail.com");
    expect(getMailtoUrl()).toContain("mailto:felicepolese550@gmail.com");
    expect(SITE.email).not.toBe("mandalinomc@gmail.com");
  });

  it("has no leftover 351 number, Corso Dante 45, or old listino in source", () => {
    const files = walk(process.cwd());
    const banned = [
      /351\s*252\s*3087/,
      /Corso Dante n\. 45/,
      /Corso Dante 45/,
      /Taglio sartoriale/,
      /Combo premium/,
      /dermatolog/i,
      /caduta capelli/i,
      /Parla con il salone/i,
      /parlare con il salone/i,
      /mandalinomc@gmail\.com/,
      /200\s+prenotazioni/i,
      /limite\s+di\s+200/i,
      /hero--marble/,
      /tricolog/i,
      /hero-bg\.jpg/,
      /hero-bg\.webp/,
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

  it("keeps shop WhatsApp on wa.me/393270156225 without Twilio", () => {
    expect(SITE.whatsapp).toBe("393270156225");
    expect(SITE.phone).toBe("+39 327 015 6225");
    expect(getWhatsAppUrl()).toMatch(/^https:\/\/wa\.me\/393270156225\?text=/);
    const confirm = getBookingConfirmWhatsAppUrl({
      firstName: "Mario",
      service: "Taglio classico",
      dateLabel: "martedì 1 settembre 2026",
      timeLabel: "09:30",
      barberName: "Felice",
    });
    expect(confirm).toMatch(/^https:\/\/wa\.me\/393270156225\?text=/);
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

  it("defaults to live site with countdown and booking (not coming-soon gate)", () => {
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
  });

  it("includes consulenza in sede without tricologia in live layout", () => {
    const landing = readFileSync(join(process.cwd(), "components/site/LandingSections.tsx"), "utf8");
    expect(landing).toMatch(/Consulenza in sede/);
    expect(landing).toMatch(/id="consulenza"/);
    expect(landing).not.toMatch(/Consulenza Tricologica/i);
    expect(landing).not.toMatch(/tricolog/i);
    expect(landing).not.toMatch(/analisi cute/i);
    expect(landing).not.toMatch(/percorsi curativi/i);
    expect(landing).toMatch(/id="prodotti"/);
    expect(landing).not.toMatch(/brand-products\.jpg/);
    expect(landing).toMatch(/Barber Match 2023/);
    expect(landing).not.toMatch(/gallery-grid/);
    expect(landing).toMatch(/GALLERY_VIDEOS/);
    const widget = readFileSync(join(process.cwd(), "components/site/WhatsAppWidget.tsx"), "utf8");
    expect(widget).toMatch(/Prenota/);
    expect(widget).toMatch(/Info & orari/);
    expect(widget).toMatch(/Ordina prodotti/);
  });

  it("shows Prenota già ora with a mini calendar before official opening", () => {
    expect(HERO_CTA).toBe("Prenota già ora");
    expect(HERO_BEFORE_OPENING).toBe("Prenota già ora, prima dell'apertura ufficiale");
    expect(getHeroHeadline(new Date("2026-08-31T18:00:00+02:00"))).toBe(HERO_BEFORE_OPENING);
    expect(getHeroHeadline(new Date("2026-09-06T23:00:00+02:00"))).toBe(HERO_BEFORE_OPENING);
    expect(getHeroHeadline(new Date("2026-09-08T10:00:00+02:00"))).toBe("Prenota il tuo posto");
    const hero = readFileSync(join(process.cwd(), "components/site/Hero.tsx"), "utf8");
    expect(hero).toMatch(/HeroCalendar/);
    expect(hero).toMatch(/OpeningCountdown/);
    expect(hero).toMatch(/HERO_CTA/);
    expect(hero).toMatch(/heroHeadline/);
    const page = readFileSync(join(process.cwd(), "app/page.tsx"), "utf8");
    expect(page).toMatch(/ScissorsIntro/);
    const layout = readFileSync(join(process.cwd(), "app/layout.tsx"), "utf8");
    expect(layout).toMatch(/mode-coming-soon|mode-live/);
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toMatch(/hero-day-scroller/);
    expect(css).toMatch(/hero-editorial/);
    expect(css).toMatch(/scissors-intro/);
    expect(css).toMatch(/blade-left-open/);
  });

  it("puts hours, Instagram, WhatsApp and prenota QR on contact and footer", () => {
    expect(SITE.hours.weekdays).toBe("Mar — Sab · 09:30 — 20:00");
    expect(SITE.hours.monday).toMatch(/Chiuso/);
    expect(SITE.hours.sunday).toMatch(/Chiuso/);
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
    expect(contact).toMatch(/contact-hours/);
    expect(contact).toMatch(/SocialQrGrid/);
    expect(contact).toMatch(/SocialTextLinks/);
    const chrome = readFileSync(join(process.cwd(), "components/site/Chrome.tsx"), "utf8");
    expect(chrome).toMatch(/footer-hours/);
    expect(chrome).toMatch(/SocialQrGrid/);
    expect(chrome).toMatch(/SITE_PDFS/);
    expect(chrome).toMatch(/footer-hours-pdf/);
    expect(chrome).toMatch(/Pannello orari \(PDF\)/);
    expect(chrome).toMatch(/SocialTextLinks/);
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toMatch(/\.qr-card \{[\s\S]*?min-height:\s*44px/);
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

  it("stacks a Maps FAB Raggiungici ora to Corso Dante Alighieri 44", () => {
    expect(CANCEL_HOURS_BEFORE).toBe(1);
    expect(MAPS_DESTINATION).toBe("Corso Dante Alighieri 44, 82100 Benevento");
    expect(getMapsUrl()).toContain("maps.google.com");
    expect(getMapsUrl()).toContain("destination=");
    expect(getMapsUrl()).toContain(encodeURIComponent("Corso Dante Alighieri 44"));
    expect(CANCEL_NOTICE_IT).toBe("1 ora");
    const chrome = readFileSync(join(process.cwd(), "components/site/Chrome.tsx"), "utf8");
    expect(chrome).toMatch(/id="maps-fab"/);
    expect(chrome).toMatch(/aria-label="Raggiungici ora"/);
    expect(chrome).toMatch(/Raggiungici ora — Corso Dante Alighieri, 44/);
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
    expect(hero).toMatch(/Raggiungici ora/);
    const terms = readFileSync(join(process.cwd(), "app/terms/page.tsx"), "utf8");
    expect(terms).toMatch(/CANCEL_NOTICE_IT/);
    expect(terms).not.toMatch(/24h|24 ore/);
  });
});
