import { formatItalianDate, formatWallDate, formatWallTime, wallTimeToUtc } from "@/lib/availability";
import { getBarber, type Service } from "@/lib/catalog";
import { getSupabaseAdmin, type AppointmentRow } from "@/lib/supabase";

export type DayBusy = { barberId: string; startsAt: string; endsAt: string };
const BLOCKING = ["pending", "confirmed", "walk_in", "completed"] as const;

export async function loadDayAppointments(date: string): Promise<DayBusy[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data, error } = await db
    .from("appointments")
    .select("barber_id, starts_at, ends_at, status")
    .gte("starts_at", wallTimeToUtc(date, "00:00").toISOString())
    .lte("starts_at", wallTimeToUtc(date, "23:59").toISOString());
  if (error) return [];
  return (data || [])
    .filter((row: { status: string }) => (BLOCKING as readonly string[]).includes(row.status))
    .map((row: { barber_id: string; starts_at: string; ends_at: string }) => ({
      barberId: row.barber_id,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
    }));
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

export function namesFromSnapshot(snapshot: unknown, fallback = "") {
  if (Array.isArray(snapshot)) {
    const names = snapshot
      .map((item) => (item && typeof item === "object" && "name" in item ? String((item as { name: string }).name) : ""))
      .filter(Boolean);
    if (names.length) return names.join(" + ");
  }
  return fallback;
}

export function publicAppointment(row: AppointmentRow) {
  const start = new Date(row.starts_at);
  return {
    id: row.id,
    status: row.status,
    firstName: row.customer_first_name,
    lastName: row.customer_last_name,
    email: row.customer_email,
    phone: row.customer_phone,
    barberId: row.barber_id,
    barberName: getBarber(row.barber_id)?.name || row.barber_id,
    serviceNames: namesFromSnapshot(row.services_snapshot),
    durationMinutes: row.duration_min,
    totalPrice: row.price_cents / 100,
    priceCents: row.price_cents,
    isWalkIn: row.is_walk_in,
    notes: row.notes,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    dateLabel: formatItalianDate(formatWallDate(start)),
    timeLabel: formatWallTime(start),
    cancelledAt: row.cancelled_at,
    manageToken: row.manage_token,
  };
}
