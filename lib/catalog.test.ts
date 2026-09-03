import { describe, expect, it } from "vitest";
import {
  SERVICES,
  SERVICE_CATEGORIES,
  UNOFFICIAL_SERVICE_IDS,
  formatPrice,
  formatPriceRange,
  formatDuration,
  totalsForServices,
  resolveServices,
  getBarber,
  BARBERS,
  isBookableServiceId,
} from "./catalog";

describe("catalog", () => {
  it("contains Felice and Davide as distinct chairs plus Qualsiasi disponibilità", () => {
    expect(BARBERS.map((b) => b.id).sort()).toEqual(["anyone", "davide", "felice"].sort());
    expect(getBarber("felice")?.virtual).toBe(false);
    expect(getBarber("davide")?.virtual).toBe(false);
    expect(getBarber("anyone")?.virtual).toBe(true);
    expect(getBarber("anyone")?.name).toBe("Qualsiasi disponibilità");
  });

  it("lists exactly the 9 official listino services and no extras", () => {
    expect(SERVICE_CATEGORIES).toEqual(["capelli", "barba", "colore"]);
    expect(SERVICES).toHaveLength(9);
    expect(
      SERVICES.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        priceEuro: s.priceEuro,
        priceMaxEuro: s.priceMaxEuro,
        durationMin: s.durationMin,
        durationKnown: s.durationKnown,
      })),
    ).toEqual([
      { id: "taglio-standard", name: "Taglio Normale", category: "taglio", priceEuro: 15, priceMaxEuro: null, durationMin: 30 },
      { id: "taglio-pro", name: "Taglio Sartoriale", category: "taglio", priceEuro: 50, priceMaxEuro: null, durationMin: 25 },
      { id: "taglio-bambino", name: "Taglio Bambino", category: "taglio", priceEuro: 10, priceMaxEuro: null, durationMin: 20 },
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

  it("does not treat Razor Taper, Skin Fade, combo or consulenza as bookable services", () => {
    for (const id of UNOFFICIAL_SERVICE_IDS) {
      expect(isBookableServiceId(id)).toBe(false);
      expect(SERVICES.some((s) => s.id === id)).toBe(false);
    }
    expect(resolveServices(["razor-taper"])).toBeNull();
    expect(resolveServices(["skin-fade"])).toBeNull();
    expect(SERVICES.some((s) => /razor taper|skin fade|combo|consulenza|sartoriale|sfumatur/i.test(s.name))).toBe(false);
    expect(SERVICES.some((s) => s.category === ("sfumature" as never))).toBe(false);
  });

  it("shows official ranges as 40–100 € and fixed prices as 50 €", () => {
    const meches = SERVICES.find((s) => s.id === "decolorazione-meches")!;
    expect(formatPrice(meches)).toBe("40–100 €");
    expect(formatPriceRange(meches)).toBe("40–100 €");
    const pro = SERVICES.find((s) => s.id === "taglio-pro")!;
    expect(formatPrice(pro)).toBe("50 €");
    expect(formatDuration(pro)).toBe("25 min");
    expect(formatDuration(SERVICES.find((s) => s.id === "acconciatura")!)).toBe("durata n/d");
    expect(formatDuration(SERVICES.find((s) => s.id === "barba-standard")!)).toBe("durata n/d");
  });

  it("sums duration buffers and uses an en-dash range when any service is variable", () => {
    const totals = totalsForServices(resolveServices(["taglio-pro", "decolorazione-meches"])!);
    expect(totals.durationMin).toBe(70);
    expect(totals.priceEuro).toBe(90);
    expect(totals.priceMaxEuro).toBe(150);
    expect(totals.isVariable).toBe(true);
    expect(totals.priceLabel).toBe("90–150 €");
    expect(totals.durationLabel).toBe("durata n/d");
  });
});
