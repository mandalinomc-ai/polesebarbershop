import { describe, expect, it } from "vitest";
import { BARBERS, type Barber, SHOP_HOURS } from "./catalog";
import {
  getAvailableSlots,
  getFirstBookableDate,
  weekdayOfDate,
  wallTimeToUtc,
} from "./availability";

/** Tuesday 1 Sep 2026 — shop opening day. */
const TUESDAY = "2026-09-01";
/** Monday 31 Aug 2026 — closed. */
const MONDAY = "2026-08-31";

const nowBeforeOpening = wallTimeToUtc("2026-08-31", "09:00");

const extraBarber: Barber = {
  id: "marco",
  name: "Marco",
  title: "Barber",
  virtual: false,
  hours: SHOP_HOURS,
};

const twoBarbers: Barber[] = [...BARBERS, extraBarber];

describe("timezone helpers", () => {
  it("maps Europe/Rome wall time to the correct UTC instant (CEST = UTC+2)", () => {
    const utc = wallTimeToUtc(TUESDAY, "09:30");
    expect(utc.toISOString()).toBe("2026-09-01T07:30:00.000Z");
  });

  it("knows Monday vs Tuesday", () => {
    expect(weekdayOfDate(MONDAY)).toBe(1);
    expect(weekdayOfDate(TUESDAY)).toBe(2);
  });

  it("first bookable date is max(today, opening 2026-09-01)", () => {
    expect(getFirstBookableDate(wallTimeToUtc("2026-08-31", "18:00"))).toBe(
      "2026-09-01",
    );
    expect(getFirstBookableDate(wallTimeToUtc("2026-09-03", "08:00"))).toBe(
      "2026-09-03",
    );
  });
});

describe("getAvailableSlots", () => {
  it("returns no slots on a closed Monday", () => {
    const slots = getAvailableSlots({
      date: MONDAY,
      barberId: "felice",
      durationMinutes: 45,
      appointments: [],
      now: nowBeforeOpening,
    });
    expect(slots).toEqual([]);
  });

  it("generates Tuesday slots on the 15-minute grid", () => {
    const slots = getAvailableSlots({
      date: TUESDAY,
      barberId: "felice",
      durationMinutes: 45,
      appointments: [],
      now: nowBeforeOpening,
    });
    expect(slots[0]?.label).toBe("09:30");
    expect(slots.some((s) => s.label === "10:00")).toBe(true);
    expect(slots.every((s) => s.barberId === "felice")).toBe(true);
    expect(slots.length).toBeGreaterThan(20);
  });

  it("blocks overlapping confirmed appointments", () => {
    const busyStart = wallTimeToUtc(TUESDAY, "10:00");
    const busyEnd = wallTimeToUtc(TUESDAY, "10:45");
    const slots = getAvailableSlots({
      date: TUESDAY,
      barberId: "felice",
      durationMinutes: 45,
      now: nowBeforeOpening,
      appointments: [
        { barberId: "felice", startsAt: busyStart, endsAt: busyEnd },
      ],
    });
    const labels = slots.map((s) => s.label);
    expect(labels).not.toContain("10:00");
    expect(labels).not.toContain("09:45");
    expect(labels).not.toContain("09:30");
    expect(labels).toContain("10:45");
    expect(labels).toContain("11:00");
  });

  it("last 45-minute slot is 19:15 so it finishes at close (20:00)", () => {
    const slots = getAvailableSlots({
      date: TUESDAY,
      barberId: "felice",
      durationMinutes: 45,
      appointments: [],
      now: nowBeforeOpening,
    });
    expect(slots.at(-1)?.label).toBe("19:15");
    expect(slots.some((s) => s.label === "19:30")).toBe(false);
  });

  it("last 75-minute slot is 18:45", () => {
    const slots = getAvailableSlots({
      date: TUESDAY,
      barberId: "felice",
      durationMinutes: 75,
      appointments: [],
      now: nowBeforeOpening,
    });
    expect(slots.at(-1)?.label).toBe("18:45");
  });

  it("anyone merges barbers and keeps a slot if another barber is free", () => {
    const busyStart = wallTimeToUtc(TUESDAY, "10:00");
    const busyEnd = wallTimeToUtc(TUESDAY, "10:45");
    const feliceOnly = getAvailableSlots({
      date: TUESDAY,
      barberId: "felice",
      durationMinutes: 45,
      now: nowBeforeOpening,
      barbers: twoBarbers,
      appointments: [
        { barberId: "felice", startsAt: busyStart, endsAt: busyEnd },
      ],
    });
    expect(feliceOnly.map((s) => s.label)).not.toContain("10:00");

    const anyone = getAvailableSlots({
      date: TUESDAY,
      barberId: "anyone",
      durationMinutes: 45,
      now: nowBeforeOpening,
      barbers: twoBarbers,
      appointments: [
        { barberId: "felice", startsAt: busyStart, endsAt: busyEnd },
      ],
    });
    const ten = anyone.find((s) => s.label === "10:00");
    expect(ten).toBeTruthy();
    expect(ten?.barberId).toBe("marco");
  });

  it("anyone assigns the least-loaded barber for that day", () => {
    const morning = wallTimeToUtc(TUESDAY, "09:30");
    const anyone = getAvailableSlots({
      date: TUESDAY,
      barberId: "anyone",
      durationMinutes: 45,
      now: nowBeforeOpening,
      barbers: twoBarbers,
      appointments: [
        {
          barberId: "felice",
          startsAt: morning,
          endsAt: wallTimeToUtc(TUESDAY, "10:15"),
        },
      ],
    });
    const slot = anyone.find((s) => s.label === "11:00");
    expect(slot?.barberId).toBe("marco");
  });

  it("filters past slots for today with 15-minute minimum notice", () => {
    const now = wallTimeToUtc(TUESDAY, "10:00");
    const slots = getAvailableSlots({
      date: TUESDAY,
      barberId: "felice",
      durationMinutes: 45,
      appointments: [],
      now,
      minNoticeMinutes: 15,
    });
    const labels = slots.map((s) => s.label);
    expect(labels).not.toContain("09:30");
    expect(labels).not.toContain("10:00");
    expect(labels[0]).toBe("10:15");
  });
});
