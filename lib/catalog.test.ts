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

  it("lists exactly the 10 official listino services and no extras", () => {
    expect(SERVICE_CATEGORIES).toEqual(["capelli", "barba", "colore"]);
    expect(SERVICES).toHaveLength(10);
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
      { id: "taglio-pro", name: "Taglio Pro", category: "capelli", priceEuro: 25, priceMaxEuro: null, durationMin: 50, durationKnown: true },
      { id: "taglio-standard", name: "Taglio Standard", category: "capelli", priceEuro: 15, priceMaxEuro: null, durationMin: 30, durationKnown: true },
      { id: "acconciatura", name: "Acconciatura", category: "capelli", priceEuro: 5, priceMaxEuro: null, durationMin: 15, durationKnown: false },
      { id: "taglio-bambino", name: "Taglio Bambino", category: "capelli", priceEuro: 10, priceMaxEuro: null, durationMin: 20, durationKnown: true },
      { id: "barba-pro", name: "Barba Pro", category: "barba", priceEuro: 15, priceMaxEuro: null, durationMin: 20, durationKnown: true },
      { id: "barba-standard", name: "Barba Standard", category: "barba", priceEuro: 5, priceMaxEuro: null, durationMin: 15, durationKnown: false },
      { id: "decolorazione-meches", name: "Decolorazione Meches", category: "colore", priceEuro: 40, priceMaxEuro: 100, durationMin: 45, durationKnown: false },
      { id: "decolorazione-cutanea", name: "Decolorazione Cutanea", category: "colore", priceEuro: 50, priceMaxEuro: 120, durationMin: 45, durationKnown: false },
      { id: "tintura-capelli", name: "Tintura Capelli", category: "colore", priceEuro: 10, priceMaxEuro: 30, durationMin: 30, durationKnown: false },
      { id: "tintura-barba", name: "Tintura Barba", category: "colore", priceEuro: 5, priceMaxEuro: 15, durationMin: 20, durationKnown: false },
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

  it("shows official ranges as 40–100 € and Taglio Pro as 25 € / 50 min", () => {
    const meches = SERVICES.find((s) => s.id === "decolorazione-meches")!;
    expect(formatPrice(meches)).toBe("40–100 €");
    expect(formatPriceRange(meches)).toBe("40–100 €");
    const pro = SERVICES.find((s) => s.id === "taglio-pro")!;
    expect(formatPrice(pro)).toBe("25 €");
    expect(formatDuration(pro)).toBe("50 min");
    expect(formatDuration(SERVICES.find((s) => s.id === "acconciatura")!)).toBe("durata n/d");
    expect(formatDuration(SERVICES.find((s) => s.id === "barba-standard")!)).toBe("durata n/d");
    expect(SERVICES.find((s) => s.id === "taglio-bambino")!.priceEuro).toBe(10);
  });

  it("sums duration buffers and uses an en-dash range when any service is variable", () => {
    const totals = totalsForServices(resolveServices(["taglio-pro", "decolorazione-meches"])!);
    expect(totals.durationMin).toBe(95);
    expect(totals.priceEuro).toBe(65);
    expect(totals.priceMaxEuro).toBe(125);
    expect(totals.isVariable).toBe(true);
    expect(totals.priceLabel).toBe("65–125 €");
    expect(totals.durationLabel).toBe("durata n/d");
  });
});
