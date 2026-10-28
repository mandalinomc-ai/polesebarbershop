import { describe, expect, it } from "vitest";
import { candidateStartsInWindows } from "./free-windows";
import { getAvailableSlots, wallTimeToUtc } from "@/lib/availability";

describe("online clock half-hour grid", () => {
  it("keeps :00/:30 after an uneven busy end (not relative window offsets)", () => {
    // Busy until 10:15 → free window starts 10:15. Old bug hid 10:30.
    const ranked = candidateStartsInWindows(
      [{ startMin: 10 * 60 + 15, endMin: 12 * 60 + 30 }],
      30,
      {
        mode: "REDUCE_GAPS",
        displayIntervalMinutes: 30,
        searchIntervalMinutes: 5,
      },
    );
    const labels = ranked.map((r) => r.label);
    expect(labels).toContain("10:30");
    expect(labels).toContain("11:00");
    expect(labels).toContain("11:30");
    expect(labels).toContain("12:00");
    expect(labels).not.toContain("10:15");
    expect(labels.every((l) => l.endsWith(":00") || l.endsWith(":30"))).toBe(true);
  });

  it("getAvailableSlots online thinning exposes clock half-hours after 10:15 busy", () => {
    const date = "2026-11-10"; // Tuesday
    const now = wallTimeToUtc(date, "08:00");
    const busyStart = wallTimeToUtc(date, "09:00");
    const busyEnd = wallTimeToUtc(date, "10:15");
    const slots = getAvailableSlots({
      date,
      barberId: "felice",
      durationMinutes: 30,
      now,
      minNoticeMinutes: 0,
      fullSearch: false,
      displayIntervalMinutes: 30,
      appointments: [
        {
          barberId: "felice",
          startsAt: busyStart.toISOString(),
          endsAt: busyEnd.toISOString(),
        },
      ],
    });
    const labels = slots.map((s) => s.label);
    expect(labels).toContain("10:30");
    expect(labels).toContain("11:00");
    expect(labels.some((l) => l === "10:15")).toBe(false);
  });
});
