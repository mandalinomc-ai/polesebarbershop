import { describe, expect, it } from "vitest";
import { SERVICES } from "./catalog";
import {
  invalidateRuntimeCatalogCache,
  loadCatalogServices,
  resolveRuntimeServices,
} from "./runtime-catalog";

describe("runtime catalog", () => {
  it("falls back to seed catalog when Supabase is unset", async () => {
    invalidateRuntimeCatalogCache();
    const list = await loadCatalogServices();
    expect(list).toHaveLength(10);
    expect(list.every((s) => s.durationKnown)).toBe(true);
    const meches = list.find((s) => s.id === "decolorazione-meches");
    expect(meches?.durationMin).toBe(150);
  });

  it("resolves active services and rejects unknown ids", async () => {
    invalidateRuntimeCatalogCache();
    const ok = await resolveRuntimeServices(["taglio-pro", "tintura-barba"]);
    expect(ok?.map((s) => s.durationMin)).toEqual([50, 20]);
    expect(await resolveRuntimeServices(["razor-taper"])).toBeNull();
    expect(await resolveRuntimeServices([])).toBeNull();
  });

  it("seed services stay the single structural source of truth", () => {
    expect(SERVICES.map((s) => s.id)).toContain("decolorazione-meches");
    expect(SERVICES.find((s) => s.id === "decolorazione-cutanea")?.durationMin).toBe(180);
    expect(SERVICES.find((s) => s.id === "tintura-capelli")?.durationMin).toBe(30);
    expect(SERVICES.find((s) => s.id === "acconciatura")?.durationMin).toBe(10);
  });
});
