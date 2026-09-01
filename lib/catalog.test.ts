import { describe, expect, it } from "vitest";
import { SERVICES, formatPrice, formatPriceRange, totalsForServices, resolveServices, getBarber, BARBERS } from "./catalog";

describe("catalog", () => {
  it("contains Felice and Davide as distinct chairs plus anyone", () => {
    expect(BARBERS.map((b) => b.id).sort()).toEqual(["anyone", "davide", "felice"].sort());
    expect(getBarber("felice")?.virtual).toBe(false);
    expect(getBarber("davide")?.virtual).toBe(false);
    expect(getBarber("anyone")?.virtual).toBe(true);
  });

  it("matches the official listino categories for Polese Barbershop", () => {
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
      { id: "taglio-standard", name: "Taglio Normale", category: "taglio", priceEuro: 15, priceMaxEuro: null, durationMin: 30 },
      { id: "taglio-pro", name: "Taglio Sartoriale", category: "taglio", priceEuro: 50, priceMaxEuro: null, durationMin: 25 },
      { id: "barba-pro", name: "Barba", category: "barba", priceEuro: 15, priceMaxEuro: null, durationMin: 20 },
      { id: "barba-standard", name: "Rifinitura barba", category: "barba", priceEuro: 5, priceMaxEuro: null, durationMin: 15 },
      { id: "combo-classico", name: "Combo Taglio + Barba", category: "combo", priceEuro: 30, priceMaxEuro: null, durationMin: 45 },
      { id: "combo-sartoriale", name: "Combo Sartoriale + Barba", category: "combo", priceEuro: 60, priceMaxEuro: null, durationMin: 40 },
      { id: "decolorazione-meches", name: "Meches", category: "tecnici", priceEuro: 40, priceMaxEuro: 100, durationMin: 45 },
      { id: "decolorazione-cutanea", name: "Decolorazione", category: "tecnici", priceEuro: 50, priceMaxEuro: 120, durationMin: 45 },
      { id: "tintura-capelli", name: "Tintura capelli", category: "tecnici", priceEuro: 10, priceMaxEuro: 30, durationMin: 30 },
      { id: "tintura-barba", name: "Tintura barba", category: "tecnici", priceEuro: 5, priceMaxEuro: 15, durationMin: 20 },
      { id: "consulenza-sede", name: "Consulenza Tricologica", category: "consulenza", priceEuro: 0, priceMaxEuro: null, durationMin: 30 },
    ]);
  });

  it("shows da X € for variable-price services", () => {
    const meches = SERVICES.find((s) => s.id === "decolorazione-meches")!;
    expect(formatPrice(meches)).toBe("da 40 €");
    expect(formatPriceRange(meches)).toBe("da 40 € a 100 €");
  });

  it("shows a fixed euro amount for Taglio Sartoriale", () => {
    const pro = SERVICES.find((s) => s.id === "taglio-pro")!;
    expect(pro.priceEuro).toBe(50);
    expect(pro.durationMin).toBe(25);
    expect(formatPrice(pro)).toBe("50 €");
  });

  it("includes Taglio Sartoriale and Combo services", () => {
    expect(SERVICES.some((s) => /sartoriale/i.test(s.name))).toBe(true);
    expect(SERVICES.some((s) => s.category === "combo")).toBe(true);
  });

  it("lists Consulenza Tricologica", () => {
    const consult = SERVICES.find((s) => s.id === "consulenza-sede")!;
    expect(consult.name).toBe("Consulenza Tricologica");
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
