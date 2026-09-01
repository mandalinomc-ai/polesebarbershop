import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("mobile QA (390px)", () => {
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
  const chrome = readFileSync(join(process.cwd(), "components/site/Chrome.tsx"), "utf8");
  const wizard = readFileSync(join(process.cwd(), "components/booking/FreshaBookingFlow.tsx"), "utf8");
  const crm = readFileSync(join(process.cwd(), "components/gestionale/GestionalePanel.tsx"), "utf8");

  it("keeps iOS inputs at 16px and tap targets at 44px", () => {
    expect(css).toMatch(/\.input-lux[\s\S]*?font-size:\s*16px/);
    expect(css).toMatch(/input,\s*select,\s*textarea \{ font-size: 16px; \}/);
    expect(css).toMatch(/\.btn \{[\s\S]*?min-height:\s*44px/);
    expect(css).toMatch(/\.nav-toggle \{[\s\S]*?min-height:\s*44px/);
    expect(css).toMatch(/\.slot-btn \{[\s\S]*?min-height:\s*44px/);
    expect(css).toMatch(/\.day-chip \{[\s\S]*?min-height:\s*44px/);
    expect(css).toMatch(/\.crm-bottom button \{[\s\S]*?min-height:\s*44px/);
  });

  it("keeps Prenota sticky on mobile and does not hide the header", () => {
    expect(css).toMatch(/\.site-header\.header-hidden \{ transform: none; \}/);
    expect(chrome).toMatch(/max-width: 899px/);
    expect(chrome).toMatch(/PRENOTA ORA/);
    expect(chrome).toMatch(/nav-toggle/);
    expect(chrome).toMatch(/Chiudi menu/);
  });

  it("does not invent booked slots when the API returns none", () => {
    expect(wizard).toMatch(/setSlots\(Array\.isArray\(json\.slots\) \? json\.slots : \[\]\)/);
    expect(wizard).not.toMatch(/incoming\.length \? incoming : localSlots\(\)/);
  });

  it("keeps /gestionale usable on a phone (bottom nav + logout + walk-in taps)", () => {
    expect(crm).toMatch(/crm-bottom/);
    expect(crm).toMatch(/crm-mobile-logout/);
    expect(crm).toMatch(/walkin-service/);
    expect(css).toMatch(/\.crm-mobile-logout \{ display: inline-flex; \}/);
  });

  it("keeps the editorial hero CTA and date scroller usable at 390px", () => {
    const hero = readFileSync(join(process.cwd(), "components/site/Hero.tsx"), "utf8");
    const calendar = readFileSync(join(process.cwd(), "components/site/HeroCalendar.tsx"), "utf8");
    expect(hero).toMatch(/hero-editorial/);
    expect(hero).toMatch(/OpeningCountdown/);
    expect(hero).toMatch(/HERO_CTA/);
    expect(css).toMatch(/\.hero-editorial/);
    expect(css).toMatch(/\.day-chip \{[\s\S]*?min-height:\s*44px/);
    expect(calendar).toMatch(/hero-day-scroller/);
    expect(calendar).toMatch(/prenota/);
  });

  it("stacks Maps above WhatsApp with 44px mobile taps and safe-area", () => {
    expect(chrome).toMatch(/fab-stack/);
    expect(chrome).toMatch(/aria-label="Raggiungici ora"/);
    expect(chrome.indexOf("<MapsFab />")).toBeLessThan(chrome.indexOf("<WhatsAppFab />"));
    expect(css).toMatch(/\.fab-stack \{[\s\S]*?safe-bottom/);
    expect(css).toMatch(/\.wa-fab, \.maps-fab \{[\s\S]*?min-width:\s*44px[\s\S]*?min-height:\s*44px/);
  });

  it("uses HD marble texture on select sections with Marcel white editorial canvas", () => {
    const layout = readFileSync(join(process.cwd(), "app/layout.tsx"), "utf8");
    const shell = readFileSync(join(process.cwd(), "components/site/SiteShell.tsx"), "utf8");
    const hero = readFileSync(join(process.cwd(), "components/site/Hero.tsx"), "utf8");
    const landing = readFileSync(join(process.cwd(), "components/site/LandingSections.tsx"), "utf8");
    expect(layout).toMatch(/site-white-canvas/);
    expect(layout).not.toMatch(/site-marble-canvas/);
    expect(css).toMatch(/marble\.png/);
    expect(css).toMatch(/\.section-marble/);
    expect(shell).not.toMatch(/site-marble-canvas/);
    expect(hero).toMatch(/hero-editorial/);
    expect(landing).toMatch(/section-marble/);
    expect(hero).not.toMatch(/VideoReelGrid/);
    expect(landing).not.toMatch(/VideoReelGrid/);
    expect(landing).not.toMatch(/gallery-grid/);
    expect(landing).not.toMatch(/GALLERY_IMAGES/);
    expect(landing).not.toMatch(/brand-products\.jpg/);
  });

  it("uses real video paths in hero asymmetric grid (no reel section)", () => {
    const hero = readFileSync(join(process.cwd(), "components/site/Hero.tsx"), "utf8");
    const landing = readFileSync(join(process.cwd(), "components/site/LandingSections.tsx"), "utf8");
    const videos = readFileSync(join(process.cwd(), "lib/site-videos.ts"), "utf8");
    expect(hero).toMatch(/HERO_VIDEOS/);
    expect(hero).toMatch(/site-videos/);
    expect(videos).toMatch(/taglio-01\.mp4/);
    expect(videos).toMatch(/\/assets\/video/);
    expect(hero).toMatch(/autoPlay/);
    expect(hero).toMatch(/muted/);
    expect(hero).toMatch(/loop/);
    expect(hero).toMatch(/playsInline/);
    expect(landing).not.toMatch(/VideoReelGrid/);
    expect(landing).not.toMatch(/video-reel/);
    expect(landing).toMatch(/gallery-video-grid/);
    expect(landing).toMatch(/GALLERY_VIDEOS/);
    expect(css).toMatch(/\.hero-media-cell video[\s\S]*object-fit:\s*cover/);
    expect(css).toMatch(/\.gallery-video video[\s\S]*object-fit:\s*cover/);
  });
});
