import { describe, expect, it } from "vitest";
import { listSubscriptionDates } from "./subscriptions";

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
