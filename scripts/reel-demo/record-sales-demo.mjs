#!/usr/bin/env node
/**
 * Felice Polese — sales presentation (1920×1080)
 * Site tour with videos → mock booking → gestionale (privacy masked)
 */
import { chromium } from "playwright";
import { existsSync, mkdirSync, renameSync, unlinkSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  MOCK_CUSTOMER,
  SALES_VIEWPORT,
  applyPrivacyMask,
  ensureVideosPlaying,
  humanType,
  loadEnvFile,
  sleep,
  smoothScrollBy,
  smoothScrollTo,
} from "./lib/helpers.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnvFile(__dirname);

const BASE_URL = (process.env.BASE_URL || "https://felicepolesebarbershop.it").replace(/\/$/, "");
const CLEANUP_BOOKING = process.env.CLEANUP_BOOKING !== "0";
const authPath = join(__dirname, ".auth", "gestionale.json");
const outDir = join(__dirname, "output");
mkdirSync(outDir, { recursive: true });
const rawWebm = join(outDir, "raw.webm");
const finalMp4 = join(outDir, "felice-polese-presentazione.mp4");
const artifactsMp4 = "/opt/cursor/artifacts/felice-polese-presentazione.mp4";

const log = (s) => console.log(`→ ${s}`);

async function safeVideos(page) {
  try {
    await ensureVideosPlaying(page);
  } catch {
    /* page closed / transient */
  }
}

async function clickContinua(page) {
  const btn = page.locator(".fresha-footer button.btn").filter({ hasText: /Continua|Conferma prenotazione/i });
  await btn.waitFor({ state: "visible", timeout: 20_000 });
  for (let i = 0; i < 40; i += 1) {
    if (await btn.isEnabled()) break;
    await sleep(200);
  }
  await btn.click();
  await sleep(900);
}

async function pickDayWithSlots(page) {
  const days = page.locator("#booking-wizard button.cal-day:not(.muted):not([disabled])");
  const n = await days.count();
  const order = [...Array(n).keys()].sort((a, b) => (a < 2 && b >= 2 ? 1 : b < 2 && a >= 2 ? -1 : a - b));
  for (const i of order) {
    const day = days.nth(i);
    log(`Day ${(await day.innerText()).trim()}`);
    await day.click();
    await sleep(600);
    const step = await page.locator(".fresha-step-label").innerText().catch(() => "");
    if (/Data/i.test(step)) await clickContinua(page);
    try {
      const slot = page.locator("#booking-wizard .slot-btn:not([disabled])").first();
      await slot.waitFor({ state: "visible", timeout: 10_000 });
      await sleep(400);
      await slot.click();
      await sleep(700);
      return (await slot.innerText()).trim();
    } catch {
      const back = page.locator("#booking-wizard button.fresha-back").filter({ hasText: /Indietro/i });
      if (await back.count()) {
        await back.click();
        await sleep(600);
      }
    }
  }
  return "";
}

async function section(page, sel, holdMs, scrollMs = 2200) {
  log(sel);
  const ok = await smoothScrollTo(page, sel, { durationMs: scrollMs, offset: 60 });
  if (!ok) return;
  await safeVideos(page);
  await sleep(holdMs);
}

async function main() {
  for (const p of [
    rawWebm,
    finalMp4,
    artifactsMp4,
    join(outDir, "felice-polese-reel.webm"),
    join(outDir, "felice-polese-reel.mp4"),
    "/opt/cursor/artifacts/felice-polese-instagram-reel.mp4",
    "/opt/cursor/artifacts/felice-polese-instagram-reel.webm",
  ]) {
    try {
      if (existsSync(p)) unlinkSync(p);
    } catch {
      /* */
    }
  }
  // clear leftover playwright temps
  spawnSync("bash", ["-lc", `rm -f ${outDir}/page@*.webm`], { encoding: "utf8" });

  if (!existsSync(authPath)) {
    console.error("Run npm run auth first");
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--disable-dev-shm-usage",
      "--autoplay-policy=no-user-gesture-required",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
    ],
  });

  const context = await browser.newContext({
    viewport: SALES_VIEWPORT,
    locale: "it-IT",
    timezoneId: "Europe/Rome",
    storageState: authPath,
    recordVideo: {
      dir: outDir,
      size: { width: SALES_VIEWPORT.width, height: SALES_VIEWPORT.height },
    },
  });

  // Skip scissors intro so the tour starts on real content immediately
  await context.addInitScript(() => {
    try {
      localStorage.setItem("felice-polese-scissors-intro-seen", "1");
    } catch {
      /* */
    }
  });

  context.setDefaultTimeout(30_000);
  const page = await context.newPage();

  log("Home");
  await page.goto(`${BASE_URL}/`, { waitUntil: "commit", timeout: 45_000 });
  await page.waitForSelector("#hero", { timeout: 25_000 });
  log("Hero visible");
  await page.locator(".cookie-banner button").first().click({ timeout: 3000 }).catch(() => null);
  await sleep(1500);
  await safeVideos(page);
  await sleep(2800);
  await safeVideos(page);
  await smoothScrollBy(page, 380, 2000);
  await sleep(1000);

  await section(page, "#prenota", 2600, 2600);
  await smoothScrollBy(page, 300, 1600);
  await sleep(900);

  await section(page, "#about", 3600, 2400);
  await safeVideos(page);
  await sleep(1600);

  if (await page.locator("#gallery").count()) {
    await section(page, "#gallery", 3000, 2200);
    await safeVideos(page);
    await smoothScrollBy(page, 420, 2000);
    await safeVideos(page);
    await sleep(1600);
  }
  if (await page.locator("#trattamenti").count()) {
    await section(page, "#trattamenti", 2800, 2000);
    await safeVideos(page);
    await smoothScrollBy(page, 380, 1800);
    await sleep(1400);
  }

  await section(page, "#prodotti", 2200, 2000);
  await section(page, "#social", 1800, 1800);
  await section(page, "#contact", 1600, 1600);

  // —— Booking ——
  let manageHref = null;
  try {
    log("Booking");
    await smoothScrollTo(page, "#prenota", { durationMs: 2400, offset: 50 });
    await sleep(800);
    const card = page.locator(".listino-box").filter({ hasText: /Taglio Standard/i }).first();
    await card.scrollIntoViewIfNeeded();
    await sleep(600);
    await card.locator("button.btn-listino-prenota").click();
    await sleep(1200);
    const goCal = page.getByRole("button", { name: /Prenota sul calendario/i }).first();
    if (await goCal.isVisible().catch(() => false)) await goCal.click();
    await page.locator("#booking-wizard").scrollIntoViewIfNeeded();
    await sleep(800);
    const felice = page.locator("#booking-wizard button").filter({ hasText: /Felice/i }).first();
    if (await felice.count()) await felice.click().catch(() => null);
    await sleep(500);
    await clickContinua(page);
    const slot = await pickDayWithSlots(page);
    if (!slot) throw new Error("no slots");
    log(`Slot ${slot}`);
    await clickContinua(page);
    await humanType(page.locator('#booking-wizard input[placeholder="Nome"]'), MOCK_CUSTOMER.firstName, { delayMs: 45 });
    await humanType(page.locator('#booking-wizard input[placeholder="Cognome"]'), MOCK_CUSTOMER.lastName, { delayMs: 45 });
    await humanType(page.locator('#booking-wizard input[placeholder="Email"]'), MOCK_CUSTOMER.email, { delayMs: 35 });
    await humanType(page.locator('#booking-wizard input[type="tel"]').last(), MOCK_CUSTOMER.phone, { delayMs: 40 });
    await page.locator("#booking-wizard .gdpr-row input[type='checkbox']").check();
    await sleep(600);
    await clickContinua(page);
    await sleep(500);
    await clickContinua(page);
    await page.waitForSelector("text=Prenotazione confermata", { timeout: 25_000 });
    await sleep(2800);
    manageHref = await page.locator('a[href*="/appuntamento/"]').first().getAttribute("href").catch(() => null);
  } catch (e) {
    console.warn("Booking skipped:", e.message);
  }

  // —— Gestionale ——
  log("Gestionale");
  await page.goto(`${BASE_URL}/gestionale`, { waitUntil: "commit", timeout: 45_000 });
  await page.waitForSelector("text=Agenda", { timeout: 20_000 });
  if (await page.locator('input[name="password"]').count()) throw new Error("auth expired — npm run auth");
  await applyPrivacyMask(page);
  await sleep(800);

  async function tab(name) {
    const b = page.getByRole("button", { name: new RegExp(`^${name}$`, "i") }).first();
    if (await b.count()) {
      await b.click();
      await sleep(1200);
      await applyPrivacyMask(page);
    }
  }

  await tab("Agenda");
  await sleep(1000);
  await smoothScrollBy(page, 220, 1400);
  await sleep(1800);
  const off = page.locator("button.offline-day-btn").first();
  if (await off.count()) {
    await off.scrollIntoViewIfNeeded();
    await sleep(1800);
  }
  const table = page.locator(".occupancy-table, .crm-table").first();
  if (await table.count()) {
    await table.scrollIntoViewIfNeeded();
    await sleep(2200);
  }
  const mario = page.locator("text=Mario Rossi").first();
  if (await mario.count()) {
    await mario.scrollIntoViewIfNeeded();
    await sleep(2000);
  }

  await tab("Listino");
  await sleep(2000);
  await smoothScrollBy(page, 180, 1200);
  await sleep(1200);

  await tab("Team");
  await sleep(1800);

  await tab("Agenda");
  await sleep(2000);

  const video = page.video();
  await page.close();
  await context.close();
  await browser.close();

  const tmp = video ? await video.path() : null;
  if (!tmp) throw new Error("no video");
  renameSync(tmp, rawWebm);

  if (CLEANUP_BOOKING && manageHref) {
    const token = manageHref.split("/appuntamento/")[1]?.split(/[?#]/)[0];
    if (token) {
      log("Cleanup booking");
      const b2 = await chromium.launch({ headless: true });
      const c2 = await b2.newContext();
      await c2.request.delete(`${BASE_URL}/api/bookings/${token}`).catch(() => null);
      await c2.close();
      await b2.close();
    }
  }

  log("ffmpeg");
  const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", rawWebm], {
    encoding: "utf8",
  });
  const dur = Math.max(3, Number(probe.stdout?.trim()) || 60);
  const fadeOut = Math.max(1, dur - 0.8);
  const ff = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      rawWebm,
      "-vf",
      `fade=t=in:st=0:d=0.5,fade=t=out:st=${fadeOut.toFixed(2)}:d=0.75`,
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "19",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-an",
      finalMp4,
    ],
    { encoding: "utf8" },
  );
  if (ff.status !== 0) {
    console.error(ff.stderr?.slice(-600));
    throw new Error("ffmpeg failed");
  }
  try {
    unlinkSync(rawWebm);
  } catch {
    /* */
  }
  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  copyFileSync(finalMp4, artifactsMp4);
  console.log("\nDone:", artifactsMp4);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
