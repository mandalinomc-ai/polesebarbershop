import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { buildNotifyCopy, GMAIL_CRM_MISSING_IT } from "@/lib/crm-notify";
import { isGmailConfigured, sendEmail, staffCrmEmail } from "@/lib/email";
import { getSupabaseAdmin, isSupabaseConfigured, type AppointmentRow } from "@/lib/supabase";
import { crmNotifySchema, flattenZodError } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }
  const parsed = crmNotifySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
  const body = parsed.data;

  let to = body.to?.toLowerCase() || "";
  let firstName = body.firstName || "";
  let dateLabel = body.dateLabel;
  let timeLabel = body.timeLabel;
  let serviceNames = body.serviceNames;
  let barberName = body.barberName;

  if (body.appointmentId) {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Database non configurato." }, { status: 503 });
    }
    const db = getSupabaseAdmin();
    if (!db) return NextResponse.json({ error: "Database non configurato." }, { status: 503 });
    const { data, error } = await db.from("appointments").select("*").eq("id", body.appointmentId).maybeSingle();
    if (error || !data) {
      return NextResponse.json({ error: "Appuntamento non trovato." }, { status: 404 });
    }
    const row = data as AppointmentRow;
    to = to || (row.customer_email || "").toLowerCase();
    firstName = firstName || row.customer_first_name;
  }

  if (!to || !to.includes("@")) {
    return NextResponse.json(
      { error: "Questo cliente non ha un indirizzo email." },
      { status: 400 },
    );
  }

  if (!isGmailConfigured()) {
    return NextResponse.json({ error: GMAIL_CRM_MISSING_IT }, { status: 503 });
  }

  const copy = buildNotifyCopy(body.template, {
    firstName,
    dateLabel,
    timeLabel,
    serviceNames,
    barberName,
  });
  const mail = staffCrmEmail({ firstName: firstName || "ciao", subject: copy.subject, body: copy.text });
  const result = await sendEmail({ to, subject: mail.subject, html: mail.html, text: mail.text });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json({ ok: true, id: result.id });
}
