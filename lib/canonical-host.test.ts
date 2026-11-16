import { describe, expect, it } from "vitest";
import {
  CANONICAL_SITE_HOST,
  CANONICAL_SITE_URL,
  isCanonicalHost,
  requestHost,
} from "./canonical-host";

describe("canonical-host", () => {
  it("accepts .it and www, plus localhost/Docker bind for dev and image opt", () => {
    expect(isCanonicalHost("felicepolesebarbershop.it")).toBe(true);
    expect(isCanonicalHost("www.felicepolesebarbershop.it")).toBe(true);
    expect(isCanonicalHost("FelicePoleseBarbershop.it:443")).toBe(true);
    expect(isCanonicalHost("localhost")).toBe(true);
    expect(isCanonicalHost("127.0.0.1:3000")).toBe(true);
    // Docker Next sets HOSTNAME=0.0.0.0; image optimizer must not hit legacy 308.
    expect(isCanonicalHost("0.0.0.0")).toBe(true);
    expect(isCanonicalHost("0.0.0.0:3000")).toBe(true);
    expect(isCanonicalHost("::1")).toBe(true);
    expect(isCanonicalHost("[::1]:3000")).toBe(true);
  });

  it("rejects Vercel / preview / IP hosts so they stay on legacy offline", () => {
    expect(isCanonicalHost("felice-polese.vercel.app")).toBe(false);
    expect(isCanonicalHost("something.vercel.app")).toBe(false);
    expect(isCanonicalHost("94.177.161.26")).toBe(false);
    expect(isCanonicalHost("")).toBe(false);
    expect(isCanonicalHost(null)).toBe(false);
  });

  it("prefers x-forwarded-host", () => {
    const headers = {
      get(name: string) {
        if (name === "x-forwarded-host") return "felicepolesebarbershop.it";
        if (name === "host") return "localhost:3000";
        return null;
      },
    };
    expect(requestHost(headers)).toBe("felicepolesebarbershop.it");
    expect(CANONICAL_SITE_URL).toBe(`https://${CANONICAL_SITE_HOST}`);
  });
});

describe("logo assets bypass image optimizer", () => {
  it("SiteLogo and intro shears use plain /assets img, not /_next/image", () => {
    const { readFileSync } = require("node:fs") as typeof import("node:fs");
    const { join } = require("node:path") as typeof import("node:path");
    const siteImage = readFileSync(
      join(process.cwd(), "components/site/SiteImage.tsx"),
      "utf8",
    );
    const scissors = readFileSync(
      join(process.cwd(), "components/site/ScissorsIcon.tsx"),
      "utf8",
    );
    const mw = readFileSync(join(process.cwd(), "middleware.ts"), "utf8");
    const logoFn = siteImage.slice(
      siteImage.indexOf("export function SiteLogo"),
      siteImage.indexOf("export function PlainFillCoverImage"),
    );
    expect(logoFn).toMatch(/<img/);
    expect(logoFn).toMatch(/src=\{SITE_LOGO\.src\}/);
    expect(logoFn).not.toMatch(/<Image\b/);
    expect(scissors).toMatch(/src="\/assets\/3d\/shear-intro\.png"/);
    expect(scissors).toMatch(/<img/);
    expect(scissors).not.toMatch(/from ["']next\/image["']/);
    expect(mw).toMatch(/pathname\.startsWith\("\/_next\/"\)/);
  });
});

describe("salone gallery bypass image optimizer", () => {
  it("carousel, brand pair and shelf use PlainFillCoverImage plain /assets img", () => {
    const { existsSync, readFileSync, readdirSync } =
      require("node:fs") as typeof import("node:fs");
    const { join } = require("node:path") as typeof import("node:path");
    const carousel = readFileSync(
      join(process.cwd(), "components/site/SalonPhotoCarousel.tsx"),
      "utf8",
    );
    const locale = readFileSync(
      join(process.cwd(), "components/site/SalonLocaleStrip.tsx"),
      "utf8",
    );
    const vetrina = readFileSync(
      join(process.cwd(), "components/site/ProductVetrina.tsx"),
      "utf8",
    );
    const siteImage = readFileSync(
      join(process.cwd(), "components/site/SiteImage.tsx"),
      "utf8",
    );
    const photos = readFileSync(
      join(process.cwd(), "lib/salon-photos.ts"),
      "utf8",
    );
    expect(siteImage).toMatch(/export function PlainFillCoverImage/);
    expect(carousel).toMatch(/PlainFillCoverImage/);
    expect(carousel).not.toMatch(/from ["']next\/image["']/);
    expect(carousel).not.toMatch(/(?<!Plain)FillCoverImage/);
    expect(locale).toMatch(/PlainFillCoverImage/);
    expect(locale).not.toMatch(/(?<!Plain)FillCoverImage/);
    expect(vetrina).toMatch(/PlainFillCoverImage/);
    expect(vetrina).toMatch(/SALON_PRODUCTS_SHELF/);
    expect(photos).toMatch(/\/assets\/images\/salone\/utensili-01\.jpg/);

    const dir = join(process.cwd(), "public/assets/images/salone");
    const required = [
      "utensili-01.jpg",
      "utensili-02.jpg",
      "utensili-03.jpg",
      "utensili-04.jpg",
      "utensili-05.jpg",
      "utensili-06.jpg",
      "utensili-07.jpg",
      "logo-muro.jpg",
      "targhetta-apertura.jpg",
      "prodotti-scaffale.jpg",
    ];
    for (const name of required) {
      expect(existsSync(join(dir, name))).toBe(true);
    }
    expect(readdirSync(dir).filter((f) => f.endsWith(".jpg")).sort()).toEqual(
      [...required].sort(),
    );
  });
});
