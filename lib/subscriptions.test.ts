import { describe, expect, it } from "vitest";
import { wallTimeToUtc } from "@/lib/booking";
import {
  formatSubscriptionSeriesNote,
  listSubscriptionDates,
  parseSubscriptionSeriesId,
  reconstructSubscriptionsFromAppointments,
} from "./subscriptions";

describe("listSubscriptionDates", () => {
  it("lists weekly open days in range", () => {
    // 2026-09-14 is Monday
    const dates = listSubscriptionDates("2026-09-14", "2026-10-12", 1);
    expect(dates[0]).toBe("2026-09-14");
    expect(dates).toContain("2026-09-21");
    expect(dates).toContain("2026-10-12");
    expect(dates.every((d) => new Date(`${d}T12:00:00`).getDay() === 1)).toBe(true);
  });

  it("skips Sundays when shop is closed", () => {
    const dates = listSubscriptionDates("2026-09-14", "2026-09-28", 0);
    expect(dates).toEqual([]);
  });
});

describe("subscription series notes (pre-014 fallback)", () => {
  const id = "11111111-2222-4333-8444-555555555555";

  it("round-trips series id in notes", () => {
    const note = formatSubscriptionSeriesNote(id, "vip");
    expect(parseSubscriptionSeriesId(note)).toBe(id);
    expect(note).toContain("Abbonamento · cadenza fissa");
  });

  it("reconstructs active series from appointment rows", () => {
    const starts = wallTimeToUtc("2026-09-14", "10:00");
    const later = wallTimeToUtc("2026-09-21", "10:00");
    const subs = reconstructSubscriptionsFromAppointments(
      [
        {
          customer_first_name: "Mario",
          customer_last_name: "Rossi",
          customer_phone: "333",
          barber_id: "felice",
          service_ids: ["taglio-standard"],
          starts_at: starts.toISOString(),
          duration_min: 30,
          price_cents: 2000,
          notes: formatSubscriptionSeriesNote(id),
          status: "confirmed",
        },
        {
          customer_first_name: "Mario",
          customer_last_name: "Rossi",
          barber_id: "felice",
          service_ids: ["taglio-standard"],
          starts_at: later.toISOString(),
          duration_min: 30,
          price_cents: 2000,
          notes: formatSubscriptionSeriesNote(id),
          status: "confirmed",
        },
      ],
      wallTimeToUtc("2026-09-10", "09:00"),
    );
    expect(subs).toHaveLength(1);
    expect(subs[0]?.id).toBe(id);
    expect(subs[0]?.firstName).toBe("Mario");
    expect(subs[0]?.weekday).toBe(1);
    expect(subs[0]?.startTime).toBe("10:00");
    expect(subs[0]?.legacy).toBe(true);
  });
});
