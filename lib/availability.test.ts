import { describe, expect, it } from "vitest";
import { BARBERS } from "./catalog";
import { getAvailableSlots, getFirstBookableDate, weekdayOfDate, wallTimeToUtc, isClosedDay } from "./availability";

const TUESDAY = "2026-09-01";
const MONDAY = "2026-08-31";
const SUNDAY = "2026-09-06";
const nowBeforeOpening = wallTimeToUtc("2026-08-31", "09:00");

describe("timezone helpers", () => {
  it("maps Europe/Rome wall time to UTC (CEST = UTC+2)", () => {
    expect(wallTimeToUtc(TUESDAY, "09:30").toISOString()).toBe("2026-09-01T07:30:00.000Z");
  });
  it("knows closed days", () => {
    expect(weekdayOfDate(MONDAY)).toBe(1);
    expect(isClosedDay(MONDAY)).toBe(true);
    expect(isClosedDay(SUNDAY)).toBe(true);
    expect(isClosedDay(TUESDAY)).toBe(false);
  });
  it("first bookable date is max(today, opening 2026-09-01)", () => {
    expect(getFirstBookableDate(wallTimeToUtc("2026-08-31", "18:00"))).toBe("2026-09-01");
    expect(getFirstBookableDate(wallTimeToUtc("2026-09-03", "08:00"))).toBe("2026-09-03");
  });
});

describe("getAvailableSlots", () => {
  it("returns no slots on Monday, Sunday, or before opening", () => {
    expect(getAvailableSlots({ date: MONDAY, barberId: "felice", durationMinutes: 25, now: nowBeforeOpening })).toEqual([]);
    expect(getAvailableSlots({ date: SUNDAY, barberId: "davide", durationMinutes: 15, now: nowBeforeOpening })).toEqual([]);
    expect(getAvailableSlots({ date: "2026-08-29", barberId: "felice", durationMinutes: 15, now: nowBeforeOpening })).toEqual([]);
  });
  it("generates Tuesday slots from 09:30; last 25-min slot is 19:35", () => {
    const slots = getAvailableSlots({ date: TUESDAY, barberId: "felice", durationMinutes: 25, now: nowBeforeOpening });
    expect(slots[0]?.label).toBe("09:30");
    expect(slots.at(-1)?.label).toBe("19:35");
    expect(slots.every((s) => s.barberId === "felice")).toBe(true);
  });
  it("blocks overlap but allows adjacent and anyone uses the free chair", () => {
    const busyStart = wallTimeToUtc(TUESDAY, "10:00");
    const busyEnd = wallTimeToUtc(TUESDAY, "10:25");
    const felice = getAvailableSlots({ date: TUESDAY, barberId: "felice", durationMinutes: 25, now: nowBeforeOpening, appointments: [{ barberId: "felice", startsAt: busyStart, endsAt: busyEnd }] });
    expect(felice.map((s) => s.label)).not.toContain("10:00");
    expect(felice.map((s) => s.label)).toContain("10:25");
    const anyone = getAvailableSlots({ date: TUESDAY, barberId: "anyone", durationMinutes: 25, now: nowBeforeOpening, barbers: BARBERS, appointments: [{ barberId: "felice", startsAt: busyStart, endsAt: busyEnd }] });
    expect(anyone.find((s) => s.label === "10:00")?.barberId).toBe("davide");
  });
  it("hides a slot when both chairs are busy", () => {
    const busyStart = wallTimeToUtc(TUESDAY, "11:00");
    const busyEnd = wallTimeToUtc(TUESDAY, "11:25");
    const anyone = getAvailableSlots({
      date: TUESDAY, barberId: "anyone", durationMinutes: 25, now: nowBeforeOpening,
      appointments: [
        { barberId: "felice", startsAt: busyStart, endsAt: busyEnd },
        { barberId: "davide", startsAt: busyStart, endsAt: busyEnd },
      ],
    });
    expect(anyone.map((s) => s.label)).not.toContain("11:00");
  });
});
