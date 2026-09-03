import { describe, expect, it } from "vitest";
import { BARBERS } from "./catalog";
import { getAvailableSlots, getFirstBookableDate, getOccupancyGrid, getScheduleSlots, summarizeSchedule, weekdayOfDate, wallTimeToUtc, isClosedDay, mondayOfWeek, listOpenDayChips, monthCalendarWeeks, addMonths, formatItalianMonth } from "./availability";

const TUESDAY = "2026-09-08";
const MONDAY_PRE_OPENING = "2026-08-31";
const MONDAY_OPEN = "2026-09-14";
const SUNDAY = "2026-09-06";
const nowBeforeOpening = wallTimeToUtc("2026-08-31", "09:00");

describe("timezone helpers", () => {
  it("maps Europe/Rome wall time to UTC (CEST = UTC+2)", () => {
    expect(wallTimeToUtc(TUESDAY, "09:30").toISOString()).toBe("2026-09-08T07:30:00.000Z");
  });
  it("knows closed days — only Sunday; Monday is open 15:00–19:00", () => {
    expect(weekdayOfDate(MONDAY_PRE_OPENING)).toBe(1);
    expect(isClosedDay(MONDAY_PRE_OPENING)).toBe(false);
    expect(isClosedDay(MONDAY_OPEN)).toBe(false);
    expect(isClosedDay(SUNDAY)).toBe(true);
    expect(isClosedDay(TUESDAY)).toBe(false);
    expect(mondayOfWeek("2026-09-02")).toBe("2026-08-31");
    expect(mondayOfWeek("2026-09-06")).toBe("2026-08-31");
  });
  it("first bookable date is max(today, opening 2026-09-07)", () => {
    expect(getFirstBookableDate(wallTimeToUtc("2026-08-31", "18:00"))).toBe("2026-09-07");
    expect(getFirstBookableDate(wallTimeToUtc("2026-09-08", "08:00"))).toBe("2026-09-08");
  });
  it("lists open day chips from opening Monday 7/9 (now open 15:00–19:00)", () => {
    const chips = listOpenDayChips(3, wallTimeToUtc("2026-08-31", "18:00"));
    expect(chips.map((c) => c.date)).toEqual(["2026-09-07", "2026-09-08", "2026-09-09"]);
    expect(chips[0]?.dow.toLowerCase()).toMatch(/lun/);
  });
});

describe("getAvailableSlots", () => {
  it("returns no slots on Sunday or before opening", () => {
    expect(getAvailableSlots({ date: MONDAY_PRE_OPENING, barberId: "felice", durationMinutes: 25, now: nowBeforeOpening })).toEqual([]);
    expect(getAvailableSlots({ date: SUNDAY, barberId: "davide", durationMinutes: 15, now: nowBeforeOpening })).toEqual([]);
    expect(getAvailableSlots({ date: "2026-08-29", barberId: "felice", durationMinutes: 15, now: nowBeforeOpening })).toEqual([]);
  });
  it("generates Monday slots from 15:00; last 25-min (+5 buffer) slot is 18:30", () => {
    const slots = getAvailableSlots({ date: MONDAY_OPEN, barberId: "felice", durationMinutes: 25, now: nowBeforeOpening });
    expect(slots[0]?.label).toBe("15:00");
    expect(slots.at(-1)?.label).toBe("18:30");
  });
  it("generates Tuesday slots from 08:30; last 25-min (+5 buffer) slot is 18:30", () => {
    const slots = getAvailableSlots({ date: TUESDAY, barberId: "felice", durationMinutes: 25, now: nowBeforeOpening });
    expect(slots[0]?.label).toBe("08:30");
    expect(slots.at(-1)?.label).toBe("18:30");
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

  it("a 30 min booking at 10:00 blocks 10:15 on the same barber, not the other chair", () => {
    const busyStart = wallTimeToUtc(TUESDAY, "10:00");
    const busyEnd = wallTimeToUtc(TUESDAY, "10:30");
    const appointments = [{ barberId: "felice" as const, startsAt: busyStart, endsAt: busyEnd }];
    const felice = getScheduleSlots({
      date: TUESDAY,
      barberId: "felice",
      durationMinutes: 30,
      now: nowBeforeOpening,
      appointments,
    });
    expect(felice.find((s) => s.label === "10:00")).toMatchObject({ booked: true, available: false });
    expect(felice.find((s) => s.label === "10:15")).toMatchObject({ booked: true, available: false });
    expect(felice.find((s) => s.label === "10:30")).toMatchObject({ booked: false, available: true });
    const davide = getScheduleSlots({
      date: TUESDAY,
      barberId: "davide",
      durationMinutes: 30,
      now: nowBeforeOpening,
      appointments,
    });
    expect(davide.find((s) => s.label === "10:00")).toMatchObject({ booked: false, available: true });
    expect(davide.find((s) => s.label === "10:15")).toMatchObject({ booked: false, available: true });
    const anyone = getScheduleSlots({
      date: TUESDAY,
      barberId: "anyone",
      durationMinutes: 30,
      now: nowBeforeOpening,
      appointments,
    });
    expect(anyone.find((s) => s.label === "10:00")).toMatchObject({
      available: true,
      booked: false,
      barberId: "davide",
    });
  });

  it("keeps the chair free when a cancelled booking is not in the busy list", () => {
    const busyStart = wallTimeToUtc(TUESDAY, "10:00");
    const busyEnd = wallTimeToUtc(TUESDAY, "10:25");
    const occupied = getAvailableSlots({
      date: TUESDAY,
      barberId: "felice",
      durationMinutes: 25,
      now: nowBeforeOpening,
      appointments: [{ barberId: "felice", startsAt: busyStart, endsAt: busyEnd }],
    });
    expect(occupied.map((s) => s.label)).not.toContain("10:00");
    const afterCancel = getAvailableSlots({
      date: TUESDAY,
      barberId: "felice",
      durationMinutes: 25,
      now: nowBeforeOpening,
      appointments: [],
    });
    expect(afterCancel.map((s) => s.label)).toContain("10:00");
  });
});

describe("getScheduleSlots occupancy grid", () => {
  it("keeps the taken hour visible and not bookable", () => {
    const busyStart = wallTimeToUtc(TUESDAY, "10:00");
    const busyEnd = wallTimeToUtc(TUESDAY, "10:25");
    const grid = getScheduleSlots({
      date: TUESDAY,
      barberId: "felice",
      durationMinutes: 25,
      now: nowBeforeOpening,
      appointments: [{ barberId: "felice", startsAt: busyStart, endsAt: busyEnd }],
    });
    const taken = grid.find((s) => s.label === "10:00");
    expect(taken).toMatchObject({ booked: true, available: false });
    expect(grid.find((s) => s.label === "10:25")).toMatchObject({
      booked: false,
      available: true,
    });
    expect(getAvailableSlots({
      date: TUESDAY,
      barberId: "felice",
      durationMinutes: 25,
      now: nowBeforeOpening,
      appointments: [{ barberId: "felice", startsAt: busyStart, endsAt: busyEnd }],
    }).map((s) => s.label)).not.toContain("10:00");
  });

  it("marks anyone-slot booked only when both chairs are busy", () => {
    const busyStart = wallTimeToUtc(TUESDAY, "11:00");
    const busyEnd = wallTimeToUtc(TUESDAY, "11:25");
    const oneBusy = getScheduleSlots({
      date: TUESDAY,
      barberId: "anyone",
      durationMinutes: 25,
      now: nowBeforeOpening,
      appointments: [{ barberId: "felice", startsAt: busyStart, endsAt: busyEnd }],
    });
    expect(oneBusy.find((s) => s.label === "11:00")).toMatchObject({
      available: true,
      booked: false,
      barberId: "davide",
    });
    const bothBusy = getScheduleSlots({
      date: TUESDAY,
      barberId: "anyone",
      durationMinutes: 25,
      now: nowBeforeOpening,
      appointments: [
        { barberId: "felice", startsAt: busyStart, endsAt: busyEnd },
        { barberId: "davide", startsAt: busyStart, endsAt: busyEnd },
      ],
    });
    expect(bothBusy.find((s) => s.label === "11:00")).toMatchObject({
      available: false,
      booked: true,
    });
  });

  it("does not invent a booked grid on closed days or before opening", () => {
    expect(getScheduleSlots({
      date: SUNDAY,
      barberId: "felice",
      durationMinutes: 25,
      now: nowBeforeOpening,
    })).toEqual([]);
    expect(getScheduleSlots({
      date: MONDAY_PRE_OPENING,
      barberId: "felice",
      durationMinutes: 25,
      now: nowBeforeOpening,
    })).toEqual([]);
    expect(summarizeSchedule("2026-08-29", []).full).toBe(false);
  });
});

describe("getOccupancyGrid", () => {
  it("builds a day × hours table with the same occupied times", () => {
    const grid = getOccupancyGrid({
      date: TUESDAY,
      appointments: [{
        barberId: "felice",
        startsAt: wallTimeToUtc(TUESDAY, "10:00"),
        endsAt: wallTimeToUtc(TUESDAY, "10:25"),
        label: "Mario Rossi",
      }],
    });
    expect(grid[0]?.time).toBe("08:30");
    const ten = grid.find((row) => row.time === "10:00");
    const tenThirty = grid.find((row) => row.time === "10:30");
    expect(ten?.cells.find((c) => c.barberId === "felice")).toMatchObject({
      occupied: true,
      label: "Mario Rossi",
    });
    expect(ten?.cells.find((c) => c.barberId === "davide")?.occupied).toBe(false);
    expect(tenThirty?.cells.find((c) => c.barberId === "felice")?.occupied).toBe(false);
    expect(getOccupancyGrid({ date: SUNDAY })).toEqual([]);
    expect(getOccupancyGrid({ date: MONDAY_OPEN })[0]?.time).toBe("15:00");
  });
});

describe("month calendar", () => {
  it("builds a Monday-first September 2026 grid with closed Sunday only", () => {
    const weeks = monthCalendarWeeks("2026-09-08");
    expect(weeks[0]?.filter(Boolean)[0]?.date).toBe("2026-09-01");
    expect(weeks.flat().find((d) => d?.date === "2026-09-08")).toMatchObject({
      closed: false,
    });
    expect(weeks.flat().find((d) => d?.date === "2026-09-07")).toMatchObject({
      closed: false,
    });
    expect(weeks.flat().find((d) => d?.date === "2026-09-06")).toMatchObject({
      closed: true,
    });
    expect(addMonths("2026-09-01", 1)).toBe("2026-10-01");
    expect(formatItalianMonth("2026-09-08")).toMatch(/settembre/i);
  });
});
