import { describe, expect, it } from "vitest";
import { getAvailableSlots, listOpenDayChips } from "./availability";
import {
  BOOKING_HORIZON_DAYS,
  BOOKING_UI_DAYS,
} from "./site-config";

describe("booking capacity policy", () => {
  it("lists many future open days without an artificial total-booking cap", () => {
    const chips = listOpenDayChips(BOOKING_UI_DAYS);
    expect(chips.length).toBe(BOOKING_UI_DAYS);
    expect(BOOKING_UI_DAYS).toBeGreaterThan(16);
    expect(BOOKING_HORIZON_DAYS).toBeGreaterThanOrEqual(BOOKING_UI_DAYS);
  });

  it("generates per-day time slots from shop hours, not a fixed booking quota", () => {
    const slots = getAvailableSlots({
      date: "2026-09-02",
      barberId: "felice",
      durationMinutes: 25,
    });
    expect(slots.length).toBeGreaterThan(100);
    expect(slots.length).toBeLessThan(140);
  });
});
