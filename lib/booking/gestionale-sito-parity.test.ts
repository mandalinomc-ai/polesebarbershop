import { describe, expect, it } from "vitest";
import {
  getAvailableSlots,
  getOccupancyGrid,
  wallTimeToUtc,
} from "@/lib/availability";
import { candidateStartsInWindows } from "@/lib/booking/free-windows";
import {
  freeMinutesFromStart,
  serviceFitsInFreeMinutes,
} from "@/lib/gestionale/agenda-block";
import {
  invalidateShopHoursCache,
  setPrimedShopHours,
} from "@/lib/runtime-shop-hours";
import type { CalendarBlock } from "@/lib/booking/calendar-blocks";

function primeDay(open: string, close: string, lunch?: { start: string; end: string }) {
  invalidateShopHoursCache();
  setPrimedShopHours({
    source: "database",
    days: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
      weekday,
      isClosed: weekday === 0,
      open: weekday === 0 ? null : open,
      close: weekday === 0 ? null : close,
      lunchEnabled: Boolean(lunch),
      lunchStart: lunch?.start ?? null,
      lunchEnd: lunch?.end ?? null,
    })),
  });
}

function liberoFittingHalfHours(input: {
  date: string;
  barberId: string;
  durationMin: number;
  close: string;
  appointments: {
    id: string;
    barberId: string;
    startsAt: string;
    endsAt: string;
    label: string;
  }[];
  calendarBlocks: CalendarBlock[];
}): string[] {
  const grid = getOccupancyGrid({
    date: input.date,
    appointments: input.appointments,
    calendarBlocks: input.calendarBlocks,
  });
  return grid
    .filter((row) =>
      row.cells.some(
        (c) => c.barberId === input.barberId && !c.occupied && !c.skip,
      ),
    )
    .map((row) => row.time)
    .filter((startTime) =>
      serviceFitsInFreeMinutes(
        input.durationMin,
        freeMinutesFromStart({
          date: input.date,
          startTime,
          barberId: input.barberId,
          appointments: input.appointments,
          calendarBlocks: input.calendarBlocks,
          closeTime: input.close,
        }),
      ),
    );
}

describe("gestionale Libero ↔ sito /api/availability parity", () => {
  const date = "2026-11-10"; // Tuesday

  it("off-grid busy end 10:07 still exposes clock half-hours 10:30/11:00", () => {
    // Stepping 5′ from 10:07 never hits 10:30 — must seed the wall-clock grid.
    const ranked = candidateStartsInWindows(
      [{ startMin: 10 * 60 + 7, endMin: 11 * 60 + 40 }],
      30,
      {
        mode: "FLEXIBLE",
        displayIntervalMinutes: 30,
        searchIntervalMinutes: 5,
      },
    );
    const labels = ranked.map((r) => r.label);
    expect(labels).toEqual(["10:30", "11:00"]);
  });

  it("public online labels == gestionale Libero starts that fit 30′", () => {
    primeDay("09:00", "19:00", { start: "13:00", end: "14:00" });
    const appointments = [
      {
        id: "1",
        barberId: "felice",
        startsAt: wallTimeToUtc(date, "09:00").toISOString(),
        endsAt: wallTimeToUtc(date, "10:07").toISOString(),
        label: "A",
      },
      {
        id: "2",
        barberId: "felice",
        startsAt: wallTimeToUtc(date, "11:40").toISOString(),
        endsAt: wallTimeToUtc(date, "12:10").toISOString(),
        label: "B",
      },
    ];
    const calendarBlocks: CalendarBlock[] = [
      { id: "lunch-tue", weekday: 2, start: "13:00", end: "14:00", kind: "lunch" },
    ];

    const libero = liberoFittingHalfHours({
      date,
      barberId: "felice",
      durationMin: 30,
      close: "19:00",
      appointments,
      calendarBlocks,
    });
    const pub = getAvailableSlots({
      date,
      barberId: "felice",
      durationMinutes: 30,
      now: wallTimeToUtc(date, "08:00"),
      minNoticeMinutes: 0,
      fullSearch: false,
      displayIntervalMinutes: 30,
      optimizationMode: "FLEXIBLE",
      appointments,
      calendarBlocks,
    }).map((s) => s.label);

    expect(pub.sort()).toEqual(libero.sort());
    expect(pub).toContain("10:30");
    expect(pub).toContain("11:00");
    expect(pub).toContain("12:30");
  });

  it("busy until 10:15 keeps 10:30 (regression from relative-offset bug)", () => {
    primeDay("09:00", "19:00", { start: "12:30", end: "14:30" });
    const appointments = [
      {
        id: "1",
        barberId: "felice",
        startsAt: wallTimeToUtc(date, "09:00").toISOString(),
        endsAt: wallTimeToUtc(date, "10:15").toISOString(),
        label: "A",
      },
    ];
    const calendarBlocks: CalendarBlock[] = [
      { id: "lunch-tue", weekday: 2, start: "12:30", end: "14:30", kind: "lunch" },
    ];
    const libero = liberoFittingHalfHours({
      date,
      barberId: "felice",
      durationMin: 30,
      close: "19:00",
      appointments,
      calendarBlocks,
    });
    const pub = getAvailableSlots({
      date,
      barberId: "felice",
      durationMinutes: 30,
      now: wallTimeToUtc(date, "08:00"),
      minNoticeMinutes: 0,
      fullSearch: false,
      displayIntervalMinutes: 30,
      optimizationMode: "FLEXIBLE",
      appointments,
      calendarBlocks,
    }).map((s) => s.label);

    expect(pub.sort()).toEqual(libero.sort());
    expect(pub).toContain("10:30");
    expect(pub).toContain("11:00");
  });
});
