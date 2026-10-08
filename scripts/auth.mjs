#!/usr/bin/env node
/**
 * One-time gestionale login → .auth/admin.json (never filmed).
 * Requires .env.video with VIDEO_BASE_URL, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD.
 *
 * Note: login field is input[name=username] — TEST_ADMIN_EMAIL holds that username.
 */
import { chromium } from "playwright";
import { config } from "dotenv";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(root, ".env.video") });

const BASE = (process.env.VIDEO_BASE_URL || "").replace(/\/$/, "");
const user = process.env.TEST_ADMIN_EMAIL || "";
const password = process.env.TEST_ADMIN_PASSWORD || "";

function assertSafeBase(url) {
  if (!url) {
    console.error("VIDEO_BASE_URL missing in .env.video");
    process.exit(1);
  }
  const host = new URL(url).hostname;
  const isProd =
    host === "felicepolesebarbershop.it" || host === "www.felicepolesebarbershop.it";
  if (isProd && process.env.VIDEO_ALLOW_PRODUCTION !== "1") {
    console.error(
      "REFUSED: VIDEO_BASE_URL points at production. Use local/staging only.\n" +
        "Set VIDEO_BASE_URL=http://127.0.0.1:3000 after supabase start + seed-video.sql.\n" +
        "(Override only with VIDEO_ALLOW_PRODUCTION=1 if you accept the risk.)",
    );
    process.exit(1);
  }
}

assertSafeBase(BASE);
if (!user || !password) {
  console.error("Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD in .env.video");
  process.exit(1);
}

const authDir = join(root, ".auth");
mkdirSync(authDir, { recursive: true });
const out = join(authDir, "admin.json");

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 540, height: 960 },
  locale: "it-IT",
  timezoneId: "Europe/Rome",
});
const page = await context.newPage();
await page.goto(`${BASE}/gestionale`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.waitForSelector('input[name="password"]', { timeout: 30_000 });
await page.fill('input[name="username"]', user);
await page.fill('input[name="password"]', password);
await page.click('button[type="submit"]');
await page.getByRole("button", { name: /^Agenda$/i }).waitFor({ timeout: 25_000 });
await context.storageState({ path: out });
await browser.close();
console.log(`Saved ${out}`);
