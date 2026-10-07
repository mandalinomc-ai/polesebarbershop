#!/usr/bin/env node
/**
 * Felice Polese — Instagram Reel demo (slow & smooth)
 *
 * Films:
 *  1) Public home (slow scroll)
 *  2) Booking wizard with MOCK customer only
 *  3) Gestionale Agenda (privacy mask: no money / no real client tabs)
 *
 * Output: scripts/reel-demo/output/felice-polese-reel.webm
 * Convert free with ffmpeg if you want MP4 (optional).
 *
 * Usage:
 *   cd scripts/reel-demo
 *   cp .env.example .env   # set ADMIN_PASSWORD, optional BASE_URL
 *   npm install
 *   npm run auth           # once — saves .auth/gestionale.json
 *   npm run record
 */
import { chromium } from "playwright";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MOCK_CUSTOMER,
  REEL_VIEWPORT,
  applyPrivacyMask,
  humanType,
  loadEnvFile,
  sleep,
  smoothScrollBy,
  smoothScrollTo,
} from "./lib/helpers.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnvFile(__dirname);

const BASE_URL = (process.env.BASE_URL || "https://felicepolesebarbershop.it").replace(/\/$/, "");
const SKIP_BOOKING = process.env.SKIP_BOOKING === "1";
const CLEANUP_BOOKING = process.env.CLEANUP_BOOKING !== "0";
const authPath = join(__dirname, ".auth", "gestionale.json");
const outDir = join(__dirname, "output");
mkdirSync(outDir, { recursive: true });

const videoPath = join(outDir, "felice-polese-reel.webm");

function log(step) {
  console.log(`→ ${step}`);
}

async function pickFirstAvailableDay(page) {
  // Prefer calendar day buttons that are not disabled / closed
  const day = page.locator(".month-cal button:not([disabled]), .day-chip:not([disabled]), button.day-btn:not([disabled])").first();
  if (await day.count()) {
    await day.click();
    await sleep(800);
    return true;
  }
  // Fallback: any open day in the scroller
  const chip = page.locator("[class*='day'] button, .day-scroller button").first();
  if (await chip.count()) {
    await chip.click();
    await sleep(800);
    return true;
  }
  return false;
}

async function pickFirstSlot(page) {
  const slot = page.locator(".slot-btn:not([disabled])").first();
  await slot.waitFor({ state: "visible", timeout: 25_000 });
  await sleep(600);
  await slot.click();
  await sleep(900);
  return (await slot.innerText()).trim();
}

async function clickContinua(page) {
  const btn = page.locator(".fresha-footer button.btn").filter({ hasText: /Continua|Conferma prenotazione/i });
  await btn.waitFor({ state: "visible", timeout: 15_000 });
  // Wait until enabled
  for (let i = 0; i < 40; i += 1) {
    if (await btn.isEnabled()) break;
    await sleep(250);
  }
  if (!(await btn.isEnabled())) {
    throw new Error("Wizard primary button stayed disabled");
  }
  await btn.click();
  await sleep(1100);
}

async function runBooking(page) {
  log("Scroll to #prenota");
  await smoothScrollTo(page, "#prenota", { durationMs: 3200, offset: 80 });
  await sleep(1200);

  const wizard = page.locator("#booking-wizard");
  await wizard.waitFor({ state: "visible", timeout: 20_000 });
  await wizard.scrollIntoViewIfNeeded();
  await sleep(800);

  // Dismiss cookie banner if it blocks taps
  const cookie = page.locator(".cookie-banner button, button:has-text('Accetta')").first();
  if (await cookie.count()) {
    await cookie.click().catch(() => null);
    await sleep(400);
  }

  log("Select mock service (Taglio Standard)");
  const service = page
    .locator("#booking-wizard .fresha-option")
    .filter({ hasText: /Taglio Standard|Taglio/i })
    .first();
  await service.click();
  await sleep(1000);
  await clickContinua(page);

  log("Barber step");
  // Felice is default — just continue if already selected
  const felice = page.locator("#booking-wizard .fresha-option, #booking-wizard button").filter({ hasText: /Felice/i }).first();
  if (await felice.count()) {
    await felice.click().catch(() => null);
    await sleep(700);
  }
  await clickContinua(page);

  log("Date step");
  await pickFirstAvailableDay(page);
  // Advance a few days if no slots yet — try Continua when date is set
  await clickContinua(page);

  log("Time step");
  let slotLabel = "";
  try {
    slotLabel = await pickFirstSlot(page);
  } catch {
    // Day might be full — poke next open days
    const days = page.locator(".month-cal button:not([disabled]), .day-scroller button");
    const n = Math.min(8, await days.count());
    for (let i = 1; i < n; i += 1) {
      await days.nth(i).click();
      await sleep(900);
      try {
        slotLabel = await pickFirstSlot(page);
        break;
      } catch {
        /* try next */
      }
    }
  }
  if (!slotLabel) throw new Error("No available slots found for demo booking");
  log(`Slot locked: ${slotLabel}`);
  await clickContinua(page);

  log("Fill MOCK customer (Mario Rossi)");
  await humanType(page.locator('#booking-wizard input[placeholder="Nome"]'), MOCK_CUSTOMER.firstName);
  await sleep(300);
  await humanType(page.locator('#booking-wizard input[placeholder="Cognome"]'), MOCK_CUSTOMER.lastName);
  await sleep(300);
  await humanType(page.locator('#booking-wizard input[placeholder="Email"]'), MOCK_CUSTOMER.email, {
    delayMs: 70,
  });
  await sleep(300);
  await humanType(
    page.locator('#booking-wizard input[placeholder="327 015 6225"], #booking-wizard input[type="tel"]').last(),
    MOCK_CUSTOMER.phone,
    { delayMs: 80 },
  );
  await sleep(400);
  await page.locator("#booking-wizard .gdpr-row input[type='checkbox']").check();
  await sleep(900);
  await clickContinua(page);

  log("Confirm booking");
  await sleep(800);
  await clickContinua(page); // Conferma prenotazione

  // Success screen
  await page.waitForSelector("text=Prenotazione confermata", { timeout: 30_000 });
  await sleep(2800);

  // Capture manage URL for optional cleanup (from success UI link if present)
  const manageHref = await page
    .locator('a[href*="/appuntamento/"]')
    .first()
    .getAttribute("href")
    .catch(() => null);

  return { slotLabel, manageHref };
}

async function filmGestionale(page, bookingMeta) {
  log("Open gestionale (pre-auth session — password never shown on camera)");
  await page.goto(`${BASE_URL}/gestionale`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await sleep(1500);

  // If login still shows, credentials must be missing / expired
  if (await page.locator('input[name="password"]').count()) {
    throw new Error(
      "Gestionale login visible. Run `npm run auth` first so credentials stay unrecorded.",
    );
  }

  await applyPrivacyMask(page);
  await sleep(600);

  log("Open Agenda only (skip Clienti / Statistiche / money tabs)");
  const agendaBtn = page.getByRole("button", { name: /^Agenda$/i }).first();
  if (await agendaBtn.count()) {
    await agendaBtn.click();
    await sleep(1400);
  }

  await applyPrivacyMask(page);

  // Slow pan over occupancy / agenda
  await smoothScrollBy(page, 280, 1800);
  await sleep(1600);

  if (bookingMeta?.slotLabel) {
    // Highlight mock name if visible
    const mario = page.locator("text=Mario Rossi").first();
    if (await mario.count()) {
      await mario.scrollIntoViewIfNeeded();
      await page.evaluate(() => {
        const el = [...document.querySelectorAll("*")].find((n) =>
          (n.textContent || "").includes("Mario Rossi") && n.children.length === 0,
        );
        if (el) {
          el.style.outline = "3px solid #c9a227";
          el.style.outlineOffset = "4px";
        }
      });
      await sleep(3200);
    } else {
      await sleep(2400);
    }
  } else {
    await sleep(2400);
  }

  await smoothScrollBy(page, -120, 1200);
  await sleep(1800);
}

async function cleanupBooking(context, manageHref) {
  if (!CLEANUP_BOOKING || !manageHref) return;
  const path = manageHref.startsWith("http") ? manageHref : `${BASE_URL}${manageHref}`;
  const token = path.split("/appuntamento/")[1]?.split(/[?#]/)[0];
  if (!token) return;
  log("Cleanup: cancel demo booking via API");
  const page = await context.newPage();
  try {
    await page.request.delete(`${BASE_URL}/api/bookings/${token}`);
  } catch {
    /* best-effort */
  }
  await page.close();
}

async function main() {
  if (!existsSync(authPath)) {
    console.error("Missing .auth/gestionale.json — run: npm run auth");
    process.exit(1);
  }

  log(`Recording → ${videoPath}`);
  log(`Target ${BASE_URL}`);
  log(`Mock customer: ${MOCK_CUSTOMER.firstName} ${MOCK_CUSTOMER.lastName} (test only)`);

  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-dev-shm-usage"],
  });

  const context = await browser.newContext({
    viewport: REEL_VIEWPORT,
    deviceScaleFactor: REEL_VIEWPORT.deviceScaleFactor,
    locale: "it-IT",
    timezoneId: "Europe/Rome",
    storageState: authPath,
    recordVideo: {
      dir: outDir,
      size: { width: REEL_VIEWPORT.width, height: REEL_VIEWPORT.height },
    },
    // Stable, slower animations feel
    reducedMotion: "no-preference",
  });

  // Slow down every Playwright action slightly (human pacing)
  context.setDefaultTimeout(45_000);
  const page = await context.newPage();

  // ---------- 1) Home ----------
  log("Home — slow scroll");
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle", timeout: 90_000 });
  await sleep(1800);

  const cookie = page.locator(".cookie-banner button").first();
  if (await cookie.count()) {
    await cookie.click().catch(() => null);
    await sleep(500);
  }

  // Hero hold
  await sleep(2200);
  await smoothScrollBy(page, 520, 2600);
  await sleep(1400);
  await smoothScrollBy(page, 640, 2800);
  await sleep(1200);
  await smoothScrollBy(page, 520, 2400);
  await sleep(1000);

  // ---------- 2) Booking ----------
  let bookingMeta = {};
  if (!SKIP_BOOKING) {
    try {
      bookingMeta = await runBooking(page);
    } catch (err) {
      console.warn("Booking segment failed (continuing to gestionale):", err.message);
    }
  } else {
    log("SKIP_BOOKING=1 — public scroll only before gestionale");
    await smoothScrollTo(page, "#prenota", { durationMs: 3000 });
    await sleep(2000);
  }

  // ---------- 3) Gestionale ----------
  await filmGestionale(page, bookingMeta);

  // End hold
  await sleep(2000);

  const recorded = page.video();
  await page.close();
  await context.close();
  await browser.close();

  if (recorded) {
    const tmp = await recorded.path();
    const { renameSync } = await import("node:fs");
    try {
      renameSync(tmp, videoPath);
    } catch {
      console.log(`Video left at: ${tmp}`);
    }
  }

  // Cleanup uses a fresh context (no video)
  if (bookingMeta.manageHref) {
    const c2 = await chromium.launch({ headless: true });
    const ctx2 = await c2.newContext();
    await cleanupBooking(ctx2, bookingMeta.manageHref);
    await ctx2.close();
    await c2.close();
  }

  console.log("\nDone.");
  console.log(`Video: ${videoPath}`);
  console.log("Optional MP4 (free, if ffmpeg installed):");
  console.log(
    `  ffmpeg -i output/felice-polese-reel.webm -c:v libx264 -pix_fmt yuv420p -movflags +faststart output/felice-polese-reel.mp4`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
