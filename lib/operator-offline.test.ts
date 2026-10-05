import { describe, expect, it } from "vitest";
import { getOccupancyGrid } from "@/lib/availability";
import {
  bookableSlotStarts,
  isBarberOfflineOnDate,
  isOperatorOfflineBlock,
  OPERATOR_OFFLINE_LABEL,
  offlineOperatorsForDate,
  shopHoursForDate,
} from "@/lib/operator-offline";

describe("operator offline", () => {
  it("resolves shop hours for open weekdays", () => {
    expect(shopHoursForDate("2026-09-15")).toEqual({ open: "09:00", close: "19:00" }); // Tue
    expect(shopHoursForDate("2026-09-13")).toBeNull(); // Sun
  });

  it("detects offline blocks for Felice only", () => {
    const blocks = [
      {
        id: "1",
        date: "2026-09-15",
        barberId: "felice",
        start: "09:00",
        end: "19:00",
        kind: "closed" as const,
        label: OPERATOR_OFFLINE_LABEL,
      },
    ];
    expect(isOperatorOfflineBlock(blocks[0]!, "2026-09-15", "felice")).toBe(true);
    expect(isOperatorOfflineBlock(blocks[0]!, "2026-09-15", "anyone")).toBe(false);
    expect(offlineOperatorsForDate(blocks, "2026-09-15").map((o) => o.barberId)).toEqual([
      "felice",
    ]);
  });

  it("treats a day of Non disponibile half-hours as Felice offline", () => {
    const date = "2026-10-06"; // Tue
    const starts = bookableSlotStarts(date);
    expect(starts.length).toBeGreaterThan(10);
    expect(starts).not.toContain("13:00"); // lunch
    const blocks = starts.map((start, i) => {
      const [h, m] = start.split(":").map(Number) as [number, number];
      const endMin = h * 60 + m + 30;
      const end = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
      return {
        id: `nd-${i}`,
        date,
        barberId: "felice",
        start,
        end,
        kind: "custom" as const,
        label: "Non disponibile",
      };
    });
    expect(isBarberOfflineOnDate(blocks, date, "felice")).toBe(true);
    expect(offlineOperatorsForDate(blocks, date).map((o) => o.barberId)).toEqual(["felice"]);
  });

  it("does not mark offline when only a few slots are blocked", () => {
    const blocks = [
      {
        id: "one",
        date: "2026-10-06",
        barberId: "felice",
        start: "09:00",
        end: "09:30",
        kind: "custom" as const,
        label: "Non disponibile",
      },
    ];
    expect(isBarberOfflineOnDate(blocks, "2026-10-06", "felice")).toBe(false);
    expect(offlineOperatorsForDate(blocks, "2026-10-06")).toEqual([]);
  });

  it("marks occupancy cells blocked for offline Felice (sole chair)", () => {
    const grid = getOccupancyGrid({
      date: "2026-09-15",
      appointments: [],
      calendarBlocks: [
        {
          id: "off-felice",
          date: "2026-09-15",
          barberId: "felice",
          start: "09:00",
          end: "19:00",
          kind: "closed",
          label: OPERATOR_OFFLINE_LABEL,
        },
      ],
    });
    const allCells = grid.flatMap((r) => r.cells);
    expect(allCells.every((c) => c.barberId === "felice")).toBe(true);
    expect(allCells.every((c) => c.occupied && c.blocked)).toBe(true);
  });
});
