/**
 * Lists future appointments that fall outside the given shop hours / lunch.
 * Does NOT move them — the barber chooses the new slot in gestionale.
 */
import {
  formatItalianDate,
  formatWallDate,
  formatWallTime,
  toMinutes,
  weekdayOfDate,
} from "@/lib/availability";
import { effectiveServiceDurationMin } from "@/lib/booking";
import type { CalendarBlock } from "@/lib/booking/calendar-blocks";
import { busyMinutesFromBlocks } from "@/lib/booking/calendar-blocks";
import { workingWindowsFromHours } from "@/lib/booking/free-windows";
import { namesFromSnapshot } from "@/lib/appointments";
import { barberDisplayName } from "@/lib/catalog";
import { lunchBlocksFromHours, type WeekdayHours } from "@/lib/runtime-shop-hours";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
  type AppointmentRow,
} from "@/lib/supabase";

export type OutsideHoursAppointment = {
  id: string;
  customerName: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  barberId: string;
  barberName: string;
  serviceNames: string;
  dateLabel: string;
  timeLabel: string;
  startsAt: string;
  endsAt?: string;
  durationMin: number;
  durationOverrideMin?: number | null;
  effectiveDurationMin: number;
  reason: string;
};

function appointmentOutsideHours(
  row: AppointmentRow,
  days: WeekdayHours[],
  lunchBlocks: CalendarBlock[],
): string | null {
  const start = new Date(row.starts_at);
  const end = new Date(row.ends_at);
  const date = formatWallDate(start);
  const wd = weekdayOfDate(date);
  const day = days.find((d) => d.weekday === wd);
  if (!day || day.isClosed || !day.open || !day.close) {
    return "Giorno chiuso con i nuovi orari";
  }

  const startMin = toMinutes(formatWallTime(start));
  const endMin = toMinutes(formatWallTime(end));
  const openMin = toMinutes(day.open);
  const closeMin = toMinutes(day.close);
  if (startMin < openMin) return "Inizia prima dell'apertura";
  if (endMin > closeMin) return "Finisce dopo la chiusura";

  const working = workingWindowsFromHours(day.open, day.close);
  const lunchBusy = busyMinutesFromBlocks(date, lunchBlocks, row.barber_id);
  let free = working.map((w) => ({ ...w }));
  for (const b of lunchBusy) {
    const next: { startMin: number; endMin: number }[] = [];
    for (const p of free) {
      if (b.endMin <= p.startMin || b.startMin >= p.endMin) {
        next.push(p);
        continue;
      }
      if (b.startMin > p.startMin) {
        next.push({ startMin: p.startMin, endMin: Math.min(b.startMin, p.endMin) });
      }
      if (b.endMin < p.endMin) {
        next.push({ startMin: Math.max(b.endMin, p.startMin), endMin: p.endMin });
      }
    }
    free = next;
  }
  if (!free.some((w) => startMin >= w.startMin && endMin <= w.endMin)) {
    return "Cade nella pausa pranzo";
  }
  return null;
}

/** Future appointments that need a manual reschedule after hours change. */
export async function listAppointmentsOutsideHours(
  days: WeekdayHours[],
): Promise<OutsideHoursAppointment[]> {
  if (!isSupabaseConfigured()) return [];
  const db = getSupabaseAdmin();
  if (!db) return [];

  const lunchBlocks = lunchBlocksFromHours(days);
  const nowIso = new Date().toISOString();
  const { data, error } = await db
    .from("appointments")
    .select("*")
    .neq("status", "cancelled")
    .gte("starts_at", nowIso)
    .order("starts_at", { ascending: true });
  if (error || !data) return [];

  const out: OutsideHoursAppointment[] = [];
  for (const raw of data as AppointmentRow[]) {
    const reason = appointmentOutsideHours(raw, days, lunchBlocks);
    if (!reason) continue;
    const start = new Date(raw.starts_at);
    const durationMin = raw.duration_min;
    const durationOverrideMin = raw.duration_override_min ?? null;
    out.push({
      id: raw.id,
      customerName: `${raw.customer_first_name} ${raw.customer_last_name}`.trim(),
      firstName: raw.customer_first_name,
      lastName: raw.customer_last_name,
      phone: raw.customer_phone || undefined,
      email: raw.customer_email || undefined,
      barberId: raw.barber_id,
      barberName: barberDisplayName(raw.barber_id),
      serviceNames: namesFromSnapshot(raw.services_snapshot),
      dateLabel: formatItalianDate(formatWallDate(start)),
      timeLabel: formatWallTime(start),
      startsAt: raw.starts_at,
      endsAt: raw.ends_at,
      durationMin,
      durationOverrideMin,
      effectiveDurationMin: effectiveServiceDurationMin(durationMin, durationOverrideMin),
      reason,
    });
  }
  return out;
}
