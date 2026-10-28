import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getAvailableSlots, wallTimeToUtc } from "./availability";
import {
  resolveEffectiveServiceDuration,
} from "./booking";
import {
  resolveServices,
  servicesAreOnlineBookable,
  totalsForServices,
} from "./catalog";
import { POST } from "@/app/api/bookings/route";
import { resetRateLimitStore } from "./rate-limit";
import {
  availabilityQuerySchema,
  bookingSchema,
} from "./validations";

const TUESDAY = "2026-11-03";
const nowBefore = wallTimeToUtc(TUESDAY, "07:00");

describe("two-service online booking (taglio-standard + barba-standard)", () => {
  const ids = ["taglio-standard", "barba-standard"] as const;

  it("availabilityQuerySchema parses comma-separated serviceIds", () => {
    const parsed = availabilityQuerySchema.safeParse({
      date: TUESDAY,
      barberId: "felice",
      serviceIds: "taglio-standard,barba-standard",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.serviceIds).toEqual(["taglio-standard", "barba-standard"]);
    }
  });

  it("sums catalog duration to 45 and stays online-bookable", () => {
    const services = resolveServices([...ids])!;
    expect(services).toHaveLength(2);
    expect(servicesAreOnlineBookable(services)).toBe(true);
    expect(totalsForServices(services).durationMin).toBe(45);
    const resolved = resolveEffectiveServiceDuration({ services });
    expect(resolved.ok).toBe(true);
    expect(resolved.onlineBookable).toBe(true);
    expect(resolved.durationMin).toBe(45);
  });

  it("slot ends match combined 45-minute block (not first service only)", () => {
    const duration = totalsForServices(resolveServices([...ids])!).durationMin;
    expect(duration).toBe(45);
    const slots = getAvailableSlots({
      date: TUESDAY,
      barberId: "felice",
      durationMinutes: duration,
      now: nowBefore,
      fullSearch: true,
    });
    expect(slots.length).toBeGreaterThan(0);
    const first = slots[0]!;
    expect(first.label).toBe("09:00");
    expect(first.endIso).toBe(wallTimeToUtc(TUESDAY, "09:45").toISOString());
    expect(first.blockEndIso).toBe(wallTimeToUtc(TUESDAY, "09:45").toISOString());
    // Combined block needs more contiguous time than a single 30-min taglio.
    const alone = getAvailableSlots({
      date: TUESDAY,
      barberId: "felice",
      durationMinutes: 30,
      now: nowBefore,
      fullSearch: true,
    });
    expect(alone.length).toBeGreaterThanOrEqual(slots.length);
  });

  it("bookingSchema accepts both serviceIds in POST body", () => {
    const parsed = bookingSchema.safeParse({
      serviceIds: [...ids],
      barberId: "felice",
      date: TUESDAY,
      startTime: "09:00",
      firstName: "Mario",
      lastName: "Rossi",
      email: "mario@example.com",
      phone: "+393331112233",
      gdprConsent: true,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.serviceIds).toEqual(["taglio-standard", "barba-standard"]);
    }
  });

  it("FreshaBookingFlow loads slots with both ids and submits the array", () => {
    const src = readFileSync(
      join(process.cwd(), "components/booking/FreshaBookingFlow.tsx"),
      "utf8",
    );
    expect(src).toContain('serviceIds: selectedIds.join(",")');
    expect(src).toMatch(/serviceIds:\s*selectedIds,/);
    expect(src).toContain("totalsForServices(selectedServices)");
    expect(src).toMatch(/servicesAreOnlineBookable/);
  });

  it("listino go-calendar forwards the full multi-id cart, not only the first", () => {
    const src = readFileSync(
      join(process.cwd(), "components/booking/ServiceListino.tsx"),
      "utf8",
    );
    expect(src).toContain("ids: next");
    expect(src).toContain("ids: selectedIds");
  });
});

describe("POST /api/bookings — two online services pass catalog checks", () => {
  const ENV_KEYS = [
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEY",
  ];
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    resetRateLimitStore();
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
    resetRateLimitStore();
  });

  it("rejects WhatsApp-only mix with 400 before calendar", async () => {
    const res = await POST(
      new Request("http://localhost/api/bookings", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.90",
        },
        body: JSON.stringify({
          serviceIds: ["taglio-pro", "barba-standard"],
          barberId: "felice",
          date: TUESDAY,
          startTime: "09:00",
          firstName: "Mario",
          lastName: "Rossi",
          email: "mario@example.com",
          phone: "+393331112233",
          gdprConsent: true,
        }),
      }),
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toMatch(/WhatsApp/i);
  });

  it("accepts taglio-standard + barba-standard past service validation (503 without DB)", async () => {
    const res = await POST(
      new Request("http://localhost/api/bookings", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.91",
        },
        body: JSON.stringify({
          serviceIds: ["taglio-standard", "barba-standard"],
          barberId: "felice",
          date: TUESDAY,
          startTime: "09:00",
          firstName: "Mario",
          lastName: "Rossi",
          email: "mario@example.com",
          phone: "+393331112233",
          gdprConsent: true,
        }),
      }),
    );
    // Without Supabase the calendar source fails after multi-service checks succeed.
    expect(res.status).toBe(503);
    const json = (await res.json()) as { error: string };
    expect(json.error).not.toMatch(/servizio|WhatsApp|validi/i);
  });
});
