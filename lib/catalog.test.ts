import { describe, expect, it } from "vitest";
import { SERVICES, formatPrice, formatPriceRange, totalsForServices, resolveServices, getBarber, BARBERS } from "./catalog";

describe("catalog", () => {
  it("contains Felice and Davide as distinct chairs plus anyone", () => {
    expect(BARBERS.map((b) => b.id).sort()).toEqual(["anyone", "davide", "felice"].sort());
    expect(getBarber("felice")?.virtual).toBe(false);
    expect(getBarber("davide")?.virtual).toBe(false);
    expect(getBarber("anyone")?.virtual).toBe(true);
  });
  it("matches the official CAPELLI / BARBA / COLORE listino", () => {
    expect(
      SERVICES.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        priceEuro: s.priceEuro,
        priceMaxEuro: s.priceMaxEuro,
        durationMin: s.durationMin,
      })),
    ).toEqual([
      { id: "taglio-pro", name: "Taglio completo", category: "taglio_barba", priceEuro: 50, priceMaxEuro: null, durationMin: 25 },
      { id: "taglio-standard", name: "Taglio classico", category: "taglio_barba", priceEuro: 15, priceMaxEuro: null, durationMin: 30 },
      { id: "acconciatura", name: "Acconciatura", category: "taglio_barba", priceEuro: 5, priceMaxEuro: null, durationMin: 15 },
      { id: "barba-pro", name: "Barba completa", category: "taglio_barba", priceEuro: 15, priceMaxEuro: null, durationMin: 20 },
      { id: "barba-standard", name: "Rifinitura barba", category: "taglio_barba", priceEuro: 5, priceMaxEuro: null, durationMin: 15 },
      { id: "decolorazione-meches", name: "Meches", category: "tecnici", priceEuro: 40, priceMaxEuro: 100, durationMin: 45 },
      { id: "decolorazione-cutanea", name: "Decolorazione", category: "tecnici", priceEuro: 50, priceMaxEuro: 120, durationMin: 45 },
      { id: "tintura-capelli", name: "Tintura capelli", category: "tecnici", priceEuro: 10, priceMaxEuro: 30, durationMin: 30 },
      { id: "tintura-barba", name: "Tintura barba", category: "tecnici", priceEuro: 5, priceMaxEuro: 15, durationMin: 20 },
      { id: "consulenza-sede", name: "Consulenza in sede", category: "consulenza", priceEuro: 0, priceMaxEuro: null, durationMin: 30 },
    ]);
  });
  it("shows da X € for variable-price services", () => {
    const meches = SERVICES.find((s) => s.id === "decolorazione-meches")!;
    expect(formatPrice(meches)).toBe("da 40 €");
    expect(formatPriceRange(meches)).toBe("da 40 € a 100 €");
  });
  it("shows a fixed euro amount for Taglio completo", () => {
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
