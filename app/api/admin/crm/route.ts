import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import { formatWallDate } from "@/lib/availability";
import { aggregateClients, aggregateStats, toCrmAppointment, type StatsPeriod } from "@/lib/crm";
import { loadCrmNotesMap, saveCrmNote } from "@/lib/crm-notes-store";
import { getSupabaseAdmin, isSupabaseConfigured, type AppointmentRow } from "@/lib/supabase";
import { fetchAllPages } from "@/lib/supabase-query";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMPTY_DB_IT =
  "Database non collegato. Il gestionale è pronto: anagrafica e statistiche si riempiranno dopo aver configurato Supabase.";

const PERIODS = new Set<StatsPeriod>(["today", "7d", "month", "year", "all"]);

export async function GET(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : formatWallDate(new Date());
  const periodRaw = searchParams.get("period") || "all";
  const period = PERIODS.has(periodRaw as StatsPeriod) ? (periodRaw as StatsPeriod) : "all";

  if (!isSupabaseConfigured()) {
    const stats = aggregateStats([], { date, period });
    return NextResponse.json({ date, period, clients: [], stats, warning: EMPTY_DB_IT });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    const stats = aggregateStats([], { date, period });
    return NextResponse.json({ date, period, clients: [], stats, warning: EMPTY_DB_IT });
  }

  const { data, error } = await fetchAllPages<AppointmentRow>(async (from, to) =>
    db
      .from("appointments")
      .select("*")
      .order("starts_at", { ascending: false })
      .range(from, to),
  );

  if (error) {
    const stats = aggregateStats([], { date, period });
    return NextResponse.json({
      date,
      period,
      clients: [],
      stats,
      warning:
        error.code === "PGRST205" || /schema cache|Could not find the table/i.test(error.message || "")
          ? "Database collegato ma manca lo schema SQL (001_schema.sql). Anagrafica vuota finché non lo esegui."
          : "Impossibile caricare i clienti. Riprova più tardi.",
    });
  }

  const { map: notesMap, source: notesSource } = await loadCrmNotesMap(db);
  const rows = ((data || []) as AppointmentRow[]).map(toCrmAppointment);
  return NextResponse.json({
    date,
    period,
    clients: aggregateClients(rows, notesMap),
    stats: aggregateStats(rows, { date, period }),
    notesSource,
  });
}

const notesSchema = z.object({
  clientKey: z.string().min(1),
  notes: z.string().max(4000),
});

export async function PATCH(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Database non collegato. Esegui supabase/migrations/005_customer_notes.sql nel SQL Editor." },
      { status: 503 },
    );
  }
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }
  const parsed = notesSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "Database non disponibile." }, { status: 503 });

  const saved = await saveCrmNote(db, parsed.data.clientKey, parsed.data.notes);
  if (!saved.ok) {
    return NextResponse.json(
      { error: saved.error },
      { status: saved.needsMigration ? 503 : 500 },
    );
  }
  return NextResponse.json({
    ok: true,
    notes: { client_key: parsed.data.clientKey, notes: saved.notes },
    notesSource: saved.source,
  });
}
