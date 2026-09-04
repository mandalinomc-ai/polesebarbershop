import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  OFFICIAL_DURATION_MIN,
  SERVICES,
  formatDuration,
  resolveServices,
  totalsForServices,
  servicesAreOnlineBookable,
} from "./catalog";
import { resolveEffectiveServiceDuration, BOOKING_BUFFER_MINUTES } from "./booking";
import { getAvailableSlots, wallTimeToUtc } from "./availability";
import { bookingSchema } from "./validations";

const TUESDAY = "2026-09-08";
const now = wallTimeToUtc("2026-08-31", "09:00");

describe("production official durations (all 10)", () => {
  it("has fixed durations for every official service — no n/d", () => {
    expect(Object.keys(OFFICIAL_DURATION_MIN).sort()).toEqual(
      SERVICES.map((s) => s.id).sort(),
    );
    for (const s of SERVICES) {
      expect(s.durationKnown).toBe(true);
      expect(s.durationMin).toBe(OFFICIAL_DURATION_MIN[s.id]);
      expect(formatDuration(s)).toBe(`Durata prevista: ${s.durationMin} min`);
      expect(formatDuration(s)).not.toMatch(/n\/d|undefined|non definita/i);
    }
  });

  it("books decolorazione-meches at 90 min (+ buffer) respecting Tuesday close", () => {
    const services = resolveServices(["decolorazione-meches"])!;
    const resolved = resolveEffectiveServiceDuration({ services });
    expect(resolved.durationMin).toBe(90);
    expect(resolved.onlineBookable).toBe(true);
    const slots = getAvailableSlots({
      date: TUESDAY,
      barberId: "felice",
      durationMinutes: resolved.durationMin!,
      now,
      fullSearch: true,
    });
    expect(slots[0]?.label).toBe("08:30");
    // 90 + 5 buffer = 95 → last start that fits before 19:00 is 17:25
    const last = slots.at(-1)!;
    expect(last.label <= "17:25").toBe(true);
    const endMs = last.start.getTime() + (90 + BOOKING_BUFFER_MINUTES) * 60_000;
    const close = wallTimeToUtc(TUESDAY, "19:00").getTime();
    expect(endMs).toBeLessThanOrEqual(close);
  });

  it("sums multi-service Taglio Pro + Barba Pro and keeps chairs independent", () => {
    const services = resolveServices(["taglio-pro", "barba-pro"])!;
    expect(totalsForServices(services).durationMin).toBe(70);
    expect(servicesAreOnlineBookable(services)).toBe(true);
    const duration = resolveEffectiveServiceDuration({ services }).durationMin!;
    expect(duration).toBe(70);

    const busyStart = wallTimeToUtc(TUESDAY, "10:00");
    const busyEnd = wallTimeToUtc(TUESDAY, "11:15"); // 70+5
    const felice = getAvailableSlots({
      date: TUESDAY,
      barberId: "felice",
      durationMinutes: duration,
      now,
      appointments: [{ barberId: "felice", startsAt: busyStart, endsAt: busyEnd }],
    });
    const davide = getAvailableSlots({
      date: TUESDAY,
      barberId: "davide",
      durationMinutes: duration,
      now,
      appointments: [{ barberId: "felice", startsAt: busyStart, endsAt: busyEnd }],
    });
    expect(felice.map((s) => s.label)).not.toContain("10:00");
    expect(davide.map((s) => s.label)).toContain("10:00");
  });
});

describe("manipulation resistance", () => {
  it("booking schema does not accept client duration or price fields", () => {
    const parsed = bookingSchema.safeParse({
      serviceIds: ["taglio-pro"],
      barberId: "felice",
      date: "2026-09-08",
      startTime: "09:30",
      firstName: "Mario",
      lastName: "Rossi",
      email: "mario@example.com",
      phone: "+393331112233",
      gdprConsent: true,
      durationMin: 5,
      priceEuro: 1,
      duration: 5,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).not.toHaveProperty("durationMin");
      expect(parsed.data).not.toHaveProperty("priceEuro");
      expect(parsed.data).not.toHaveProperty("duration");
    }
  });

  it("availability route source rejects duration-only queries", () => {
    const src = readFileSync(join(process.cwd(), "app/api/availability/route.ts"), "utf8");
    expect(src).toMatch(/non è accettata dal client|never trusts client/i);
    expect(src).not.toMatch(/durationParam/);
    expect(src).toMatch(/resolveRuntimeServices/);
  });

  it("bookings route resolves duration from runtime catalog, not body", () => {
    const src = readFileSync(join(process.cwd(), "app/api/bookings/route.ts"), "utf8");
    expect(src).toMatch(/resolveRuntimeServices/);
    expect(src).toMatch(/resolveEffectiveServiceDuration/);
    expect(src).not.toMatch(/body\.duration/);
    expect(src).not.toMatch(/body\.price/);
  });

  it("admin services API requires session auth", () => {
    const src = readFileSync(join(process.cwd(), "app/api/admin/services/route.ts"), "utf8");
    expect(src).toMatch(/isAdminRequest/);
    expect(src).toMatch(/updateAdminService/);
  });
});
