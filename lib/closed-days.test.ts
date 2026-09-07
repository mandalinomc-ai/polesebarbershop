import { describe, expect, it } from "vitest";
import { getAvailableSlots, isClosedDay } from "@/lib/availability";
import { blocksForDate, busyMinutesFromBlocks, type CalendarBlock } from "@/lib/booking";

const TUESDAY = "2026-09-08";
const nowBeforeOpening = new Date("2026-08-01T10:00:00.000Z");

describe("chiusura giornaliera (ferie)", () => {
  it("isClosedDay accepts extra closed dates for ferie", () => {
    expect(isClosedDay(TUESDAY)).toBe(false);
    expect(isClosedDay(TUESDAY, undefined, [TUESDAY])).toBe(true);
    expect(isClosedDay(TUESDAY, undefined, new Set([TUESDAY]))).toBe(true);
    expect(isClosedDay(TUESDAY, undefined, ["2026-09-09"])).toBe(false);
  });

  it("full-day closed calendar block empties free minutes for the day", () => {
    const blocks: CalendarBlock[] = [
      {
        id: "ferie",
        date: TUESDAY,
        start: "00:00",
        end: "23:59",
        kind: "closed",
        label: "Chiusura giornaliera",
      },
    ];
    expect(blocksForDate(TUESDAY, blocks).some((b) => b.kind === "closed")).toBe(true);
    const busy = busyMinutesFromBlocks(TUESDAY, blocks);
    expect(busy).toEqual([{ startMin: 0, endMin: 23 * 60 + 59 }]);
  });
});

describe("blocco temporaneo (kind=custom)", () => {
  it("removes only slots overlapping the blocked interval", () => {
    const blocks: CalendarBlock[] = [
      {
        id: "pausa",
        date: TUESDAY,
        start: "12:00",
        end: "13:00",
        kind: "custom",
        label: "Blocco temporaneo",
      },
    ];
    const withBlock = getAvailableSlots({
      date: TUESDAY,
      barberId: "felice",
      durationMinutes: 25,
      now: nowBeforeOpening,
      calendarBlocks: blocks,
    });
    const without = getAvailableSlots({
      date: TUESDAY,
      barberId: "felice",
      durationMinutes: 25,
      now: nowBeforeOpening,
    });
    expect(without.some((s) => s.label === "12:00")).toBe(true);
    expect(withBlock.some((s) => s.label === "12:00")).toBe(false);
    expect(withBlock.some((s) => s.label === "11:00")).toBe(true);
    expect(withBlock.some((s) => s.label === "13:00")).toBe(true);
    expect(withBlock.length).toBeLessThan(without.length);
    // Starts inside the blocked hour never appear
    expect(withBlock.every((s) => s.label < "12:00" || s.label >= "13:00")).toBe(true);
  });

  it("busy minutes cover only the temporary window", () => {
    const blocks: CalendarBlock[] = [
      { id: "t", date: TUESDAY, start: "10:30", end: "11:15", kind: "custom" },
    ];
    expect(busyMinutesFromBlocks(TUESDAY, blocks)).toEqual([
      { startMin: 10 * 60 + 30, endMin: 11 * 60 + 15 },
    ]);
  });
});
