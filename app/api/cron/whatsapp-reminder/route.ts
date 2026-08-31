import { Receiver } from "@upstash/qstash";
import { NextResponse } from "next/server";
import { formatWallTime } from "@/lib/availability";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
  type AppointmentRow,
} from "@/lib/supabase";
import { reminderMessage, sendWhatsAppMessage } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAuthorized(request: Request, rawBody: string): Promise<boolean> {
  const auth = request.headers.get("authorization") || "";
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;

  const signature = request.headers.get("upstash-signature");
  const current = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const next = process.env.QSTASH_NEXT_SIGNING_KEY || current;
  if (signature && current && next) {
    try {
      const receiver = new Receiver({
        currentSigningKey: current,
        nextSigningKey: next,
      });
      return await receiver.verify({ signature, body: rawBody });
    } catch {
      return false;
    }
  }
  return false;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!(await isAuthorized(request, rawBody))) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, skipped: true, reason: "no-db" });
  }

  let payload: { appointmentId?: string; manageToken?: string } = {};
  try {
    payload = rawBody ? (JSON.parse(rawBody) as typeof payload) : {};
  } catch {
    return NextResponse.json({ error: "Payload non valido." }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ ok: true, skipped: true });

  let query = db.from("appointments").select("*");
  if (payload.appointmentId) query = query.eq("id", payload.appointmentId);
  else if (payload.manageToken) query = query.eq("manage_token", payload.manageToken);
  else {
    return NextResponse.json({ error: "appointmentId mancante." }, { status: 400 });
  }

  const { data, error } = await query.maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const row = data as AppointmentRow | null;
  if (!row) return NextResponse.json({ ok: true, skipped: true, reason: "not-found" });
  if (row.status !== "confirmed") {
    return NextResponse.json({ ok: true, skipped: true, reason: "not-confirmed" });
  }
  if (row.reminder_sent_at) {
    return NextResponse.json({ ok: true, idempotent: true });
  }

  const timeLabel = formatWallTime(new Date(row.starts_at));
  const names = row.service_names || "servizio";
  const sent = await sendWhatsAppMessage(
    row.customer_phone,
    reminderMessage({
      firstName: row.customer_first_name,
      service: names,
      time: timeLabel,
    }),
  );
  if (!sent.ok) {
    return NextResponse.json({ error: sent.error, retry: true }, { status: 502 });
  }

  await db
    .from("appointments")
    .update({ reminder_sent_at: new Date().toISOString() })
    .eq("id", row.id);

  return NextResponse.json({ ok: true, skipped: sent.skipped || false });
}
