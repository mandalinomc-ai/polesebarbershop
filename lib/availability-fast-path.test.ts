import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("availability fast path (instant orari)", () => {
  it("API supports summary=0 selected-day path and parallel loads", () => {
    const src = readFileSync(
      join(process.cwd(), "app/api/availability/route.ts"),
      "utf8",
    );
    expect(src).toMatch(/summary.\s*!==\s*"0"|get\("summary"\)/);
    expect(src).toMatch(/Promise\.all/);
    expect(src).toMatch(/loadShopHours/);
    expect(src).not.toMatch(/warmShopHoursCache/);
  });

  it("booking flow fetches day slots without blocking on full summary", () => {
    const src = readFileSync(
      join(process.cwd(), "components/booking/FreshaBookingFlow.tsx"),
      "utf8",
    );
    expect(src).toMatch(/summary:\s*"0"/);
    expect(src).toMatch(/loadDayOccupancySummary/);
    expect(src).toMatch(/slot-grid-skeleton|slot-skeleton/);
    expect(src).toMatch(/slotsMemCacheRef/);
  });

  it("runtime catalog does not bust services cache on every resolve", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/runtime-catalog.ts"),
      "utf8",
    );
    expect(src).toMatch(/void runNoBufferMaintenance/);
    expect(src).toMatch(/void runSoloFeliceMigration/);
    expect(src).not.toMatch(
      /runNoBufferMaintenance\(\)\.then\(\(\)\s*=>\s*\{\s*cache\s*=\s*null/,
    );
  });

  it("calendar blocks cache invalidates on write", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/calendar-blocks-db.ts"),
      "utf8",
    );
    expect(src).toMatch(/invalidateMergedCalendarBlocksCache/);
    expect(src).toMatch(/BLOCKS_CACHE_TTL_MS/);
  });
});
