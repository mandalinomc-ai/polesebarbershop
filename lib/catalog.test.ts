import { describe, expect, it } from "vitest";
import {
  SERVICES,
  formatPrice,
  totalsForServices,
  resolveServices,
  getBarber,
  BARBERS,
} from "./catalog";

describe("catalog", () => {
  it("contains Felice plus anyone as the virtual chair", () => {
    expect(BARBERS.map((b) => b.id).sort()).toEqual(["anyone", "felice"].sort());
    expect(getBarber("felice")?.virtual).toBe(false);
    expect(getBarber("anyone")?.virtual).toBe(true);
    expect(getBarber("felice")?.name).toBe("Felice Polese");
  });

  it("lists Taglio sartoriale at €25 / 45 min", () => {
    const taglio = SERVICES.find((s) => s.id === "taglio-sartoriale");
    expect(taglio?.price).toBe(25);
    expect(taglio?.durationMin).toBe(45);
    expect(formatPrice(taglio!)).toBe("€ 25");
  });

  it("groups services by the three menu categories", () => {
    expect(SERVICES.filter((s) => s.category === "Taglio")).toHaveLength(1);
    expect(SERVICES.filter((s) => s.category === "Barba")).toHaveLength(2);
    expect(SERVICES.filter((s) => s.category === "Trattamenti")).toHaveLength(2);
  });

  it("sums duration and price for a combo of services", () => {
    const services = resolveServices(["taglio-sartoriale", "barba-rasatura"]);
    expect(services).toBeTruthy();
    const totals = totalsForServices(services!);
    expect(totals.durationMin).toBe(75);
    expect(totals.price).toBe(43);
    expect(totals.names).toContain("Taglio sartoriale");
  });
});
