import { formatItalianDate, formatWallDate, formatWallTime, wallTimeToUtc } from "@/lib/availability";
import { getBarber, type Service } from "@/lib/catalog";
import { effectiveServiceDurationMin } from "@/lib/booking";
import { getSupabaseAdmin, isSupabaseConfigured, type AppointmentRow } from "@/lib/supabase";
import { fetchAllPages } from "@/lib/supabase-query";

export type DayBusy = {
  barberId: string;
  startsAt: string;
  endsAt: string;
  id?: string;
  durationMin?: number;
  durationOverrideMin?: number | null;
};
const BLOCKING = ["pending", "confirmed", "walk_in", "completed"] as const;

/** Raised when appointments cannot be loaded — callers must not invent free slots. */
export class AppointmentsUnavailableError extends Error {
  constructor(message = "Calendario non disponibile. Riprova tra poco.") {
    super(message);
    this.name = "AppointmentsUnavailableError";
  }
}

/** Cancelled appointments free the chair and must not get the 30-min reminder. */
export function occupiesSlot(status: string): boolean {
  return (BLOCKING as readonly string[]).includes(status);
}

export function shouldAttachCalendarReminder(status: string): boolean {
  return occupiesSlot(status) && status !== "cancelled";
}

type DayRow = {
  id: string;
  barber_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  duration_min: number;
  duration_override_min: number | null;
};

export async function loadAppointmentsBetween(
  fromDate: string,
  toDate: string,
): Promise<DayBusy[]> {
  if (!isSupabaseConfigured()) {
    throw new AppointmentsUnavailableError(
      "Database non configurato. Non possiamo mostrare orari verificati. Riprova più tardi.",
    );
  }
  const db = getSupabaseAdmin();
  if (!db) {
    throw new AppointmentsUnavailableError(
      "Calendario non raggiungibile. Riprova tra poco.",
    );
  }
  const start = fromDate <= toDate ? fromDate : toDate;
  const end = fromDate <= toDate ? toDate : fromDate;
  const dayStart = wallTimeToUtc(start, "00:00").toISOString();
  const dayEnd = wallTimeToUtc(end, "23:59").toISOString();
  const { data, error } = await fetchAllPages<DayRow>(async (from, to) =>
    db
      .from("appointments")
      .select("id, barber_id, starts_at, ends_at, status, duration_min, duration_override_min")
      .gte("starts_at", dayStart)
      .lte("starts_at", dayEnd)
      .order("starts_at", { ascending: true })
      .range(from, to),
  );
  if (error) {
    // Fallback without override column (pre-migration).
    const fallback = await fetchAllPages<{
      id: string;
      barber_id: string;
      starts_at: string;
      ends_at: string;
      status: string;
      duration_min: number;
    }>(async (from, to) =>
      db
        .from("appointments")
        .select("id, barber_id, starts_at, ends_at, status, duration_min")
        .gte("starts_at", dayStart)
        .lte("starts_at", dayEnd)
        .order("starts_at", { ascending: true })
        .range(from, to),
    );
    if (fallback.error) {
      throw new AppointmentsUnavailableError(
        "Impossibile leggere le prenotazioni. Riprova tra poco.",
      );
    }
    return fallback.data
      .filter((row) => occupiesSlot(row.status))
      .map((row) => ({
        barberId: row.barber_id,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        id: row.id,
        durationMin: row.duration_min,
        durationOverrideMin: null,
      }));
  }
  return data
    .filter((row) => occupiesSlot(row.status))
    .map((row) => ({
      barberId: row.barber_id,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      id: row.id,
      durationMin: row.duration_min,
      durationOverrideMin: row.duration_override_min,
    }));
}

export async function loadDayAppointments(date: string): Promise<DayBusy[]> {
  return loadAppointmentsBetween(date, date);
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
  const effectiveDuration = effectiveServiceDurationMin(
    row.duration_min,
    row.duration_override_min,
  );
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
    durationOverrideMin: row.duration_override_min ?? null,
    effectiveDurationMin: effectiveDuration,
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
