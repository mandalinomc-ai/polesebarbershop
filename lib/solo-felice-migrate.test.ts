import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runSoloFeliceMigration } from "./solo-felice-migrate";

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
  });
});
