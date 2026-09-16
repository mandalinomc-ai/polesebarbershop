import { describe, expect, it } from "vitest";
import { getOccupancyGrid } from "@/lib/availability";
import {
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

  it("detects offline blocks per barber", () => {
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
    expect(isOperatorOfflineBlock(blocks[0]!, "2026-09-15", "davide")).toBe(false);
    expect(offlineOperatorsForDate(blocks, "2026-09-15").map((o) => o.barberId)).toEqual([
      "felice",
    ]);
  });

  it("marks occupancy cells blocked for offline barber", () => {
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
    const feliceCells = grid.flatMap((r) => r.cells.filter((c) => c.barberId === "felice"));
    const davideFree = grid.some((r) =>
      r.cells.some((c) => c.barberId === "davide" && !c.occupied),
    );
    expect(feliceCells.every((c) => c.occupied && c.blocked)).toBe(true);
    expect(davideFree).toBe(true);
  });
});
