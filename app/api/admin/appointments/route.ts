import { NextResponse } from "next/server";
import { z } from "zod";
import { addDays, formatItalianDate, formatWallDate, formatWallTime, mondayOfWeek, wallTimeToUtc } from "@/lib/availability";
import { isAdminRequest } from "@/lib/admin-auth";
import { namesFromSnapshot, publicAppointment } from "@/lib/appointments";
import { isPaidStatus } from "@/lib/crm";
import { buildStaffCancelCopy, waMeUrl } from "@/lib/crm-notify";
import { getBarber } from "@/lib/catalog";
import { sendEmail, staffCancelCustomerEmail } from "@/lib/email";
import { buildIcs, icsFilename } from "@/lib/ics";
import { SITE, getSiteUrl } from "@/lib/site-config";
import { getSupabaseAdmin, isSupabaseConfigured, SUPABASE_MISSING_IT, type AppointmentRow } from "@/lib/supabase";
import { sendCustomerWhatsApp, isWhatsAppConfigured } from "@/lib/whatsapp-outbound";
import { adminAppointmentsQuerySchema, flattenZodError } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AGENDA_EMPTY_IT =
  "Database non collegato. L'agenda è vuota finché non configuri Supabase.";

function serialize(row: AppointmentRow) {
  const start = new Date(row.starts_at);
  return {
    id: row.id,
    status: row.status,
    barberId: row.barber_id,
    barberName: getBarber(row.barber_id)?.name || row.barber_id,
    serviceNames: namesFromSnapshot(row.services_snapshot),
    firstName: row.customer_first_name,
    lastName: row.customer_last_name,
    phone: row.customer_phone,
    email: row.customer_email,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    timeLabel: formatWallTime(start),
    dateLabel: formatWallDate(start),
    durationMin: row.duration_min,
    priceCents: row.price_cents,
    isWalkIn: row.is_walk_in,
    notes: row.notes,
  };
}

export async function GET(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const parsed = adminAppointmentsQuerySchema.safeParse({
    date: searchParams.get("date") || undefined,
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
  const view = searchParams.get("view") || "day";
  const date = parsed.data.date || formatWallDate(new Date());
  const weekStart = mondayOfWeek(date);
  const rangeFrom = parsed.data.from || (view === "week" ? weekStart : date);
  const rangeTo = parsed.data.to || (view === "week" ? addDays(weekStart, 6) : date);

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      date,
      weekStart,
      view,
      rangeFrom,
      rangeTo,
      appointments: [],
      takings: { dayCents: 0, weekCents: 0 },
      warning: AGENDA_EMPTY_IT,
    });
  }
  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({
      date,
      weekStart,
      view,
      rangeFrom,
      rangeTo,
      appointments: [],
      takings: { dayCents: 0, weekCents: 0 },
      warning: AGENDA_EMPTY_IT,
    });
  }

  const { data: rangeRows, error: rangeErr } = await db
    .from("appointments")
    .select("*")
    .gte("starts_at", wallTimeToUtc(rangeFrom, "00:00").toISOString())
    .lte("starts_at", wallTimeToUtc(rangeTo, "23:59").toISOString())
    .order("starts_at", { ascending: true });

  if (rangeErr) {
    const schemaMissing =
      rangeErr.code === "PGRST205" ||
      /schema cache|Could not find the table|does not exist/i.test(rangeErr.message || "");
    return NextResponse.json({
      date,
      weekStart,
      view,
      rangeFrom,
      rangeTo,
      appointments: [],
      takings: { dayCents: 0, weekCents: 0 },
      warning: schemaMissing
        ? "Database collegato ma manca lo schema SQL (001_schema.sql). L'agenda è vuota."
        : "Impossibile caricare l'agenda.",
    }, { status: schemaMissing ? 200 : 500 });
  }

  const { data: weekRows } = await db
    .from("appointments")
    .select("price_cents, status, starts_at")
    .gte("starts_at", wallTimeToUtc(weekStart, "00:00").toISOString())
    .lt("starts_at", wallTimeToUtc(addDays(weekStart, 7), "00:00").toISOString());

  const allRows = (rangeRows || []) as AppointmentRow[];
  const dayTakings = allRows
    .filter((r) => formatWallDate(new Date(r.starts_at)) === date && isPaidStatus(r.status))
    .reduce((s, r) => s + r.price_cents, 0);
  const weekTakings = (weekRows || [])
    .filter((r: { status: string }) => isPaidStatus(r.status))
    .reduce((s: number, r: { price_cents: number }) => s + r.price_cents, 0);

  return NextResponse.json({
    date,
    weekStart,
    view,
    rangeFrom,
    rangeTo,
    appointments: allRows.map((row) => serialize(row)),
    takings: { dayCents: dayTakings, weekCents: weekTakings },
  });
}

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["confirmed", "cancelled", "completed", "walk_in"]).optional(),
  priceEuro: z.number().min(0).max(500).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  barberId: z.string().min(1).optional(),
  notes: z.string().max(500).nullable().optional(),
});

async function notifyClientOfStaffCancel(row: AppointmentRow) {
  const start = new Date(row.starts_at);
  const dateLabel = formatItalianDate(formatWallDate(start));
  const timeLabel = formatWallTime(start);
  const serviceNames = namesFromSnapshot(row.services_snapshot);
  const barberName = getBarber(row.barber_id)?.name || row.barber_id;
  const copy = buildStaffCancelCopy({
    firstName: row.customer_first_name,
    serviceNames,
    dateLabel,
    timeLabel,
    barberName,
  });
  const manageUrl = `${getSiteUrl()}/appuntamento/${row.manage_token}`;
  const cancelIcs = buildIcs({
    uid: `${row.manage_token}@polesebarbershop.it`,
    startsAt: new Date(row.starts_at),
    endsAt: new Date(row.ends_at),
    summary: `${SITE.name} — ${serviceNames}`,
    description: `Prenotazione annullata dal salone. ${serviceNames}`,
    location: SITE.addressFull,
    url: manageUrl,
    cancelled: true,
  });
  const customerWhatsAppUrl = row.customer_phone
    ? waMeUrl(row.customer_phone, copy.text)
    : null;

  let emailSent = false;
  let emailError: string | undefined;
  if (row.customer_email) {
    const mail = staffCancelCustomerEmail({
      firstName: row.customer_first_name,
      service: serviceNames,
      date: dateLabel,
      time: timeLabel,
      barber: barberName,
      bodyText: copy.text,
    });
    const result = await sendEmail({
      to: row.customer_email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      ics: {
        filename: icsFilename(formatWallDate(start), formatWallTime(start)),
        content: cancelIcs,
      },
    });
    emailSent = Boolean(result.ok);
    if (!result.ok) emailError = result.error;
  }

  let whatsappSent = false;
  let whatsappError: string | undefined;
  if (row.customer_phone && isWhatsAppConfigured()) {
    const wa = await sendCustomerWhatsApp(row.customer_phone, copy.text);
    whatsappSent = Boolean(wa.ok);
    if (!wa.ok && !wa.skipped) whatsappError = wa.error;
  }

  const notified = emailSent || whatsappSent;
  return {
    notified,
    emailSent,
    emailError,
    whatsappSent,
    whatsappError,
    customerWhatsAppUrl,
    cancelMessage: copy.text,
  };
}

export async function PATCH(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: SUPABASE_MISSING_IT }, { status: 503 });
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: SUPABASE_MISSING_IT }, { status: 503 });

  const { data: existing, error: loadErr } = await db
    .from("appointments")
    .select("*")
    .eq("id", parsed.data.id)
    .single();
  if (loadErr || !existing) {
    return NextResponse.json({ error: "Appuntamento non trovato." }, { status: 404 });
  }
  const row = existing as AppointmentRow;
  const becomingCancelled =
    parsed.data.status === "cancelled" && row.status !== "cancelled";
  const patch: Record<string, unknown> = {};

  if (parsed.data.status) {
    patch.status = parsed.data.status;
    if (parsed.data.status === "cancelled") patch.cancelled_at = new Date().toISOString();
    if (parsed.data.status === "confirmed") patch.cancelled_at = null;
  }
  if (parsed.data.priceEuro != null) patch.price_cents = Math.round(parsed.data.priceEuro * 100);
  if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes;

  const moveDate = parsed.data.date;
  const moveTime = parsed.data.startTime;
  const moveBarber = parsed.data.barberId;
  if (moveDate || moveTime || moveBarber) {
    const start = moveDate && moveTime
      ? wallTimeToUtc(moveDate, moveTime)
      : new Date(row.starts_at);
    const durationMin = row.duration_min;
    const endsAt = new Date(start.getTime() + durationMin * 60_000);
    patch.starts_at = start.toISOString();
    patch.ends_at = endsAt.toISOString();
    if (moveBarber) patch.barber_id = moveBarber;
  }

  const { data, error } = await db.from("appointments").update(patch).eq("id", parsed.data.id).select("*").single();
  if (error) {
    const overlap = error.code === "23P01" || /overlap|exclusion/i.test(error.message);
    if (overlap) {
      return NextResponse.json({ error: "Orario occupato per questo barbiere. Scegli un'altra fascia." }, { status: 409 });
    }
    return NextResponse.json({ error: "Impossibile aggiornare l'appuntamento." }, { status: 500 });
  }

  let clientNotify: Awaited<ReturnType<typeof notifyClientOfStaffCancel>> | null = null;
  if (becomingCancelled) {
    try {
      clientNotify = await notifyClientOfStaffCancel(data as AppointmentRow);
    } catch (err) {
      console.error("[admin/appointments] staff cancel notify failed", err);
      clientNotify = {
        notified: false,
        emailSent: false,
        whatsappSent: false,
        customerWhatsAppUrl: null,
        cancelMessage: "",
        emailError: "Avviso cliente non inviato.",
        whatsappError: undefined,
      };
    }
  }

  return NextResponse.json({
    ok: true,
    appointment: publicAppointment(data as AppointmentRow),
    clientNotify,
  });
}
