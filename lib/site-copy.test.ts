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
} from "./site-config";

const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "coverage", "out"]);
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
      /tricolog/i,
      /dermatolog/i,
      /caduta capelli/i,
      /Consulenza Tricologica/,
      /id=["']consulenza["']/,
      /\/#consulenza/,
      /mandalinomc@gmail\.com/,
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
    expect(SALON_CONTACT.title).toBe("Parla con il salone");
    expect(SALON_CONTACT.id).toBe("scrivici");
    expect(SALON_CONTACT.prefill).toBe(SALON_CONTACT_MESSAGE);
    expect(SALON_CONTACT_MESSAGE).toBe(
      "Ciao, vorrei parlare con il salone per un'informazione.",
    );
    expect(SALON_CONTACT.body).toMatch(/info, orari, prezzi o un consiglio/i);
    expect(getWhatsAppUrl()).toContain(encodeURIComponent(SALON_CONTACT_MESSAGE));
    expect(SALON_CONTACT.body + SALON_CONTACT.title + SALON_CONTACT_MESSAGE).not.toMatch(
      /tricolog|dermatolog|caduta/i,
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
      service: "Taglio Standard",
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

  it("shows Prenota già ora with a mini calendar before official opening", () => {
    expect(HERO_CTA).toBe("Prenota già ora");
    expect(HERO_BEFORE_OPENING).toBe("Prenota già ora, prima dell'apertura ufficiale");
    expect(getHeroHeadline(new Date("2026-08-31T18:00:00+02:00"))).toBe(HERO_BEFORE_OPENING);
    const hero = readFileSync(join(process.cwd(), "components/site/Hero.tsx"), "utf8");
    expect(hero).toMatch(/HeroCalendar/);
    expect(hero).toMatch(/hero-cta-primary/);
    expect(hero).toMatch(/getHeroHeadline/);
    const layout = readFileSync(join(process.cwd(), "app/layout.tsx"), "utf8");
    expect(layout).toMatch(/mode-live/);
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).not.toMatch(/mode-coming-soon \.hero-inner--live \{ display: none/);
    expect(css).toMatch(/hero-day-scroller/);
    expect(css).toMatch(/hero--story/);
  });
});
