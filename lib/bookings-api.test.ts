import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/bookings/route";
import { DELETE, GET } from "@/app/api/bookings/[token]/route";

const ENV_KEYS = [
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SECRET_KEY",
  "RESEND_API_KEY",
];

function withoutCloud() {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });
  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });
}

function payload(overrides: Record<string, unknown> = {}) {
  return {
    serviceIds: ["taglio-pro"],
    barberId: "felice",
    date: "2026-09-08",
    startTime: "09:30",
    firstName: "Mario",
    lastName: "Rossi",
    email: "mario@example.com",
    phone: "+393331112233",
    gdprConsent: true,
    ...overrides,
  };
}

async function postBooking(body: unknown) {
  return POST(
    new Request("http://localhost/api/bookings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/bookings", () => {
  withoutCloud();
  it("rejects missing GDPR consent (Zod, server-side)", async () => {
    const res = await postBooking(payload({ gdprConsent: false }));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toMatch(/consenso/i);
  });

  it("rejects Razor Taper and Skin Fade as bookable leftover services", async () => {
    expect((await postBooking(payload({ serviceIds: ["razor-taper"] }))).status).toBe(400);
    expect((await postBooking(payload({ serviceIds: ["skin-fade"] }))).status).toBe(400);
  });

  it("rejects unknown leftover services such as Taglio sartoriale", async () => {
    const res = await postBooking(payload({ serviceIds: ["taglio-sartoriale"] }));
    expect(res.status).toBe(400);
  });

  it("confirms with ICS VALARM 30 min even without Supabase/Resend", async () => {
    const res = await postBooking(payload());
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      ok: boolean;
      persisted: boolean;
      emailSent: boolean;
      confirmViaWhatsApp?: boolean;
      salonWhatsAppSent?: boolean;
      customerWhatsAppSent?: boolean;
      salonRelay?: { to?: string; subject: string; message: string } | null;
      ics: string;
      warnings: string[];
      barberName: string;
      timeLabel: string;
      manageUrl: string;
    };
    expect(json.ok).toBe(true);
    expect(json.persisted).toBe(false);
    expect(json.emailSent).toBe(false);
    expect(json.barberName).toBe("Felice");
    expect(json.timeLabel).toBe("09:30");
    expect(json.ics).toContain("BEGIN:VALARM");
    expect(json.ics).toContain("TRIGGER:-PT30M");
    expect(json.ics.match(/BEGIN:VALARM/g)).toEqual(["BEGIN:VALARM"]);
    expect(json.ics).not.toMatch(/TRIGGER:-PT1H/);
    expect(json.ics).not.toMatch(/TRIGGER:-P1D/);
    expect(json.ics).toContain("Corso Dante 45");
    expect(json.ics).toContain("+39 327 015 6225");
    expect(json.warnings.length).toBeGreaterThan(0);
    expect(json.warnings.some((w) => /ics|327 015 6225/i.test(w))).toBe(true);
    expect(json.warnings.filter((w) => /^Email admin:/i.test(w))).toEqual([]);
    expect(json.warnings.join("\n")).not.toMatch(/testing emails|invalid_access/i);
    expect(json.confirmViaWhatsApp).toBe(true);
    expect(json.salonWhatsAppSent).toBe(false);
    expect(json.customerWhatsAppSent).toBe(false);
    expect(json.customerWhatsAppUrl).toMatch(/^https:\/\/wa\.me\/393270156225\?text=/);
    expect(json.salonRelay).toMatchObject({
      to: "felicepolese550@gmail.com",
      subject: expect.stringMatching(/NUOVA PRENOTAZIONE/),
    });
    expect(json.manageUrl).toMatch(/\/appuntamento\//);
  });

  it("sends WhatsApp server-side when Business API credentials are set", async () => {
    const saved: Record<string, string | undefined> = {};
    const keys = [
      "CONVERSATION_APP_ID",
      "SINCH_PROJECT_ID",
      "SINCH_KEY_ID",
      "SINCH_KEY_SECRET",
    ];
    for (const key of keys) {
      saved[key] = process.env[key];
      process.env[key] = `test-${key}`;
    }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ message_id: "wa-1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    try {
      const res = await postBooking(payload());
      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        customerWhatsAppSent: boolean;
        salonWhatsAppSent: boolean;
        confirmViaWhatsApp: boolean;
        customerWhatsAppUrl: string | null;
      };
      expect(json.customerWhatsAppSent).toBe(true);
      expect(json.salonWhatsAppSent).toBe(true);
      expect(json.confirmViaWhatsApp).toBe(false);
      expect(json.customerWhatsAppUrl).toBeNull();
      expect(fetchMock).toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
      for (const key of keys) {
        if (saved[key] === undefined) delete process.env[key];
        else process.env[key] = saved[key];
      }
    }
  });
});

describe("GET/DELETE /api/bookings/[token]", () => {
  withoutCloud();
  it("exposes Italian manage/cancel endpoints even without Supabase", async () => {
    const ctx = { params: Promise.resolve({ token: "a".repeat(24) }) };
    const getRes = await GET(new Request("http://localhost/api/bookings/token"), ctx);
    expect(getRes.status).toBe(503);
    const delRes = await DELETE(
      new Request("http://localhost/api/bookings/token", { method: "DELETE" }),
      ctx,
    );
    expect(delRes.status).toBe(503);
    const json = (await delRes.json()) as { error: string };
    expect(json.error).toMatch(/prenotazione|database/i);
  });

  it("rejects a short manage token as non valido", async () => {
    const ctx = { params: Promise.resolve({ token: "short" }) };
    const getRes = await GET(new Request("http://localhost/api/bookings/short"), ctx);
    expect(getRes.status).toBe(400);
    const json = (await getRes.json()) as { error: string };
    expect(json.error).toMatch(/token non valido/i);
    const delRes = await DELETE(
      new Request("http://localhost/api/bookings/short", { method: "DELETE" }),
      ctx,
    );
    expect(delRes.status).toBe(400);
  });
});
