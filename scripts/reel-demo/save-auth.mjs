#!/usr/bin/env node
/**
 * One-time helper: log into /gestionale and save Playwright storageState.
 * Credentials come from env / .env — never printed, never committed.
 *
 *   cp .env.example .env   # fill ADMIN_PASSWORD
 *   npm run auth
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFile, REEL_VIEWPORT, sleep } from "./lib/helpers.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnvFile(__dirname);

const BASE_URL = (process.env.BASE_URL || "https://felicepolesebarbershop.it").replace(/\/$/, "");
const user = process.env.ADMIN_USER || "admin";
const password = process.env.ADMIN_PASSWORD || "";

if (!password) {
  console.error("Set ADMIN_PASSWORD in scripts/reel-demo/.env (see .env.example).");
  process.exit(1);
}

const authDir = join(__dirname, ".auth");
mkdirSync(authDir, { recursive: true });
const out = join(authDir, "gestionale.json");

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: REEL_VIEWPORT,
  locale: "it-IT",
  timezoneId: "Europe/Rome",
});
const page = await context.newPage();

await page.goto(`${BASE_URL}/gestionale`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.waitForSelector('input[name="username"], input[name="password"]', { timeout: 30_000 });
await page.fill('input[name="username"]', user);
await page.fill('input[name="password"]', password);
await page.click('button[type="submit"]');
await sleep(1500);
// Agenda / dashboard chrome means we're in
await page.waitForSelector("text=Agenda", { timeout: 20_000 }).catch(() => null);
await context.storageState({ path: out });
await browser.close();

console.log(`Saved session → ${out}`);
console.log("You can now run: npm run record");
