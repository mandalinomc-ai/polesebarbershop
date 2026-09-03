import { describe, expect, it } from "vitest";
import type { AppointmentRow } from "./supabase";
import {
  mergeSeenIds,
  notificationFromAppointment,
  seedSeenIds,
  unreadNotifications,
} from "./crm-notifications";

function row(partial: Partial<AppointmentRow>): AppointmentRow {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    status: "confirmed",
    manage_token: "tok",
    barber_id: "felice",
    service_ids: ["taglio-standard"],
    services_snapshot: [{ name: "Taglio classico" }],
    customer_first_name: "Mario",
    customer_last_name: "Rossi",
    customer_email: "mario@example.com",
    customer_phone: "+393331112233",
    gdpr_consent_at: null,
    starts_at: "2026-09-10T07:30:00.000Z",
    ends_at: "2026-09-10T07:55:00.000Z",
    duration_min: 25,
    price_cents: 1500,
    is_walk_in: false,
    notes: null,
    source: "online",
    created_at: "2026-09-03T12:00:00.000Z",
    updated_at: "2026-09-03T12:00:00.000Z",
    cancelled_at: null,
    ...partial,
  };
}

describe("gestionale notification bell", () => {
  it("maps online bookings, walk-ins and cancellations", () => {
    const booking = notificationFromAppointment(row({}));
    expect(booking.type).toBe("booking");
    expect(booking.title).toBe("Nuova prenotazione");
    expect(booking.body).toMatch(/Mario Rossi/);
    expect(booking.body).toMatch(/Felice/);

    const walk = notificationFromAppointment(row({ is_walk_in: true, source: "walk_in", id: "22222222-2222-2222-2222-222222222222" }));
    expect(walk.type).toBe("walk_in");
    expect(walk.id).not.toBe(booking.id);

    const cancel = notificationFromAppointment(
      row({ status: "cancelled", cancelled_at: "2026-09-03T13:00:00.000Z" }),
    );
    expect(cancel.type).toBe("cancelled");
    expect(cancel.id).toContain("cancelled");
  });

  it("treats unseen items as unread so the bell can illuminate", () => {
    const items = [
      notificationFromAppointment(row({})),
      notificationFromAppointment(row({ id: "33333333-3333-3333-3333-333333333333", customer_first_name: "Luca" })),
    ];
    expect(unreadNotifications(items, []).map((n) => n.appointmentId)).toHaveLength(2);
    expect(unreadNotifications(items, [items[0].id])).toHaveLength(1);
    expect(unreadNotifications(items, items.map((n) => n.id))).toHaveLength(0);
  });

  it("seeds older history as seen on first visit", () => {
    const old = notificationFromAppointment(row({ created_at: "2026-08-01T12:00:00.000Z" }));
    const recent = notificationFromAppointment(
      row({ id: "44444444-4444-4444-4444-444444444444", created_at: "2026-09-03T10:00:00.000Z" }),
    );
    const now = Date.parse("2026-09-03T12:00:00.000Z");
    const seeded = seedSeenIds([old, recent], now, 72 * 60 * 60 * 1000);
    expect(seeded).toContain(old.id);
    expect(seeded).not.toContain(recent.id);
    expect(unreadNotifications([old, recent], mergeSeenIds([], seeded))).toEqual([recent]);
  });
});
