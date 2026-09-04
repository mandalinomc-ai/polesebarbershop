import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import {
  findFirstAvailability,
  formatItalianDate,
  formatWallDate,
  formatWallTime,
  getAvailableSlots,
  getFirstBookableDate,
} from "@/lib/availability";
import {
  AppointmentsUnavailableError,
  loadAppointmentsBetween,
  loadDayAppointments,
} from "@/lib/appointments";
import { getBarber, resolveServices, totalsForServices } from "@/lib/catalog";
import { effectiveServiceDurationMin } from "@/lib/booking";
import { z } from "zod";
import { flattenZodError } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  barberId: z.string().min(1),
  serviceIds: z.string().optional(),
  durationMin: z.coerce.number().int().min(1).max(480).optional(),
  durationOverrideMin: z.coerce.number().int().min(1).max(480).optional(),
  mode: z.enum(["day", "first"]).optional().default("day"),
  excludeId: z.string().uuid().optional(),
});

/**
 * Gestionale: TROVA ORARIO / PRIMA DISPONIBILITÀ — same free-windows engine as the site.
 */
export async function GET(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    date: searchParams.get("date") || undefined,
    barberId: searchParams.get("barberId") || "felice",
    serviceIds: searchParams.get("serviceIds") || undefined,
    durationMin: searchParams.get("durationMin") || undefined,
    durationOverrideMin: searchParams.get("durationOverrideMin") || undefined,
    mode: searchParams.get("mode") || "day",
    excludeId: searchParams.get("excludeId") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
  }
  const body = parsed.data;
  if (!getBarber(body.barberId)) {
    return NextResponse.json({ error: "Barbiere non valido." }, { status: 400 });
  }

  let duration = body.durationMin || 0;
  if (body.serviceIds) {
    const services = resolveServices(body.serviceIds.split(",").map((s) => s.trim()).filter(Boolean));
    if (!services) {
      return NextResponse.json({ error: "Servizi non validi." }, { status: 400 });
    }
    duration = totalsForServices(services).durationMin;
  }
  duration = effectiveServiceDurationMin(duration, body.durationOverrideMin ?? null);
  if (duration <= 0) {
    return NextResponse.json({ error: "Indica durata o servizi." }, { status: 400 });
  }

  const date = body.date || getFirstBookableDate();

  try {
    if (body.mode === "first") {
      const rangeEnd = formatWallDate(new Date(Date.now() + 21 * 86400000));
      let appointments = await loadAppointmentsBetween(date, rangeEnd);
      if (body.excludeId) {
        appointments = appointments.filter((a) => a.id !== body.excludeId);
      }
      const slot = findFirstAvailability({
        barberId: body.barberId,
        durationMinutes: duration,
        appointments,
        now: new Date(),
        fromDate: date,
        minNoticeMinutes: 0,
      });
      if (!slot) {
        return NextResponse.json({ ok: true, slot: null, message: "Nessuna disponibilità nei prossimi giorni." });
      }
      return NextResponse.json({
        ok: true,
        slot: {
          date: formatWallDate(slot.start),
          dateLabel: formatItalianDate(formatWallDate(slot.start)),
          label: slot.label,
          startIso: slot.startIso,
          endIso: slot.endIso,
          blockEndIso: slot.blockEndIso,
          barberId: slot.barberId,
        },
      });
    }

    let appointments = await loadDayAppointments(date);
    if (body.excludeId) {
      appointments = appointments.filter((a) => a.id !== body.excludeId);
    }
    const slots = getAvailableSlots({
      date,
      barberId: body.barberId,
      durationMinutes: duration,
      appointments,
      minNoticeMinutes: 0,
      now: new Date(0),
      fullSearch: true,
    });
    return NextResponse.json({
      ok: true,
      date,
      dateLabel: formatItalianDate(date),
      durationMinutes: duration,
      slots: slots.slice(0, 24).map((s) => ({
        label: s.label,
        startIso: s.startIso,
        endIso: s.endIso,
        blockEndIso: s.blockEndIso,
        barberId: s.barberId,
      })),
      first: slots[0]
        ? {
            label: slots[0].label,
            startIso: slots[0].startIso,
            barberId: slots[0].barberId,
          }
        : null,
    });
  } catch (err) {
    const message =
      err instanceof AppointmentsUnavailableError
        ? err.message
        : "Calendario non disponibile.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
