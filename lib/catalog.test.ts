import { describe, expect, it } from "vitest";
import {
  SERVICES,
  SERVICE_CATEGORIES,
  UNOFFICIAL_SERVICE_IDS,
  OFFICIAL_DURATION_MIN,
  formatPrice,
  formatPriceRange,
  formatDuration,
  formatDurationShort,
  totalsForServices,
  resolveServices,
  getBarber,
  BARBERS,
  isBookableServiceId,
  servicesAreOnlineBookable,
} from "./catalog";

describe("catalog", () => {
  it("contains Felice and Davide as distinct chairs plus Qualsiasi disponibilità", () => {
    expect(BARBERS.map((b) => b.id).sort()).toEqual(["anyone", "davide", "felice"].sort());
    expect(getBarber("felice")?.virtual).toBe(false);
    expect(getBarber("davide")?.virtual).toBe(false);
    expect(getBarber("anyone")?.virtual).toBe(true);
    expect(getBarber("anyone")?.name).toBe("Qualsiasi disponibilità");
  });

  it("lists exactly the 10 official listino services with fixed operational durations", () => {
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
      { id: "acconciatura", name: "Acconciatura", category: "capelli", priceEuro: 5, priceMaxEuro: null, durationMin: 10, durationKnown: true },
      { id: "taglio-bambino", name: "Taglio Bambino", category: "capelli", priceEuro: 10, priceMaxEuro: null, durationMin: 20, durationKnown: true },
      { id: "barba-pro", name: "Barba Pro", category: "barba", priceEuro: 15, priceMaxEuro: null, durationMin: 20, durationKnown: true },
      { id: "barba-standard", name: "Barba Standard", category: "barba", priceEuro: 5, priceMaxEuro: null, durationMin: 15, durationKnown: true },
      { id: "decolorazione-meches", name: "Decolorazione Meches", category: "colore", priceEuro: 40, priceMaxEuro: 100, durationMin: 150, durationKnown: true },
      { id: "decolorazione-cutanea", name: "Decolorazione Cutanea", category: "colore", priceEuro: 50, priceMaxEuro: 120, durationMin: 180, durationKnown: true },
      { id: "tintura-capelli", name: "Tintura Capelli", category: "colore", priceEuro: 10, priceMaxEuro: 30, durationMin: 30, durationKnown: true },
      { id: "tintura-barba", name: "Tintura Barba", category: "colore", priceEuro: 5, priceMaxEuro: 15, durationMin: 20, durationKnown: true },
    ]);
    expect(OFFICIAL_DURATION_MIN).toEqual({
      "taglio-pro": 50,
      "taglio-standard": 30,
      acconciatura: 10,
      "taglio-bambino": 20,
      "barba-pro": 20,
      "barba-standard": 15,
      "decolorazione-meches": 150,
      "decolorazione-cutanea": 180,
      "tintura-capelli": 30,
      "tintura-barba": 20,
    });
    expect(SERVICES.every((s) => s.durationKnown && s.active !== false)).toBe(true);
    expect(servicesAreOnlineBookable(SERVICES)).toBe(true);
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

  it("shows official ranges and Durata prevista labels (never n/d for the 10)", () => {
    const meches = SERVICES.find((s) => s.id === "decolorazione-meches")!;
    expect(formatPrice(meches)).toBe("40–100 €");
    expect(formatPriceRange(meches)).toBe("40–100 €");
    const pro = SERVICES.find((s) => s.id === "taglio-pro")!;
    expect(formatPrice(pro)).toBe("25 €");
    expect(formatDuration(pro)).toBe("Durata prevista: 50 min");
    expect(formatDurationShort(pro)).toBe("50 min");
    expect(formatDuration(SERVICES.find((s) => s.id === "acconciatura")!)).toBe("Durata prevista: 10 min");
    expect(formatDuration(SERVICES.find((s) => s.id === "barba-standard")!)).toBe("Durata prevista: 15 min");
    expect(formatDuration(meches)).toBe("Durata prevista: 150 min");
    expect(formatDuration(SERVICES.find((s) => s.id === "tintura-barba")!)).toBe("Durata prevista: 20 min");
    expect(SERVICES.find((s) => s.id === "taglio-bambino")!.priceEuro).toBe(10);
    for (const s of SERVICES) {
      expect(formatDuration(s)).not.toMatch(/n\/d|undefined|non definita/i);
    }
  });

  it("sums multi-service durations including meches 150 and keeps variable price ranges", () => {
    const totals = totalsForServices(resolveServices(["taglio-pro", "decolorazione-meches"])!);
    expect(totals.durationMin).toBe(200);
    expect(totals.priceEuro).toBe(65);
    expect(totals.priceMaxEuro).toBe(125);
    expect(totals.isVariable).toBe(true);
    expect(totals.priceLabel).toBe("65–125 €");
    expect(totals.durationKnown).toBe(true);
    expect(totals.durationLabel).toBe("Durata prevista: 200 min");
  });

  it("sums Taglio Pro + Tintura Barba to 70 min", () => {
    const totals = totalsForServices(resolveServices(["taglio-pro", "tintura-barba"])!);
    expect(totals.durationMin).toBe(70);
    expect(totals.durationLabel).toBe("Durata prevista: 70 min");
  });
});
