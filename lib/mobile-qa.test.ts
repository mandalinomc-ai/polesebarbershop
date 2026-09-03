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
    expect(chrome).toMatch(/HERO_SLOT_CTA/);
    expect(chrome).toMatch(/nav-toggle/);
    expect(chrome).toMatch(/Chiudi menu/);
  });

  it("does not invent booked slots when the API returns none", () => {
    expect(wizard).toMatch(/setSlots\(Array\.isArray\(json\.slots\) \? json\.slots : \[\]\)/);
    expect(wizard).not.toMatch(/incoming\.length \? incoming : localSlots\(\)/);
    expect(wizard).toMatch(/aria-disabled=\{taken\}/);
    expect(wizard).toMatch(/non disponibile/);
    expect(css).toMatch(/\.slot-btn\.booked/);
    expect(css).toMatch(/\.cal-day \{[\s\S]*?min-height:\s*44px/);
  });

  it("keeps /gestionale usable on a phone (bottom nav + logout + walk-in taps)", () => {
    expect(crm).toMatch(/crm-bottom/);
    expect(crm).toMatch(/crm-mobile-logout/);
    expect(crm).toMatch(/walkin-service/);
    expect(crm).toMatch(/occupancy-table/);
    expect(css).toMatch(/\.crm-mobile-logout \{ display: inline-flex; \}/);
    expect(css).toMatch(/\.occupancy-table td\.taken/);
  });

  it("opens the gestionale notification bell on tap and illuminates unread", () => {
    const bell = readFileSync(join(process.cwd(), "components/gestionale/CrmNotificationBell.tsx"), "utf8");
    expect(crm).toMatch(/CrmNotificationBell/);
    expect(bell).toMatch(/aria-expanded=\{open\}/);
    expect(bell).toMatch(/onClick=\{toggle\}/);
    expect(bell).toMatch(/has-unread/);
    expect(bell).toMatch(/crm-bell-overlay/);
    expect(bell).toMatch(/\/api\/admin\/notifications/);
    expect(css).toMatch(/\.crm-bell-btn \{[\s\S]*?min-height:\s*44px/);
    expect(css).toMatch(/\.crm-bell-btn\.has-unread/);
    expect(css).toMatch(/\.crm-bell-overlay \{[\s\S]*?position:\s*fixed/);
    expect(css).toMatch(/\.crm-bell-panel \{[\s\S]*?position:\s*fixed/);
    expect(css).toMatch(/z-index:\s*440/);
  });

  it("keeps July 3 hero and booking CTA usable at 390px", () => {
    const hero = readFileSync(join(process.cwd(), "components/site/Hero.tsx"), "utf8");
    expect(hero).toMatch(/hero-editorial/);
    expect(hero).toMatch(/getHeroHeadline/);
    expect(css).toMatch(/\.hero-media-cell/);
    expect(css).toMatch(/\.day-chip \{[\s\S]*?min-height:\s*44px/);
  });

  it("stacks Maps above WhatsApp with 44px mobile taps and safe-area", () => {
    expect(chrome).toMatch(/fab-stack/);
    expect(chrome).toMatch(/aria-label="Raggiungimi ora su Google Maps"/);
    expect(chrome.indexOf("<MapsFab />")).toBeLessThan(chrome.indexOf("<WhatsAppFab />"));
    expect(css).toMatch(/\.fab-stack \{[\s\S]*?safe-bottom/);
    expect(css).toMatch(/\.wa-fab, \.maps-fab \{[\s\S]*?min-width:\s*44px[\s\S]*?min-height:\s*44px/);
  });

  it("uses white marble theme with video grid after hero, no leftover about block", () => {
    const layout = readFileSync(join(process.cwd(), "app/layout.tsx"), "utf8");
    const hero = readFileSync(join(process.cwd(), "components/site/Hero.tsx"), "utf8");
    const landing = readFileSync(join(process.cwd(), "components/site/LandingSections.tsx"), "utf8");
    expect(layout).toMatch(/site-white-canvas/);
    expect(css).toMatch(/marble\.png/);
    expect(css).toMatch(/bg-marble-light/);
    expect(css).toMatch(/video-reel-grid/);
    expect(css).toMatch(/backface-visibility:\s*hidden/);
    expect(hero).toMatch(/hero-editorial/);
    expect(landing).not.toMatch(/gallery-grid/);
    expect(landing).not.toMatch(/fresha-/);
    expect(landing).toMatch(/id="about"/);
    expect(landing).toMatch(/FELICE_WORKING_VIDEO/);
    expect(landing).toMatch(/VideoReelGrid/);
    expect(landing).toMatch(/ServiceListino/);
    expect(hero).toMatch(/HERO_VIDEOS/);
    expect(css).not.toMatch(/\.video-reel-box:hover[\s\S]*transform:/);
    const scissors = readFileSync(join(process.cwd(), "components/site/ScissorsIcon.tsx"), "utf8");
    expect(scissors).toMatch(/viewBox="0 0 100 110"/);
  });
});
