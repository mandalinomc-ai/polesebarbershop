/**
 * When shop hours / lunch change, move future appointments that fall outside
 * the new windows to the next free slot (same barber), and notify the client.
 */
import {
  addDays,
  formatItalianDate,
  formatWallDate,
  formatWallTime,
  getAvailableSlots,
  toMinutes,
  weekdayOfDate,
} from "@/lib/availability";
import { effectiveServiceDurationMin } from "@/lib/booking";
import type { CalendarBlock } from "@/lib/booking/calendar-blocks";
import { busyMinutesFromBlocks } from "@/lib/booking/calendar-blocks";
import { workingWindowsFromHours } from "@/lib/booking/free-windows";
import { loadDayAppointments, namesFromSnapshot } from "@/lib/appointments";
import { barberDisplayName } from "@/lib/catalog";
import { buildStaffRescheduleCopy, waMeUrl } from "@/lib/crm-notify";
import { sendEmail, staffRescheduleCustomerEmail } from "@/lib/email";
import { buildIcs, icsFilename } from "@/lib/ics";
import {
  lunchBlocksFromHours,
  setPrimedShopHours,
  type WeekdayHours,
} from "@/lib/runtime-shop-hours";
import { SITE, getSiteUrl, getIcsUidDomain } from "@/lib/site-config";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
  type AppointmentRow,
} from "@/lib/supabase";
import { sendCustomerWhatsApp, isWhatsAppConfigured } from "@/lib/whatsapp-outbound";

export type RescheduleResult = {
  id: string;
  customerName: string;
  oldLabel: string;
  newLabel: string | null;
  ok: boolean;
  reason?: string;
  notified?: boolean;
};

function appointmentOutsideHours(
  row: AppointmentRow,
  days: WeekdayHours[],
  lunchBlocks: CalendarBlock[],
): boolean {
  const start = new Date(row.starts_at);
  const end = new Date(row.ends_at);
  const date = formatWallDate(start);
  const wd = weekdayOfDate(date);
  const day = days.find((d) => d.weekday === wd);
  if (!day || day.isClosed || !day.open || !day.close) return true;

  const startMin = toMinutes(formatWallTime(start));
  const endMin = toMinutes(formatWallTime(end));
  const openMin = toMinutes(day.open);
  const closeMin = toMinutes(day.close);
  if (startMin < openMin || endMin > closeMin) return true;

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
  return !free.some((w) => startMin >= w.startMin && endMin <= w.endMin);
}

async function notifyReschedule(previous: AppointmentRow, updated: AppointmentRow) {
  const oldStart = new Date(previous.starts_at);
  const newStart = new Date(updated.starts_at);
  const serviceNames = namesFromSnapshot(updated.services_snapshot);
  const barberName = barberDisplayName(updated.barber_id);
  const copy = buildStaffRescheduleCopy({
    firstName: updated.customer_first_name,
    serviceNames,
    oldDateLabel: formatItalianDate(formatWallDate(oldStart)),
    oldTimeLabel: formatWallTime(oldStart),
    newDateLabel: formatItalianDate(formatWallDate(newStart)),
    newTimeLabel: formatWallTime(newStart),
    barberName,
  });
  const manageUrl = `${getSiteUrl()}/appuntamento/${updated.manage_token}`;
  let emailSent = false;
  if (updated.customer_email) {
    const mail = staffRescheduleCustomerEmail({
      firstName: updated.customer_first_name,
      service: serviceNames,
      newDate: formatItalianDate(formatWallDate(newStart)),
      newTime: formatWallTime(newStart),
      oldDate: formatItalianDate(formatWallDate(oldStart)),
      oldTime: formatWallTime(oldStart),
      barber: barberName,
      bodyText: copy.text,
      manageUrl,
    });
    const icsContent = buildIcs({
      uid: `${updated.manage_token}@${getIcsUidDomain()}`,
      startsAt: newStart,
      endsAt: new Date(updated.ends_at),
      summary: `${SITE.name} — ${serviceNames}`,
      description: `${copy.text} ${SITE.addressFull}. ${manageUrl}`,
      location: SITE.addressFull,
      url: manageUrl,
    });
    const result = await sendEmail({
      to: updated.customer_email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      ics: {
        filename: icsFilename(formatWallDate(newStart), formatWallTime(newStart)),
        content: icsContent,
      },
    });
    emailSent = Boolean(result.ok);
  }
  let whatsappSent = false;
  if (updated.customer_phone && isWhatsAppConfigured()) {
    const wa = await sendCustomerWhatsApp(updated.customer_phone, copy.text);
    whatsappSent = Boolean(wa.ok);
  }
  return {
    notified: emailSent || whatsappSent,
    customerWhatsAppUrl: updated.customer_phone
      ? waMeUrl(updated.customer_phone, copy.text)
      : null,
  };
}

async function findNextSlot(input: {
  fromDate: string;
  barberId: string;
  durationMin: number;
  excludeId: string;
  lunchBlocks: CalendarBlock[];
}): Promise<{ date: string; label: string; startIso: string; endIso: string } | null> {
  let cursor = input.fromDate;
  for (let i = 0; i < 21; i += 1) {
    let dayAppointments;
    try {
      dayAppointments = (await loadDayAppointments(cursor)).filter(
        (a) => a.id !== input.excludeId,
      );
    } catch {
      cursor = addDays(cursor, 1);
      continue;
    }
    const slots = getAvailableSlots({
      date: cursor,
      barberId: input.barberId,
      durationMinutes: input.durationMin,
      appointments: dayAppointments,
      minNoticeMinutes: 0,
      now: new Date(0),
      fullSearch: true,
      calendarBlocks: input.lunchBlocks,
    });
    const pick = slots[0];
    if (pick) {
      return {
        date: cursor,
        label: pick.label,
        startIso: pick.startIso,
        endIso: pick.blockEndIso,
      };
    }
    cursor = addDays(cursor, 1);
  }
  return null;
}

export async function rescheduleAppointmentsOutsideHours(
  days: WeekdayHours[],
): Promise<RescheduleResult[]> {
  if (!isSupabaseConfigured()) return [];
  const db = getSupabaseAdmin();
  if (!db) return [];

  const lunchBlocks = lunchBlocksFromHours(days);
  setPrimedShopHours({ days, source: "database" });

  const nowIso = new Date().toISOString();
  const { data, error } = await db
    .from("appointments")
    .select("*")
    .neq("status", "cancelled")
    .gte("starts_at", nowIso)
    .order("starts_at", { ascending: true });
  if (error || !data) return [];

  const results: RescheduleResult[] = [];
  for (const raw of data as AppointmentRow[]) {
    if (!appointmentOutsideHours(raw, days, lunchBlocks)) continue;
    const oldStart = new Date(raw.starts_at);
    const oldLabel = `${formatItalianDate(formatWallDate(oldStart))} · ${formatWallTime(oldStart)}`;
    const duration = effectiveServiceDurationMin(raw.duration_min, raw.duration_override_min);
    const next = await findNextSlot({
      fromDate: formatWallDate(oldStart),
      barberId: raw.barber_id,
      durationMin: duration,
      excludeId: raw.id,
      lunchBlocks,
    });
    if (!next) {
      results.push({
        id: raw.id,
        customerName: `${raw.customer_first_name} ${raw.customer_last_name}`.trim(),
        oldLabel,
        newLabel: null,
        ok: false,
        reason: "Nessuno slot libero nei prossimi 21 giorni — riprogramma a mano.",
      });
      continue;
    }
    const noteLine = `[Riprogrammato per cambio orari: ${oldLabel} → ${formatItalianDate(next.date)} · ${next.label}]`;
    const notes = raw.notes ? `${raw.notes}\n${noteLine}` : noteLine;
    const { data: updated, error: upErr } = await db
      .from("appointments")
      .update({
        starts_at: next.startIso,
        ends_at: next.endIso,
        notes,
      })
      .eq("id", raw.id)
      .select("*")
      .single();
    if (upErr || !updated) {
      results.push({
        id: raw.id,
        customerName: `${raw.customer_first_name} ${raw.customer_last_name}`.trim(),
        oldLabel,
        newLabel: null,
        ok: false,
        reason: upErr?.message || "Aggiornamento non riuscito.",
      });
      continue;
    }
    const notify = await notifyReschedule(raw, updated as AppointmentRow);
    results.push({
      id: raw.id,
      customerName: `${raw.customer_first_name} ${raw.customer_last_name}`.trim(),
      oldLabel,
      newLabel: `${formatItalianDate(next.date)} · ${next.label}`,
      ok: true,
      notified: notify.notified,
    });
  }
  return results;
}
