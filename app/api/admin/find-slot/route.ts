import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import {
  findBestAvailability,
  findFirstAvailability,
  formatItalianDate,
  formatWallDate,
  getAvailableSlots,
  getFirstBookableDate,
  suggestFillGapsForDay,
} from "@/lib/availability";
import {
  AppointmentsUnavailableError,
  loadAppointmentsBetween,
  loadDayAppointments,
} from "@/lib/appointments";
import { getBarber, resolveServices } from "@/lib/catalog";
import { resolveEffectiveServiceDuration } from "@/lib/booking";
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
  mode: z.enum(["day", "first", "best"]).optional().default("day"),
  excludeId: z.string().uuid().optional(),
  fillGaps: z
    .union([z.literal("1"), z.literal("true"), z.literal("0"), z.literal("false")])
    .optional(),
});

/**
 * Gestionale: TROVA ORARIO / PRIMA DISPONIBILITÀ / TROVA MIGLIORE —
 * same free-windows engine as the site.
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
    fillGaps: searchParams.get("fillGaps") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
  }
  const body = parsed.data;
  if (!getBarber(body.barberId)) {
    return NextResponse.json({ error: "Barbiere non valido." }, { status: 400 });
  }

  let duration = body.durationMin || 0;
  let durationMeta: ReturnType<typeof resolveEffectiveServiceDuration> | null = null;
  if (body.serviceIds) {
    const services = resolveServices(body.serviceIds.split(",").map((s) => s.trim()).filter(Boolean));
    if (!services) {
      return NextResponse.json({ error: "Servizi non validi." }, { status: 400 });
    }
    durationMeta = resolveEffectiveServiceDuration({
      services,
      durationOverrideMin: body.durationOverrideMin ?? null,
      assisted: true,
    });
    if (!durationMeta.ok || durationMeta.durationMin == null) {
      return NextResponse.json(
        { error: durationMeta.reason || "Durata non determinabile — imposta override." },
        { status: 400 },
      );
    }
    duration = durationMeta.durationMin;
  } else if (body.durationOverrideMin) {
    duration = body.durationOverrideMin;
  } else if (body.durationMin) {
    duration = body.durationMin;
  }
  if (duration <= 0) {
    return NextResponse.json({ error: "Indica durata o servizi." }, { status: 400 });
  }

  const date = body.date || getFirstBookableDate();
  const wantFillGaps = body.fillGaps === "1" || body.fillGaps === "true";

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
        durationMinutes: duration,
        durationSource: durationMeta?.source,
      });
    }

    let appointments = await loadDayAppointments(date);
    if (body.excludeId) {
      appointments = appointments.filter((a) => a.id !== body.excludeId);
    }

    if (body.mode === "best") {
      const best = findBestAvailability({
        date,
        barberId: body.barberId,
        durationMinutes: duration,
        appointments,
        now: new Date(0),
        minNoticeMinutes: 0,
      });
      if (!best) {
        return NextResponse.json({
          ok: true,
          date,
          dateLabel: formatItalianDate(date),
          durationMinutes: duration,
          first: null,
          slot: null,
          rank: null,
          message: "Nessun orario libero in questa data.",
        });
      }
      const fillGaps = wantFillGaps
        ? suggestFillGapsForDay({
            date,
            barberId: best.slot.barberId,
            durationMinutes: duration,
            appointments,
          }).slice(0, 5)
        : undefined;
      return NextResponse.json({
        ok: true,
        date,
        dateLabel: formatItalianDate(date),
        durationMinutes: duration,
        durationSource: durationMeta?.source,
        rank: best.rank,
        first: {
          label: best.slot.label,
          startIso: best.slot.startIso,
          barberId: best.slot.barberId,
          rank: best.rank,
        },
        slot: {
          date,
          label: best.slot.label,
          startIso: best.slot.startIso,
          endIso: best.slot.endIso,
          blockEndIso: best.slot.blockEndIso,
          barberId: best.slot.barberId,
          rank: best.rank,
        },
        fillGaps,
      });
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
    const fillGaps = wantFillGaps
      ? suggestFillGapsForDay({
          date,
          barberId: body.barberId === "anyone" ? "felice" : body.barberId,
          durationMinutes: duration,
          appointments,
        }).slice(0, 5)
      : undefined;
    return NextResponse.json({
      ok: true,
      date,
      dateLabel: formatItalianDate(date),
      durationMinutes: duration,
      durationSource: durationMeta?.source,
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
      fillGaps,
    });
  } catch (err) {
    const message =
      err instanceof AppointmentsUnavailableError
        ? err.message
        : "Calendario non disponibile.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
