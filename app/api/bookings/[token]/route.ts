import { NextResponse } from "next/server";
import { formatItalianDate, formatWallDate, formatWallTime } from "@/lib/availability";
import { namesFromSnapshot, publicAppointment, shouldAttachCalendarReminder } from "@/lib/appointments";
import { customerCancelEmail, ownerCancelEmail, sendCancelEmails } from "@/lib/email";
import { buildIcs, icsFilename } from "@/lib/ics";
import { SITE, CANCEL_HOURS_BEFORE, getSiteUrl } from "@/lib/site-config";
import { getSupabaseAdmin, isSupabaseConfigured, SUPABASE_MISSING_IT, type AppointmentRow } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteCtx = { params: Promise<{ token: string }> };

async function loadByToken(token: string) {
  const db = getSupabaseAdmin();
  if (!db) return { db: null, row: null };
  const { data, error } = await db.from("appointments").select("*").eq("manage_token", token).maybeSingle();
  if (error) throw error;
  return { db, row: data as AppointmentRow | null };
}

export async function GET(request: Request, ctx: RouteCtx) {
  const { token } = await ctx.params;
  if (!token || token.length < 16) return NextResponse.json({ error: "Token non valido." }, { status: 400 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: SUPABASE_MISSING_IT }, { status: 503 });
  const wantIcs = new URL(request.url).searchParams.get("ics") === "1";
  try {
    const { row } = await loadByToken(token);
    if (!row) return NextResponse.json({ error: "Appuntamento non trovato." }, { status: 404 });
    if (wantIcs) {
      const names = namesFromSnapshot(row.services_snapshot);
      const cancelled = !shouldAttachCalendarReminder(row.status);
      const manageUrl = `${getSiteUrl()}/appuntamento/${row.manage_token}`;
      const ics = buildIcs({
        uid: `${row.manage_token}@polesebarbershop.it`,
        startsAt: new Date(row.starts_at),
        endsAt: new Date(row.ends_at),
        summary: `${SITE.name} — ${names}`,
        description: cancelled
          ? `Prenotazione annullata. ${names}`
          : names,
        location: SITE.addressFull,
        url: manageUrl,
        cancelled,
      });
      const start = new Date(row.starts_at);
      return new NextResponse(ics, {
        status: 200,
        headers: {
          "Content-Type": cancelled
            ? "text/calendar; charset=utf-8; method=CANCEL"
            : "text/calendar; charset=utf-8",
          "Content-Disposition": `attachment; filename="${icsFilename(formatWallDate(start), formatWallTime(start))}"`,
        },
      });
    }
    return NextResponse.json(publicAppointment(row));
  } catch {
    return NextResponse.json({ error: "Impossibile caricare l'appuntamento." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, ctx: RouteCtx) {
  const { token } = await ctx.params;
  if (!token || token.length < 16) return NextResponse.json({ error: "Token non valido." }, { status: 400 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: SUPABASE_MISSING_IT }, { status: 503 });
  try {
    const { db, row } = await loadByToken(token);
    if (!db || !row) return NextResponse.json({ error: "Appuntamento non trovato." }, { status: 404 });
    if (row.status === "cancelled") {
    return NextResponse.json({
      ok: true,
      alreadyCancelled: true,
      slotFreed: true,
      reminderCancelled: true,
      ics: buildIcs({
        uid: `${row.manage_token}@polesebarbershop.it`,
        startsAt: new Date(row.starts_at),
        endsAt: new Date(row.ends_at),
        summary: `${SITE.name} — ${namesFromSnapshot(row.services_snapshot)}`,
        description: `Prenotazione annullata. ${namesFromSnapshot(row.services_snapshot)}`,
        location: SITE.addressFull,
        url: `${getSiteUrl()}/appuntamento/${row.manage_token}`,
        cancelled: true,
      }),
      ...publicAppointment(row),
    });
    }
    const hoursLeft = (new Date(row.starts_at).getTime() - Date.now()) / 3_600_000;
    if (hoursLeft < CANCEL_HOURS_BEFORE) {
      return NextResponse.json({ error: `La disdetta è possibile fino a ${CANCEL_HOURS_BEFORE} ore prima. Chiama il ${SITE.phone}.` }, { status: 400 });
    }
    const { data, error } = await db.from("appointments").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", row.id).select("*").single();
    if (error) return NextResponse.json({ error: "Impossibile annullare la prenotazione." }, { status: 500 });
    const start = new Date(row.starts_at);
    const names = namesFromSnapshot(row.services_snapshot);
    const manageUrl = `${getSiteUrl()}/appuntamento/${row.manage_token}`;
    const cancelIcs = buildIcs({
      uid: `${row.manage_token}@polesebarbershop.it`,
      startsAt: new Date(row.starts_at),
      endsAt: new Date(row.ends_at),
      summary: `${SITE.name} — ${names}`,
      description: `Prenotazione annullata. ${names}`,
      location: SITE.addressFull,
      url: manageUrl,
      cancelled: true,
    });
    const dateLabel = formatItalianDate(formatWallDate(start));
    const timeLabel = formatWallTime(start);
    await sendCancelEmails({
      customerEmail: row.customer_email || "",
      customer: customerCancelEmail({
        firstName: row.customer_first_name,
        service: names,
        date: dateLabel,
        time: timeLabel,
      }),
      owner: ownerCancelEmail({
        firstName: row.customer_first_name,
        lastName: row.customer_last_name,
        email: row.customer_email || "",
        service: names,
        date: dateLabel,
        time: timeLabel,
      }),
      ics: { filename: icsFilename(formatWallDate(start), formatWallTime(start)), content: cancelIcs },
    });
    return NextResponse.json({
      ok: true,
      slotFreed: true,
      reminderCancelled: true,
      ics: cancelIcs,
      ...publicAppointment(data as AppointmentRow),
    });
  } catch {
    return NextResponse.json({ error: "Impossibile annullare la prenotazione." }, { status: 500 });
  }
}
