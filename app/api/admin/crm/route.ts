import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { formatWallDate } from "@/lib/availability";
import { aggregateClients, aggregateStats, toCrmAppointment } from "@/lib/crm";
import { getSupabaseAdmin, isSupabaseConfigured, type AppointmentRow } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMPTY_DB_IT =
  "Database non collegato. Il gestionale è pronto: anagrafica e statistiche si riempiranno dopo aver configurato Supabase.";

export async function GET(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : formatWallDate(new Date());

  if (!isSupabaseConfigured()) {
    const stats = aggregateStats([], { date });
    return NextResponse.json({ date, clients: [], stats, warning: EMPTY_DB_IT });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    const stats = aggregateStats([], { date });
    return NextResponse.json({ date, clients: [], stats, warning: EMPTY_DB_IT });
  }

  const { data, error } = await db
    .from("appointments")
    .select("*")
    .order("starts_at", { ascending: false })
    .limit(4000);

  if (error) {
    const stats = aggregateStats([], { date });
    return NextResponse.json({
      date,
      clients: [],
      stats,
      warning:
        error.code === "PGRST205" || /schema cache|Could not find the table/i.test(error.message || "")
          ? "Database collegato ma manca lo schema SQL (001_schema.sql). Anagrafica vuota finché non lo esegui."
          : "Impossibile caricare i clienti. Riprova più tardi.",
    });
  }

  const rows = ((data || []) as AppointmentRow[]).map(toCrmAppointment);
  return NextResponse.json({
    date,
    clients: aggregateClients(rows),
    stats: aggregateStats(rows, { date }),
  });
}
