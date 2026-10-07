/**
 * Shared helpers for Felice Polese demo recordings.
 * Privacy-first: mock customer data only.
 */
import { existsSync, readFileSync } from "node:fs";
import { join as pathJoin } from "node:path";

export const MOCK_CUSTOMER = Object.freeze({
  firstName: "Mario",
  lastName: "Rossi",
  email: "mario.test@email.it",
  phone: "3331234567",
});

/** Desktop sales-presentation canvas (shows full layout + videos). */
export const SALES_VIEWPORT = Object.freeze({
  width: 1920,
  height: 1080,
  deviceScaleFactor: 1,
});

/** @deprecated use SALES_VIEWPORT for presentation demos */
export const REEL_VIEWPORT = SALES_VIEWPORT;

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Smooth scroll by deltaY.
 * Uses stepped scrollBy from Node (not rAF) — headless Chromium throttles
 * requestAnimationFrame so rAF loops can hang for minutes.
 */
export async function smoothScrollBy(page, deltaY, durationMs = 2200) {
  const steps = Math.max(16, Math.round(durationMs / 40));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  const start = await page.evaluate(() => window.scrollY);
  for (let i = 1; i <= steps; i += 1) {
    const y = start + deltaY * ease(i / steps);
    await page.evaluate((next) => window.scrollTo(0, next), y);
    await sleep(durationMs / steps);
  }
  await sleep(200);
}

/**
 * Smooth scroll until selector is near the top of the viewport.
 */
export async function smoothScrollTo(page, selector, { durationMs = 2800, offset = 72 } = {}) {
  const targetY = await page.evaluate(
    ({ selector, offset }) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const top = el.getBoundingClientRect().top + window.scrollY;
      return Math.max(0, top - offset);
    },
    { selector, offset },
  );
  if (targetY == null) return false;
  const current = await page.evaluate(() => window.scrollY);
  const delta = targetY - current;
  if (Math.abs(delta) < 8) return true;
  await smoothScrollBy(page, delta, durationMs);
  return true;
}

/** Type like a human. */
export async function humanType(locator, text, { delayMs = 70 } = {}) {
  await locator.click({ delay: 30 });
  await locator.fill("");
  await locator.pressSequentially(text, { delay: delayMs });
}

/** Force autoplay videos in view to play (muted). Never await play() — it can hang. */
export async function ensureVideosPlaying(page) {
  await page.evaluate(() => {
    for (const v of document.querySelectorAll("video")) {
      try {
        v.muted = true;
        v.defaultMuted = true;
        v.playsInline = true;
        v.setAttribute("muted", "");
        v.setAttribute("playsinline", "");
        // Fire-and-forget — do NOT await; play() promises may never settle in headless.
        const p = v.play();
        if (p && typeof p.catch === "function") p.catch(() => null);
      } catch {
        /* ignore */
      }
    }
  });
}

/**
 * Hide / blur revenue and sensitive CRM chrome for filming.
 */
export async function applyPrivacyMask(page) {
  await page.addStyleTag({
    content: `
      [data-reel-hide="1"] { display: none !important; }
      [data-reel-blur="1"],
      .kpi, .crm-kpis, .subscription-panel {
        filter: blur(14px) !important;
        user-select: none !important;
      }
      .agenda-price { filter: blur(10px); }
      .fab-stack { opacity: 0 !important; pointer-events: none !important; }
      .booking-mini-cart-dock { opacity: 0.35; }
    `,
  });

  await page.evaluate(() => {
    const hideRe = /clienti|statistiche|storico/i;
    const blurRe = /incasso|€|eur|revenue|previsto/i;
    document.querySelectorAll("button, a, [role='tab']").forEach((el) => {
      const t = (el.textContent || "").trim();
      if (hideRe.test(t)) el.setAttribute("data-reel-hide", "1");
    });
    document.querySelectorAll("h1, h2, h3, p, span, strong, small, label").forEach((el) => {
      const t = (el.textContent || "").trim();
      if (t.length < 48 && blurRe.test(t)) el.setAttribute("data-reel-blur", "1");
    });
  });
}

/** Sync — must finish before reading process.env in entry scripts. */
export function loadEnvFile(dir) {
  const envPath = pathJoin(dir, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined || process.env[key] === "") {
      process.env[key] = val;
    }
  }
}
