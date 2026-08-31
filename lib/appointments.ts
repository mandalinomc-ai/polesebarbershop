import {
  formatItalianDate,
  formatWallDate,
  formatWallTime,
  wallTimeToUtc,
} from "@/lib/availability";
import { getBarber, type Service } from "@/lib/catalog";
import { getSupabaseAdmin, type AppointmentRow } from "@/lib/supabase";

export type DayBusy = {
  barberId: string;
  startsAt: string;
  endsAt: string;
};

const BLOCKING = ["pending", "confirmed", "walk_in", "completed"] as const;

export async function loadDayAppointments(date: string): Promise<DayBusy[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const dayStart = wallTimeToUtc(date, "00:00").toISOString();
  const dayEnd = wallTimeToUtc(date, "23:59").toISOString();
  const { data, error } = await db
    .from("appointments")
    .select("barber_id, starts_at, ends_at, status")
    .gte("starts_at", dayStart)
    .lte("starts_at", dayEnd);
  if (error) {
    console.error("loadDayAppointments", error);
    return [];
  }
  return (data || [])
    .filter((row: { status: string }) =>
      (BLOCKING as readonly string[]).includes(row.status),
    )
    .map(
      (row: { barber_id: string; starts_at: string; ends_at: string }) => ({
        barberId: row.barber_id,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
      }),
    );
}

export function servicesSnapshot(services: Service[]) {
  return services.map((s) => ({
    id: s.id,
    name: s.name,
    durationMin: s.durationMin,
    priceEuro: s.priceEuro,
    priceMaxEuro: s.priceMaxEuro,
    isVariablePrice: s.isVariablePrice,
  }));
}

export function namesFromSnapshot(snapshot: unknown, fallback = ""): string {
  if (typeof snapshot === "string" && snapshot) return snapshot;
  if (Array.isArray(snapshot)) {
    const names = snapshot
      .map((item) =>
        item && typeof item === "object" && "name" in item
          ? String((item as { name: string }).name)
          : "",
      )
      .filter(Boolean);
    if (names.length) return names.join(" + ");
  }
  return fallback;
}

export function publicAppointment(row: AppointmentRow) {
  const start = new Date(row.starts_at);
  const barber = getBarber(row.barber_id);
  const serviceNames =
    row.service_names || namesFromSnapshot(row.services_snapshot);
  const duration = row.duration_minutes ?? row.duration_min ?? 0;
  const totalPrice = Number(
    row.total_price ?? (row.price_cents != null ? row.price_cents / 100 : 0),
  );
  return {
    id: row.id,
    status: row.status,
    firstName: row.customer_first_name,
    lastName: row.customer_last_name,
    email: row.customer_email,
    phone: row.customer_phone,
    barberId: row.barber_id,
    barberName: barber?.name || row.barber_id,
    serviceNames,
    durationMinutes: duration,
    totalPrice,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    dateLabel: formatItalianDate(formatWallDate(start)),
    timeLabel: formatWallTime(start),
    cancelledAt: row.cancelled_at,
  };
}
