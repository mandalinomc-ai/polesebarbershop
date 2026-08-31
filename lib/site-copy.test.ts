import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SITE,
  SALON_CONTACT,
  SALON_CONTACT_MESSAGE,
  ADMIN_EMAIL_FALLBACK,
  getWhatsAppUrl,
  getMailtoUrl,
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
    expect(example).not.toMatch(/ADMIN_PASSWORD=admin/);
  });
});
