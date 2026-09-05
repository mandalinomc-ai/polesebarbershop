import { describe, expect, it } from "vitest";
import { isClosedDay } from "@/lib/availability";
import { blocksForDate, busyMinutesFromBlocks, type CalendarBlock } from "@/lib/booking";

const TUESDAY = "2026-09-08";

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
