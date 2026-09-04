import { describe, expect, it } from "vitest";
import {
  SERVICES,
  resolveServices,
  totalsForServices,
  servicesAreOnlineBookable,
  onlineBookingBlockReason,
  formatDuration,
} from "./catalog";
import {
  resolveEffectiveServiceDuration,
  isTechnicalBookingMessage,
  publicAvailabilityMessage,
  publicBookingWarnings,
  CLOSED_DAY_IT,
  CALENDAR_UNAVAILABLE_IT,
} from "./booking";

describe("multi-service booking combos (silent UX)", () => {
  const combos: { ids: string[]; minutes: number; label: string }[] = [
    {
      ids: ["taglio-standard", "barba-standard"],
      minutes: 45,
      label: "Taglio Standard + Barba Standard",
    },
    {
      ids: ["taglio-pro", "barba-pro"],
      minutes: 70,
      label: "Taglio Pro + Barba Pro",
    },
    {
      ids: ["taglio-pro", "tintura-barba"],
      minutes: 65,
      label: "Taglio Pro + Tintura Barba",
    },
    {
      ids: ["taglio-pro", "decolorazione-meches"],
      minutes: 140,
      label: "Taglio Pro + Meches",
    },
  ];

  it.each(combos)("$label sums to $minutes and stays online-bookable", ({ ids, minutes }) => {
    const services = resolveServices(ids)!;
    expect(services).toHaveLength(ids.length);
    expect(services.every((s) => s.durationKnown)).toBe(true);
    expect(servicesAreOnlineBookable(services)).toBe(true);
    expect(onlineBookingBlockReason(services)).toBeNull();

    const totals = totalsForServices(services);
    expect(totals.durationMin).toBe(minutes);
    expect(totals.durationKnown).toBe(true);
    expect(totals.durationLabel).toBe(`Durata prevista: ${minutes} min`);
    expect(totals.durationLabel).not.toMatch(/n\/d|non definita|inventat|assistent/i);

    const resolved = resolveEffectiveServiceDuration({ services });
    expect(resolved.ok).toBe(true);
    expect(resolved.onlineBookable).toBe(true);
    expect(resolved.durationMin).toBe(minutes);
    expect(resolved.reason).toBeUndefined();
  });

  it("empty selection stays silent (no red warning copy)", () => {
    expect(onlineBookingBlockReason([])).toBeNull();
  });

  it("all 10 official services have known durations — no n/d labels", () => {
    expect(SERVICES).toHaveLength(10);
    for (const s of SERVICES) {
      expect(s.durationKnown).toBe(true);
      expect(formatDuration(s)).toMatch(/^Durata prevista: \d+ min$/);
      expect(formatDuration(s)).not.toMatch(/n\/d|non definita|non disponibile/i);
    }
  });
});

describe("public booking messages (no engine jargon)", () => {
  it("flags technical / engine strings", () => {
    expect(isTechnicalBookingMessage("Durata non definita per: Meches")).toBe(true);
    expect(isTechnicalBookingMessage("niente durata inventata online")).toBe(true);
    expect(isTechnicalBookingMessage("Database non configurato. Non possiamo mostrare orari verificati.")).toBe(true);
    expect(isTechnicalBookingMessage("durationUnknown")).toBe(true);
    expect(isTechnicalBookingMessage("Imposta override in gestionale")).toBe(true);
    expect(isTechnicalBookingMessage(CLOSED_DAY_IT)).toBe(false);
    expect(isTechnicalBookingMessage(CALENDAR_UNAVAILABLE_IT)).toBe(false);
  });

  it("maps closed / opening / technical to simple Italian", () => {
    expect(publicAvailabilityMessage("Il salone è chiuso in questo giorno (domenica).")).toBe(
      CLOSED_DAY_IT,
    );
    expect(
      publicAvailabilityMessage("Durata non definita per: Tintura. Prenota in salone — inventata."),
    ).toBe(CALENDAR_UNAVAILABLE_IT);
    expect(
      publicAvailabilityMessage("Le prenotazioni aprono dal lunedì 7 settembre 2026."),
    ).toMatch(/prenotazioni aprono/);
  });

  it("strips jargon from post-booking warnings", () => {
    const cleaned = publicBookingWarnings([
      "Database non configurato. La prenotazione non è stata salvata.",
      "testing emails restricted",
      "L'email di conferma non è partita in automatico — usa i pulsanti calendario qui sotto.",
    ]);
    expect(cleaned.some((w) => /database|supabase|inventat|durationUnknown/i.test(w))).toBe(
      false,
    );
    expect(cleaned.some((w) => /agenda|confermare/i.test(w))).toBe(true);
    expect(cleaned.some((w) => /email di conferma/i.test(w))).toBe(true);
  });
});
