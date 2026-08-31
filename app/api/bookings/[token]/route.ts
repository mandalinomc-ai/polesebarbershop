import { NextResponse } from "next/server";
import { publicAppointment } from "@/lib/appointments";
import { customerCancelEmail, sendEmail } from "@/lib/email";
import { cancelScheduledReminder } from "@/lib/qstash";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
  SUPABASE_MISSING_IT,
  type AppointmentRow,
} from "@/lib/supabase";
import {
  customerCancelMessage,
  sendWhatsAppMessage,
} from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ token: string }> };

async function loadByToken(token: string) {
  const db = getSupabaseAdmin();
  if (!db) return { db: null, row: null };
  const { data, error } = await db
    .from("appointments")
    .select("*")
    .eq("manage_token", token)
    .maybeSingle();
  if (error) throw error;
  return { db, row: data as AppointmentRow | null };
}

export async function GET(_request: Request, ctx: RouteCtx) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: SUPABASE_MISSING_IT }, { status: 503 });
  }
  const { token } = await ctx.params;
  if (!token) {
    return NextResponse.json({ error: "Token mancante." }, { status: 400 });
  }
  try {
    const { row } = await loadByToken(token);
    if (!row) {
      return NextResponse.json(
        { error: "Appuntamento non trovato." },
        { status: 404 },
      );
    }
    return NextResponse.json(publicAppointment(row));
  } catch {
    return NextResponse.json(
      { error: "Impossibile caricare l'appuntamento." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, ctx: RouteCtx) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: SUPABASE_MISSING_IT }, { status: 503 });
  }
  const { token } = await ctx.params;
  try {
    const { db, row } = await loadByToken(token);
    if (!db || !row) {
      return NextResponse.json(
        { error: "Appuntamento non trovato." },
        { status: 404 },
      );
    }
    if (row.status === "cancelled") {
      return NextResponse.json({
        ok: true,
        alreadyCancelled: true,
        ...publicAppointment(row),
      });
    }

    const { data, error } = await db
      .from("appointments")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .select("*")
      .single();
    if (error) {
      return NextResponse.json(
        { error: "Impossibile annullare la prenotazione." },
        { status: 500 },
      );
    }

    const updated = data as AppointmentRow;
    await cancelScheduledReminder(row.qstash_message_id);

    const view = publicAppointment(row);
    const cancelMail = customerCancelEmail({
      firstName: row.customer_first_name,
      service: view.serviceNames,
      date: view.dateLabel,
      time: view.timeLabel,
    });

    await Promise.allSettled([
      sendEmail({ to: row.customer_email, ...cancelMail }),
      sendWhatsAppMessage(
        row.customer_phone,
        customerCancelMessage({
          firstName: row.customer_first_name,
          service: view.serviceNames,
          date: view.dateLabel,
          time: view.timeLabel,
        }),
      ),
    ]);

    return NextResponse.json({ ok: true, ...publicAppointment(updated) });
  } catch {
    return NextResponse.json(
      { error: "Impossibile annullare la prenotazione." },
      { status: 500 },
    );
  }
}
