import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { findHoldingSlot, runSoloFeliceMigration } from "./solo-felice-migrate";

describe("solo-felice-migrate", () => {
  it("exports runSoloFeliceMigration", () => {
    expect(typeof runSoloFeliceMigration).toBe("function");
  });

  it("keeps conflict note and overlap logic in source", () => {
    const src = readFileSync(join(process.cwd(), "lib/solo-felice-migrate.ts"), "utf8");
    expect(src).toMatch(
      /\[Da confermare: ex Davide — orario già occupato da Felice\]/,
    );
    expect(src).toMatch(/function rangesOverlap/);
    expect(src).toMatch(/as < be && bs < ae/);
    expect(src).toMatch(/export async function runSoloFeliceMigration/);
    expect(src).toMatch(/migrate_davide_to_felice/);
    expect(src).toMatch(/findHoldingSlot/);
    expect(src).toMatch(/Orario richiesto/);
  });

  it("finds a free holding slot when Felice is partially busy", () => {
    const day = "2026-09-18"; // Friday
    const busy = [
      {
        starts_at: "2026-09-18T07:00:00.000Z", // 09:00 Rome (CEST)
        ends_at: "2026-09-18T07:30:00.000Z",
      },
    ];
    const hold = findHoldingSlot(day, 30, busy);
    expect(hold).not.toBeNull();
    expect(hold!.starts_at).not.toBe(busy[0]!.starts_at);
  });
});
