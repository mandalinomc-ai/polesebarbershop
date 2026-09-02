import { describe, expect, it } from "vitest";
import {
  BOOKING_NOTIFY_STORAGE_KEY,
  BOOKING_POLL_MS,
  bookingAgendaDate,
  formatNewBookingToast,
  clientReminderWhatsAppUrl,
  newBookingWhatsAppUrl,
} from "./booking-notifications";
import type { ClientRecord } from "./crm";

describe("booking-notifications", () => {
  const sample = {
    id: "abc",
    firstName: "Mario",
    lastName: "Rossi",
    phone: "+39 333 111 2233",
    email: "mario@example.com",
    startsAt: "2026-09-05T08:00:00.000Z",
    timeLabel: "10:00",
    dateLabel: "2026-09-05",
    serviceNames: "Taglio Pro",
    barberName: "Felice",
    createdAt: "2026-09-02T10:00:00.000Z",
  };

  it("formats Italian toast copy with name and slot", () => {
    expect(formatNewBookingToast(sample)).toBe("Nuova prenotazione: Mario Rossi — 2026-09-05 alle 10:00");
  });

  it("derives agenda date from startsAt", () => {
    expect(bookingAgendaDate(sample)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("builds wa.me link for reminder when phone is valid", () => {
    const url = newBookingWhatsAppUrl(sample);
    expect(url).toMatch(/^https:\/\/wa\.me\/393331112233\?text=/);
    expect(url).toContain(encodeURIComponent("Mario"));
  });

  it("builds client reminder wa.me with upcoming appointment details", () => {
    const client: Pick<ClientRecord, "firstName" | "phone" | "nextVisitAt" | "history"> = {
      firstName: "Eugenio",
      phone: "+393483470654",
      nextVisitAt: "2026-09-10T08:00:00.000Z",
      history: [
        {
          id: "x",
          startsAt: "2026-09-10T08:00:00.000Z",
          status: "confirmed",
          cancelled: false,
          serviceNames: "Taglio Pro",
          barberName: "Felice",
          priceCents: 1500,
          isWalkIn: false,
        },
      ],
    };
    const url = clientReminderWhatsAppUrl(client);
    expect(url).toMatch(/^https:\/\/wa\.me\/393483470654\?text=/);
    expect(url).toContain(encodeURIComponent("Eugenio"));
    expect(url).toContain(encodeURIComponent("Taglio Pro"));
  });

  it("returns null for client reminder without phone", () => {
    expect(
      clientReminderWhatsAppUrl({
        firstName: "Test",
        phone: "",
        nextVisitAt: null,
        history: [],
      }),
    ).toBeNull();
  });

  it("exports polling interval between 30 and 60 seconds", () => {
    expect(BOOKING_POLL_MS).toBeGreaterThanOrEqual(30_000);
    expect(BOOKING_POLL_MS).toBeLessThanOrEqual(60_000);
  });

  it("uses stable localStorage key", () => {
    expect(BOOKING_NOTIFY_STORAGE_KEY).toBe("polese_gestionale_last_seen_at");
  });
});
