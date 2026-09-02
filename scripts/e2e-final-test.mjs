#!/usr/bin/env node
/**
 * End-to-end checks for final-ready branch.
 * Usage: node scripts/e2e-final-test.mjs [baseUrl]
 */
import { readFileSync } from "node:fs";

function loadEnv() {
  const env = {};
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      if (!line || line.startsWith("#")) continue;
      const i = line.indexOf("=");
      env[line.slice(0, i)] = line.slice(i + 1).replace(/^"|"$/g, "");
    }
  } catch {
    /* optional */
  }
  return env;
}

const env = loadEnv();
const BASE = process.argv[2] || "http://localhost:3000";
const ADMIN_USER = env.ADMIN_USER || "admin";
const ADMIN_PASSWORD = env.ADMIN_PASSWORD || "admin";

const results = [];

function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
  const mark = pass ? "PASS" : "FAIL";
  console.log(`${mark} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function loginAdmin() {
  const res = await fetch(`${BASE}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASSWORD }),
  });
  const setCookie = res.headers.getSetCookie?.() || [];
  const cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok && json.ok, cookie };
}

async function main() {
  console.log(`\nE2E final test @ ${BASE}\n`);

  // 1. Booking create — unique slot to avoid 409 from prior runs
  const bookDate = "2026-09-22";
  const availRes = await fetch(
    `${BASE}/api/availability?date=${bookDate}&barberId=felice&serviceIds=taglio-standard`,
  );
  const availJson = await availRes.json().catch(() => ({}));
  const firstSlot = (availJson.slots || []).find((s) => s.available !== false && s.booked !== true);
  const startTime = firstSlot?.label || "10:00";
  const uniqueEmail = `test-finale-${Date.now()}@gmail.com`;
  const bookBody = {
    firstName: "Test",
    lastName: "Finale",
    email: uniqueEmail,
    phone: `+39333${String(Date.now()).slice(-7)}`,
    serviceIds: ["taglio-standard"],
    barberId: "felice",
    date: bookDate,
    startTime,
    gdprConsent: true,
  };
  const bookRes = await fetch(`${BASE}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bookBody),
  });
  const bookJson = await bookRes.json().catch(() => ({}));
  record(
    "booking create",
    bookRes.ok && bookJson.ok,
    `status=${bookRes.status} persisted=${bookJson.persisted} emailSent=${bookJson.emailSent}`,
  );
  const appointmentId = bookJson.appointmentId;

  // 2. Overlap 409
  const overlapRes = await fetch(`${BASE}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...bookBody, email: "test2@example.com", phone: "+393331112234" }),
  });
  record("overlap 409", overlapRes.status === 409, `status=${overlapRes.status}`);

  // 3. Cross-barber OK (same time, different barber)
  const crossRes = await fetch(`${BASE}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...bookBody,
      barberId: "davide",
      email: "test-cross@example.com",
      phone: "+393331112235",
    }),
  });
  const crossJson = await crossRes.json().catch(() => ({}));
  record("cross-barber OK", crossRes.ok && crossJson.ok, `status=${crossRes.status}`);
  const crossId = crossJson.appointmentId;

  // 4. Admin login + CRM
  const { ok: loggedIn, cookie } = await loginAdmin();
  record("gestionale login", loggedIn);

  const crmRes = await fetch(`${BASE}/api/admin/crm`, { headers: { Cookie: cookie } });
  const crmJson = await crmRes.json().catch(() => ({}));
  record("CRM load", crmRes.ok && Array.isArray(crmJson.clients), `clients=${crmJson.clients?.length}`);

  // 5. Notes save/reload
  const testClient = crmJson.clients?.find((c) => c.email === uniqueEmail);
  const clientKey = testClient?.key || `e:${uniqueEmail.toLowerCase()}`;
  const noteText = `Nota test ${Date.now()}`;
  const patchRes = await fetch(`${BASE}/api/admin/crm`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ clientKey, notes: noteText }),
  });
  const patchJson = await patchRes.json().catch(() => ({}));
  record(
    "notes save",
    patchRes.ok && patchJson.ok,
    `source=${patchJson.notesSource || "?"} status=${patchRes.status}`,
  );

  const crm2 = await fetch(`${BASE}/api/admin/crm`, { headers: { Cookie: cookie } }).then((r) => r.json());
  const reloaded = crm2.clients?.find((c) => c.key === clientKey);
  record(
    "notes reload",
    reloaded?.crmNotes === noteText,
    `got="${(reloaded?.crmNotes || "").slice(0, 40)}"`,
  );

  // 6. Move appointment
  if (appointmentId) {
    const moveRes = await fetch(`${BASE}/api/admin/appointments`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        id: appointmentId,
        date: "2026-09-16",
        startTime: "11:00",
        barberId: "davide",
      }),
    });
    const moveJson = await moveRes.json().catch(() => ({}));
    record("move appointment", moveRes.ok && moveJson.ok, `status=${moveRes.status}`);
  }

  // 7. Cancel + storico
  if (appointmentId) {
    const cancelRes = await fetch(`${BASE}/api/admin/appointments`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ id: appointmentId, status: "cancelled" }),
    });
    const cancelJson = await cancelRes.json().catch(() => ({}));
    record("cancel appointment", cancelRes.ok && cancelJson.ok, `status=${cancelJson.appointment?.status}`);
  }

  const histRes = await fetch(`${BASE}/api/admin/history`, { headers: { Cookie: cookie } });
  const histJson = await histRes.json().catch(() => ({}));
  const annullata = (histJson.appointments || []).find((i) => i.id === appointmentId);
  record(
    "storico ANNULLATA",
    annullata?.status === "cancelled",
    annullata ? `status=${annullata.status} label=${annullata.statusLabel}` : "not found",
  );

  // 9. WhatsApp — no server API keys in env
  const waConfigured = Boolean(
    (env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID) ||
      (env.CONVERSATION_APP_ID && env.SINCH_PROJECT_ID),
  );
  record(
    "whatsapp automatic API",
    !waConfigured,
    waConfigured ? "Meta/Sinch configured" : "no — wa.me manual only (expected)",
  );
  if (env.RESEND_API_KEY?.startsWith("re_")) {
    const { Resend } = await import("resend");
    const resend = new Resend(env.RESEND_API_KEY);
    const toCustomer = env.NOTIFY_EMAIL || "mandalinomc@gmail.com";
    const toSalon = env.ADMIN_EMAIL || "felicepolese550@gmail.com";
    const cust = await resend.emails.send({
      from: env.RESEND_FROM || "Felice Polese <onboarding@resend.dev>",
      to: toCustomer,
      subject: "Test finale cliente",
      text: "Test email cliente",
    });
    const salon = await resend.emails.send({
      from: env.RESEND_FROM || "Felice Polese <onboarding@resend.dev>",
      to: toSalon,
      subject: "Test finale salone",
      text: "Test email salone",
    });
    record(
      "email customer attempt",
      !cust.error,
      cust.error?.message || `id=${cust.data?.id}`,
    );
    record(
      "email salon attempt (felice)",
      Boolean(salon.error),
      salon.error?.message || `unexpected id=${salon.data?.id}`,
    );
  } else {
    record("email customer attempt", false, "no RESEND_API_KEY");
    record("email salon attempt", false, "no RESEND_API_KEY");
  }

  // 8. Email test (direct Resend)
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    for (const id of [appointmentId, crossId].filter(Boolean)) {
      await sb.from("appointments").delete().eq("id", id);
    }
  }

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\nSummary: ${passed} pass, ${failed} fail\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
