#!/usr/bin/env node
/**
 * Vertical 9:16 slow-mode reel capture (site + gestionale).
 * Uses .env.video — refuses production hosts unless VIDEO_ALLOW_PRODUCTION=1.
 */
import { chromium } from "playwright";
import { config } from "dotenv";
import { existsSync, mkdirSync, renameSync, readdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(root, ".env.video") });

const BASE = (process.env.VIDEO_BASE_URL || "").replace(/\/$/, "");
const AUTH = join(root, ".auth", "admin.json");

const VIEW = {
  viewport: { width: 540, height: 960 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: "it-IT",
  timezoneId: "Europe/Rome",
};

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
      "REFUSED: production URL. Use local/staging VIDEO_BASE_URL (see .env.video.example).",
    );
    process.exit(1);
  }
}

assertSafeBase(BASE);
if (!existsSync(AUTH)) {
  console.error("Missing .auth/admin.json — run: npm run reel:auth");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function slowScrollBy(page, deltaY, durationMs = 2800) {
  const steps = Math.max(24, Math.round(durationMs / 16));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  const start = await page.evaluate(() => window.scrollY);
  for (let i = 1; i <= steps; i += 1) {
    const y = start + deltaY * ease(i / steps);
    await page.evaluate((next) => window.scrollTo(0, next), y);
    await sleep(durationMs / steps);
  }
}

async function slowScrollTo(page, selector, { offset = 72, durationMs = 3200 } = {}) {
  const target = await page.evaluate(
    ({ selector, offset }) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      return Math.max(0, el.getBoundingClientRect().top + window.scrollY - offset);
    },
    { selector, offset },
  );
  if (target == null) throw new Error(`Missing selector ${selector}`);
  const cur = await page.evaluate(() => window.scrollY);
  await slowScrollBy(page, target - cur, durationMs);
}

async function injectFakeCursor(context) {
  await context.addInitScript(() => {
    const boot = () => {
      if (document.getElementById("reel-fake-cursor")) return;
      const c = document.createElement("div");
      c.id = "reel-fake-cursor";
      c.setAttribute(
        "style",
        "position:fixed;z-index:2147483647;width:22px;height:22px;margin:-11px 0 0 -11px;" +
          "border-radius:50%;background:rgba(201,162,75,.85);border:2px solid #fff;" +
          "box-shadow:0 2px 10px rgba(0,0,0,.35);pointer-events:none;top:0;left:0;" +
          "transition:transform .05s linear;",
      );
      document.documentElement.appendChild(c);
      const move = (x, y) => {
        c.style.transform = `translate(${x}px,${y}px)`;
      };
      window.addEventListener("mousemove", (e) => move(e.clientX, e.clientY), true);
      window.addEventListener(
        "touchmove",
        (e) => {
          const t = e.touches[0];
          if (t) move(t.clientX, t.clientY);
        },
        { passive: true, capture: true },
      );
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
  });
}

async function dismissCookies(page) {
  const accept = page.getByRole("button", { name: /^Accetta$/i }).first();
  if (await accept.isVisible().catch(() => false)) {
    await accept.click({ force: true }).catch(() => null);
    await sleep(400);
  }
  await page
    .locator(".cookie-banner, [class*='cookie']")
    .evaluateAll((nodes) => {
      for (const n of nodes) n.style.setProperty("display", "none", "important");
    })
    .catch(() => null);
}

async function injectPrivacyCss(page) {
  try {
    await page.addStyleTag({
      content: `
        .crm-kpis,
        .crm-kpi,
        .takings,
        .subscription-panel,
        .fab-stack,
        .booking-mini-cart-dock,
        .agenda-price,
        .cookie-banner { display: none !important; }
      `,
    });
  } catch {
    await page.evaluate(() => {
      if (!document.head) return;
      const id = "reel-privacy-css";
      if (document.getElementById(id)) return;
      const s = document.createElement("style");
      s.id = id;
      s.textContent =
        ".crm-kpis,.crm-kpi,.takings,.subscription-panel,.fab-stack,.booking-mini-cart-dock,.agenda-price,.cookie-banner{display:none!important}";
      document.head.appendChild(s);
    }).catch(() => null);
  }
  await page
    .evaluate(() => {
      if (!document.body) return;
      const hide = /clienti|statistiche|storico|dashboard|incasso/i;
      document.querySelectorAll("button, a, [role='tab'], section, article, div").forEach((el) => {
        const t = (el.textContent || "").trim();
        if (!t || t.length > 80) return;
        if (/^Incasso/i.test(t) || (hide.test(t) && t.length < 40)) {
          const card = el.closest(".kpi-card, .crm-kpis, .takings, section, article") || el;
          card.style.setProperty("display", "none", "important");
        }
      });
    })
    .catch(() => null);
}

async function humanType(locator, text) {
  await locator.click();
  await locator.fill("");
  await locator.pressSequentially(text, { delay: 110 });
}

async function clickContinua(page) {
  const btn = page
    .locator(".fresha-footer button.btn")
    .filter({ hasText: /Continua|Conferma prenotazione/i });
  await btn.waitFor({ state: "visible", timeout: 20_000 });
  for (let i = 0; i < 40; i += 1) {
    if (await btn.isEnabled()) break;
    await sleep(200);
  }
  if (!(await btn.isEnabled())) throw new Error("Wizard Continua/Conferma disabled");
  await btn.click();
  await sleep(900);
}

const IT_MONTHS = {
  gennaio: "01",
  febbraio: "02",
  marzo: "03",
  aprile: "04",
  maggio: "05",
  giugno: "06",
  luglio: "07",
  agosto: "08",
  settembre: "09",
  ottobre: "10",
  novembre: "11",
  dicembre: "12",
};

function italianDateToIso(text) {
  if (!text) return null;
  const iso = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const m = text.match(/(\d{1,2})\s+([a-zà]+)\s+(\d{4})/i);
  if (!m) return null;
  const month = IT_MONTHS[m[2].toLowerCase()];
  if (!month) return null;
  return `${m[3]}-${month}-${String(m[1]).padStart(2, "0")}`;
}

async function pickSlot(page) {
  const days = page.locator("#booking-wizard button.cal-day:not(.muted):not([disabled])");
  const n = await days.count();
  const order = [...Array(n).keys()].sort((a, b) =>
    a < 2 && b >= 2 ? 1 : b < 2 && a >= 2 ? -1 : a - b,
  );
  for (const i of order) {
    const dayBtn = days.nth(i);
    const aria = (await dayBtn.getAttribute("aria-label")) || "";
    await dayBtn.click();
    await sleep(500);
    const step = await page.locator(".fresha-step-label").innerText().catch(() => "");
    if (/Data/i.test(step)) await clickContinua(page);
    try {
      const slot = page.locator("#booking-wizard .slot-btn:not([disabled])").first();
      await slot.waitFor({ state: "visible", timeout: 8000 });
      await slot.click();
      await sleep(700);
      return { ok: true, dateIso: italianDateToIso(aria), aria };
    } catch {
      const back = page
        .locator("#booking-wizard button.fresha-back")
        .filter({ hasText: /Indietro/i });
      if (await back.count()) await back.click();
      await sleep(500);
    }
  }
  return { ok: false, dateIso: null, aria: "" };
}

function claimVideo(dir, dest) {
  const files = readdirSync(dir).filter((f) => f.endsWith(".webm"));
  if (!files.length) throw new Error(`No webm in ${dir}`);
  files.sort();
  renameSync(join(dir, files[files.length - 1]), dest);
  for (const f of files.slice(0, -1)) {
    try {
      unlinkSync(join(dir, f));
    } catch {
      /* */
    }
  }
}

async function recordSite() {
  const dir = join(root, "video", "site");
  mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--disable-dev-shm-usage",
      "--autoplay-policy=no-user-gesture-required",
      "--disable-background-timer-throttling",
    ],
  });
  const context = await browser.newContext({
    ...VIEW,
    recordVideo: { dir, size: { width: 1080, height: 1920 } },
  });
  await injectFakeCursor(context);
  await context.addInitScript(() => {
    try {
      localStorage.setItem("felice-polese-scissors-intro-seen", "1");
      localStorage.setItem(
        "polese_cookie_consent",
        JSON.stringify({
          necessary: true,
          preferences: true,
          updatedAt: new Date().toISOString(),
          version: 1,
        }),
      );
    } catch {
      /* */
    }
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/`, { waitUntil: "commit", timeout: 60_000 });
  await page.waitForSelector("#hero", { timeout: 30_000 });
  await dismissCookies(page);
  await page.waitForFunction(() => /Felice Polese/i.test(document.title || ""), null, {
    timeout: 10_000,
  });
  // Hold hero so the reel doesn't open on a blank paint frame
  await page.waitForSelector("#hero, header, .site-header", { timeout: 15_000 }).catch(() => null);
  await sleep(3500);

  await slowScrollBy(page, 420, 2400);
  await sleep(600);
  await slowScrollTo(page, "#prenota", { durationMs: 3600, offset: 56 });
  await sleep(1200);

  const card = page.locator(".listino-box").filter({ hasText: /Taglio Standard/i }).first();
  await card.scrollIntoViewIfNeeded();
  await sleep(600);
  await card.locator("button.btn-listino-prenota").click();
  await sleep(1100);
  const goCal = page.getByRole("button", { name: /Prenota sul calendario/i }).first();
  if (await goCal.isVisible().catch(() => false)) await goCal.click();
  await page.locator("#booking-wizard").scrollIntoViewIfNeeded();
  await sleep(800);

  const felice = page.locator("#booking-wizard button").filter({ hasText: /Felice/i }).first();
  if (await felice.count()) await felice.click().catch(() => null);
  await sleep(400);
  await clickContinua(page);

  const picked = await pickSlot(page);
  if (!picked.ok) throw new Error("No available slots for demo booking");
  await clickContinua(page);

  await humanType(page.locator('#booking-wizard input[placeholder="Nome"]'), "Mario");
  await humanType(page.locator('#booking-wizard input[placeholder="Cognome"]'), "Rossi");
  await humanType(
    page.locator('#booking-wizard input[placeholder="Email"]'),
    "mario.test@email.it",
  );
  await humanType(page.locator('#booking-wizard input[type="tel"]').last(), "3330000000");
  await page.locator("#booking-wizard .gdpr-row input[type='checkbox']").check();
  await sleep(700);
  await clickContinua(page);
  await sleep(500);
  await clickContinua(page);

  await page.waitForSelector("text=Prenotazione confermata", { timeout: 30_000 });
  await sleep(2500);

  let dateIso = picked.dateIso;
  if (!dateIso) {
    const when = await page
      .locator(".success-details, .summary-list, .fresha-body")
      .innerText()
      .catch(() => "");
    dateIso = italianDateToIso(when);
  }
  console.log(`Site booking dateIso=${dateIso || "unknown"} aria=${picked.aria || ""}`);

  await page.close();
  await context.close();
  await browser.close();
  claimVideo(dir, join(root, "video", "site.webm"));
  return { dateIso };
}

async function recordAdmin(bookingMeta = {}) {
  const dir = join(root, "video", "admin");
  mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-dev-shm-usage", "--disable-background-timer-throttling"],
  });
  const context = await browser.newContext({
    ...VIEW,
    storageState: AUTH,
    recordVideo: { dir, size: { width: 1080, height: 1920 } },
  });
  await injectFakeCursor(context);
  await context.addInitScript(() => {
    try {
      localStorage.setItem(
        "polese_cookie_consent",
        JSON.stringify({
          necessary: true,
          preferences: true,
          updatedAt: new Date().toISOString(),
          version: 1,
        }),
      );
    } catch {
      /* */
    }
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/gestionale`, { waitUntil: "commit", timeout: 60_000 });
  if (await page.locator('input[name="password"]').count()) {
    throw new Error("Gestionale login visible — re-run npm run reel:auth on local/staging");
  }

  await dismissCookies(page);
  await injectPrivacyCss(page);

  const agenda = page.getByRole("button", { name: /^Agenda$/i }).first();
  await agenda.waitFor({ timeout: 20_000 });
  await agenda.click();
  await sleep(1000);
  await injectPrivacyCss(page);

  // Jump agenda date to the day we just booked
  if (bookingMeta.dateIso) {
    const dateInput = page.locator('input[type="date"]').first();
    if (await dateInput.count()) {
      await dateInput.fill(bookingMeta.dateIso);
      await sleep(1200);
      await injectPrivacyCss(page);
    }
  }

  // Mask any customer labels that are not Mario / Cliente Demo*
  const maskNames = async () => {
    await page.evaluate(() => {
      const allow = /Mario Rossi|Cliente Demo/i;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      for (const node of nodes) {
        let text = node.textContent || "";
        if (!text.trim()) continue;
        // Rewrite "Someone - Taglio…" / "Verify Fix — …" but keep Mario Rossi
        text = text.replace(
          /([A-ZÀ-Ü][\wÀ-ü'’. -]{1,40}?)\s*[-–—]\s*(Taglio|Barba|Acconciatura|Piega)/gi,
          (full, head, svc) => {
            const h = String(head).trim();
            if (allow.test(h)) return full;
            return `Cliente Demo — ${svc}`;
          },
        );
        text = text.replace(/\bVerify Fix\b/gi, "Cliente Demo");
        if (text !== node.textContent) node.textContent = text;
      }
    });
  };
  await maskNames();

  const mario = page.locator("text=Mario Rossi").first();
  try {
    await mario.waitFor({ state: "visible", timeout: 15_000 });
  } catch {
    throw new Error(
      "Mario Rossi not in agenda within 15s — aborting (wrong day / booking failed).",
    );
  }
  await maskNames();

  const bad = await page.evaluate(() => {
    const nodes = [
      ...document.querySelectorAll(
        ".occupancy-block, .agenda-card p, .agenda-card strong, .occupancy-taken",
      ),
    ];
    const suspects = [];
    for (const n of nodes) {
      const t = (n.textContent || "").trim().replace(/\s+/g, " ");
      if (!t || t.length < 3 || t.length > 48) continue;
      if (
        /€|Incasso|Standard|Taglio|Barba|min|confermat|Non disponib|Operatore|Pausa|Cliente Demo/i.test(
          t,
        )
      ) {
        continue;
      }
      if (/Mario Rossi/i.test(t)) continue;
      if (/^[A-ZÀ-Ü][a-zà-ü]+\s+[A-ZÀ-Ü][a-zà-ü]+/.test(t)) suspects.push(t);
    }
    return [...new Set(suspects)];
  });
  if (bad.length) {
    console.warn(`Masked leftover names still visible: ${bad.slice(0, 5).join(", ")}`);
    await maskNames();
  }
  if (bad.length && process.env.VIDEO_ALLOW_PRODUCTION !== "1") {
    throw new Error(`Unexpected names in agenda (abort): ${bad.slice(0, 5).join(", ")}`);
  }

  await mario.scrollIntoViewIfNeeded();
  await slowScrollBy(page, 120, 1400);
  await page.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find(
      (n) => (n.textContent || "").includes("Mario Rossi") && n.children.length <= 2,
    );
    if (!el) return;
    el.style.outline = "3px solid #c9a24b";
    el.style.outlineOffset = "6px";
    el.style.transition = "transform 1.8s ease";
    el.style.transform = "scale(1.06)";
  });
  await maskNames();
  await injectPrivacyCss(page);
  await sleep(4000);
  await maskNames();

  await page.close();
  await context.close();
  await browser.close();
  claimVideo(dir, join(root, "video", "admin.webm"));
}

mkdirSync(join(root, "video"), { recursive: true });
console.log(`Recording against ${BASE}`);
const bookingMeta = await recordSite();
await recordAdmin(bookingMeta);
console.log("Wrote video/site.webm and video/admin.webm");
