import { describe, expect, it } from "vitest";
import { SERVICES, formatPrice, formatPriceRange, totalsForServices, resolveServices, getBarber, BARBERS } from "./catalog";

describe("catalog", () => {
  it("contains Felice and Davide as distinct chairs plus anyone", () => {
    expect(BARBERS.map((b) => b.id).sort()).toEqual(["anyone", "davide", "felice"].sort());
    expect(getBarber("felice")?.virtual).toBe(false);
    expect(getBarber("davide")?.virtual).toBe(false);
    expect(getBarber("anyone")?.virtual).toBe(true);
  });
  it("shows da X € for variable-price services", () => {
    const meches = SERVICES.find((s) => s.id === "decolorazione-meches")!;
    expect(formatPrice(meches)).toBe("da 40 €");
    expect(formatPriceRange(meches)).toBe("da 40 € a 100 €");
  });
  it("shows a fixed euro amount for Taglio Pro", () => {
    const pro = SERVICES.find((s) => s.id === "taglio-pro")!;
    expect(pro.priceEuro).toBe(50);
    expect(pro.durationMin).toBe(25);
    expect(formatPrice(pro)).toBe("50 €");
  });
  it("does not include leftover Taglio sartoriale / Combo premium items", () => {
    expect(SERVICES.some((s) => /sartoriale|combo premium/i.test(s.name))).toBe(false);
  });
  it("does not list a specialist consult service", () => {
    const blob = SERVICES.map((s) => `${s.id} ${s.name} ${s.description}`).join(" ");
    expect(blob).not.toMatch(/tricolog|dermatolog|caduta capelli/i);
  });
  it("sums duration and uses a da–a range when any service is variable", () => {
    const totals = totalsForServices(resolveServices(["taglio-pro", "decolorazione-meches"])!);
    expect(totals.durationMin).toBe(70);
    expect(totals.priceEuro).toBe(90);
    expect(totals.priceMaxEuro).toBe(150);
    expect(totals.isVariable).toBe(true);
    expect(totals.priceLabel).toBe("da 90 € a 150 €");
  });
});
