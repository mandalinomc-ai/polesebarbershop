import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { OCCUPANCY_STEP_MINUTES } from "./availability";
import { onlineBookableServices, SERVICES } from "./catalog";

describe("gestionale half-hour unavailable + listino split", () => {
  it("agenda occupancy steps are 30 minutes", () => {
    expect(OCCUPANCY_STEP_MINUTES).toBe(30);
  });

  it("exposes Non disp. quick block and half-hour presets in gestionale", () => {
    const src = readFileSync(join(process.cwd(), "components/gestionale/GestionalePanel.tsx"), "utf8");
    expect(src).toMatch(/onQuickBlock/);
    expect(src).toMatch(/Non disp\./);
    expect(src).toMatch(/Non disponibile/);
    expect(src).toMatch(/quickBlockHalfHour/);
    expect(src).toMatch(/block-time-presets/);
    expect(src).toMatch(/step=\{OCCUPANCY_STEP_MINUTES \* 60\}/);
  });

  it("keeps prenota-ora calendar services including Taglio Bambino", () => {
    expect(onlineBookableServices().map((s) => s.id).sort()).toEqual(
      ["acconciatura", "barba-pro", "barba-standard", "taglio-bambino", "taglio-standard"].sort(),
    );
    expect(SERVICES.filter((s) => s.whatsAppOnly).length).toBe(5);
  });
});
