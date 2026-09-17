import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SERVICES, onlineBookableServices, isWhatsAppOnlyService } from "./catalog";
import { buildStaffRescheduleCopy } from "./crm-notify";
import { getWhatsAppConsulenzaUrl, CONSULTATION_SELECTION_SYNC_EVENT } from "./site-config";

describe("dual listino + consultation cart + reschedule notify", () => {
  it("splits catalog into online vs WhatsApp-only consulenza", () => {
    const online = onlineBookableServices();
    const consult = SERVICES.filter((s) => s.whatsAppOnly);
    expect(online.map((s) => s.id).sort()).toEqual(
      ["acconciatura", "barba-pro", "barba-standard", "taglio-bambino", "taglio-standard"].sort(),
    );
    expect(consult.length).toBe(5);
    expect(online.every((s) => !isWhatsAppOnlyService(s.id))).toBe(true);
    expect(consult.every((s) => isWhatsAppOnlyService(s.id))).toBe(true);
  });

  it("builds multi-treatment consulenza WhatsApp URL", () => {
    const url = getWhatsAppConsulenzaUrl("Taglio Pro + Decolorazione Meches");
    expect(url).toContain("wa.me/");
    expect(url).toContain(
      encodeURIComponent("Salve vorrei una consulenza per Taglio Pro + Decolorazione Meches"),
    );
  });

  it("exposes dual listino titles and dual carts in UI", () => {
    const listino = readFileSync(join(process.cwd(), "components/booking/ServiceListino.tsx"), "utf8");
    expect(listino).toMatch(/Listino prenota ora/);
    expect(listino).toMatch(/Listino consulenza/);
    expect(listino).toMatch(/ConsultationMiniCart/);
    expect(listino).toMatch(/Prenota sul calendario/);
    expect(listino).toMatch(/setOpen\(false\)/);
    expect(listino).toMatch(/BOOKING_GO_CALENDAR_EVENT|polese-booking-go-calendar/);
    expect(listino).toMatch(/detail:\s*\{\s*ids:/);
    expect(listino).toMatch(/is-rise/);
    expect(CONSULTATION_SELECTION_SYNC_EVENT).toMatch(/consultation/);
  });

  it("reschedule copy mentions old and new times without inventing a second booking", () => {
    const copy = buildStaffRescheduleCopy({
      firstName: "Mario",
      serviceNames: "Taglio Pro",
      oldDateLabel: "martedì 15 settembre 2026",
      oldTimeLabel: "10:00",
      newDateLabel: "martedì 15 settembre 2026",
      newTimeLabel: "10:30",
      barberName: "Felice",
    });
    expect(copy.text).toMatch(/10:30/);
    expect(copy.text).toMatch(/10:00/);
    expect(copy.text).toMatch(/aggiornato/);
  });
});
