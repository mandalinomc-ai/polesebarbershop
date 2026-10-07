/**
 * Shared helpers for slow, reel-friendly Playwright demos.
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

/** Instagram Reel vertical canvas */
export const REEL_VIEWPORT = Object.freeze({
  width: 1080,
  height: 1920,
  deviceScaleFactor: 1,
});

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Ease-in-out cubic for human-like scroll. */
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/**
 * Smooth scroll the page by deltaY over durationMs.
 */
export async function smoothScrollBy(page, deltaY, durationMs = 2200) {
  await page.evaluate(
    async ({ deltaY, durationMs }) => {
      const ease = (t) =>
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const start = window.scrollY;
      const t0 = performance.now();
      await new Promise((resolve) => {
        const tick = (now) => {
          const p = Math.min(1, (now - t0) / durationMs);
          window.scrollTo(0, start + deltaY * ease(p));
          if (p < 1) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      });
    },
    { deltaY, durationMs },
  );
  await sleep(400);
}

/**
 * Smooth scroll until selector is near the vertical center (or top third).
 */
export async function smoothScrollTo(page, selector, { durationMs = 2800, offset = 120 } = {}) {
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
  await smoothScrollBy(page, targetY - current, durationMs);
  return true;
}

/** Type like a human: slow per-character delay. */
export async function humanType(locator, text, { delayMs = 95 } = {}) {
  await locator.click({ delay: 40 });
  await locator.fill("");
  await locator.pressSequentially(text, { delay: delayMs });
}

/**
 * Hide / blur revenue, client lists, and sensitive CRM chrome for filming.
 * Call after gestionale is visible.
 */
export async function applyPrivacyMask(page) {
  await page.addStyleTag({
    content: `
      /* Reel privacy mask — blur money & hide sensitive nav */
      .crm-nav button, .crm-sidebar button, nav button {
        /* refined below via data attribute */
      }
      [data-reel-hide="1"] {
        display: none !important;
      }
      [data-reel-blur="1"],
      .kpi, .crm-kpis, .subscription-panel,
      [class*="incasso" i], [class*="takings" i] {
        filter: blur(14px) !important;
        user-select: none !important;
      }
      .agenda-price, .crm-table td:nth-child(n+5) {
        filter: blur(10px);
      }
    `,
  });

  await page.evaluate(() => {
    const hideRe = /clienti|statistiche|dashboard|storico|incassi|team/i;
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
    // Prefer .env over empty inherited env (Cloud agents often set ADMIN_PASSWORD="").
    if (process.env[key] === undefined || process.env[key] === "") {
      process.env[key] = val;
    }
  }
}

export { easeInOutCubic };
