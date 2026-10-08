#!/usr/bin/env node
/**
 * Deletes fake reel/demo appointments from the gestionale (Mario Rossi test,
 * Verify Fix, Test Cursor). Leaves real customers untouched.
 *
 * Requires .env.video + .auth/admin.json (npm run reel:auth).
 */
import { config } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(root, ".env.video") });

const BASE = (process.env.VIDEO_BASE_URL || "").replace(/\/$/, "");
const AUTH = join(root, ".auth", "admin.json");

function assertSafeBase(url) {
  if (!url) {
    console.error("VIDEO_BASE_URL missing in .env.video");
    process.exit(1);
  }
  const host = new URL(url).hostname;
  const isProd =
    host === "felicepolesebarbershop.it" || host === "www.felicepolesebarbershop.it";
  if (isProd && process.env.VIDEO_ALLOW_PRODUCTION !== "1") {
    console.error("REFUSED: production URL without VIDEO_ALLOW_PRODUCTION=1");
    process.exit(1);
  }
}

function isFake(a) {
  const email = (a.email || "").toLowerCase();
  const phone = (a.phone || "").replace(/\s/g, "");
  const name = `${a.firstName || ""} ${a.lastName || ""}`.trim();
  if (/mario\.test@email\.it|verify-fix|test-cursor-agent@example\.com/i.test(email)) {
    return true;
  }
  if (/^verify fix$/i.test(name) || /^test cursor$/i.test(name)) return true;
  if (
    /^mario rossi$/i.test(name) &&
    (/3330000000|3331234567/.test(phone) || /mario\.test@email\.it/i.test(email))
  ) {
    return true;
  }
  return false;
}

function cookieHeader() {
  if (!existsSync(AUTH)) {
    console.error("Missing .auth/admin.json — run: npm run reel:auth");
    process.exit(1);
  }
  const auth = JSON.parse(readFileSync(AUTH, "utf8"));
  return (auth.cookies || []).map((c) => `${c.name}=${c.value}`).join("; ");
}

function dayRange(daysBack = 14, daysForward = 45) {
  const out = [];
  const today = new Date();
  today.setUTCHours(12, 0, 0, 0);
  for (let i = -daysBack; i <= daysForward; i += 1) {
    const d = new Date(today.getTime() + i * 86400000);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

assertSafeBase(BASE);
const cookie = cookieHeader();

const fakes = [];
for (const date of dayRange()) {
  const res = await fetch(`${BASE}/api/admin/appointments?date=${date}`, {
    headers: { Cookie: cookie },
  });
  if (res.status === 401) {
    console.error("Gestionale auth expired — run: npm run reel:auth");
    process.exit(1);
  }
  const j = await res.json();
  for (const a of j.appointments || []) {
    if (isFake(a)) fakes.push(a);
  }
}

if (!fakes.length) {
  console.log(JSON.stringify({ deleted: 0, message: "Nessuna prenotazione finta trovata" }));
  process.exit(0);
}

let deleted = 0;
const errors = [];
for (const a of fakes) {
  const res = await fetch(`${BASE}/api/admin/appointments/${a.id}`, {
    method: "DELETE",
    headers: { Cookie: cookie },
  });
  if (!res.ok) {
    errors.push({ id: a.id, status: res.status, body: (await res.text()).slice(0, 160) });
  } else {
    deleted += 1;
    console.log(
      `deleted ${a.dateLabel} ${a.timeLabel} ${a.firstName} ${a.lastName} <${a.email || ""}>`,
    );
  }
}

console.log(JSON.stringify({ deleted, errors, found: fakes.length }, null, 2));
if (errors.length) process.exit(1);
