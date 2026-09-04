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
    expect(wizard).toMatch(/setSlots\(availableOnly\)/);
    expect(wizard).toMatch(/setSlots\(\[\]\)/);
    expect(wizard).toMatch(/sourceUnavailable/);
    expect(wizard).not.toMatch(/localSlots/);
    expect(wizard).toMatch(/Smart available starts|availableOnly/);
    expect(css).toMatch(/\.slot-btn/);
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

  it("keeps countdown digits centered with tabular numbers on mobile", () => {
    expect(css).toMatch(/\.countdown \{[\s\S]*?grid-template-columns:\s*repeat\(4/);
    expect(css).toMatch(/\.countdown-item \{[\s\S]*?align-items:\s*center/);
    expect(css).toMatch(/\.countdown-value \{[\s\S]*?tabular-nums/);
    expect(css).toMatch(/\.countdown-value \{[\s\S]*?text-align:\s*center/);
    expect(css).toMatch(/\.countdown-value \{[\s\S]*?grid-template-columns:\s*1fr 1fr/);
    expect(css).toMatch(/\.countdown-digit \{[\s\S]*?transform:\s*none/);
    expect(css).toMatch(/\.countdown-label \{[\s\S]*?text-align:\s*center/);
    const countdown = readFileSync(join(process.cwd(), "components/site/OpeningCountdown.tsx"), "utf8");
    expect(countdown).toMatch(/countdown-digit/);
    expect(countdown).toMatch(/DigitPair/);
    expect(countdown).toMatch(/data-pos/);
  });

  it("keeps listino Prenota taps at 44px and treatment reels single-column on phones", () => {
    expect(css).toMatch(/@media \(max-width: 899px\)[\s\S]*?\.btn-listino-prenota \{[\s\S]*?min-height:\s*44px/);
    expect(css).toMatch(/@media \(max-width: 720px\)[\s\S]*?\.video-reel-grid\.technique-grid[\s\S]*?grid-template-columns:\s*1fr/);
    expect(css).toMatch(/\.fab-stack \{[\s\S]*?safe-bottom/);
  });

  it("avoids sticky hover and FAB overlap on touch phones", () => {
    expect(css).toMatch(/@media \(hover:\s*hover\) and \(pointer:\s*fine\)/);
    /* FABs stay visible; elevated bottom clears sticky Continua without display:none */
    expect(css).not.toMatch(/body:has\(\.fresha-footer\)\s*\.fab-stack\s*\{\s*display:\s*none/);
    expect(css).toMatch(/\.fab-stack \{[\s\S]*?bottom:\s*calc\(5\.5rem/);
    expect(css).toMatch(/wa-fab-glow/);
    expect(css).toMatch(/\.site-footer \{[\s\S]*?safe-bottom/);
    expect(css).toMatch(/overflow-x:\s*(clip|hidden)/);
    expect(css).toMatch(/min-height:\s*100vh;\s*min-height:\s*100dvh|min-height:\s*100dvh/);
  });

  it("keeps iOS video autoplay attributes and play() fallback", () => {
    const salon = readFileSync(join(process.cwd(), "components/site/SalonVideo.tsx"), "utf8");
    expect(salon).toMatch(/"use client"/);
    expect(salon).toMatch(/playsInline/);
    expect(salon).toMatch(/webkit-playsinline/);
    expect(salon).toMatch(/\.play\(\)/);
    expect(salon).toMatch(/el\.muted = true/);
    const hero = readFileSync(join(process.cwd(), "components/site/Hero.tsx"), "utf8");
    expect(hero).toMatch(/SalonVideo/);
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
    expect(scissors).toMatch(/viewBox="0 0 100 118"/);
    expect(scissors).toMatch(/shear-intro\.png/);
    expect(scissors).not.toMatch(/#C9A962|#F4E4BC|#FFD700/);
    expect(css).toMatch(/\.scissors-intro \{/);
    expect(css).toMatch(/scissors-intro-split/);
    expect(css).toMatch(/scissors-icon--photo/);
    expect(css).not.toMatch(/\.scissors-intro \{ display: none; \}/);
    expect(css).toMatch(/prefers-reduced-motion: reduce[\s\S]*?\.scissors-intro \{ display: none !important; \}/);
    const intro = readFileSync(join(process.cwd(), "components/site/ScissorsIntro.tsx"), "utf8");
    expect(intro).toMatch(/SITE\.brand/);
    expect(intro).toMatch(/Tocca per entrare/);
    expect(intro).toMatch(/prefers-reduced-motion/);
    const page = readFileSync(join(process.cwd(), "app/page.tsx"), "utf8");
    expect(page).toMatch(/ScissorsIntro/);
  });
});
