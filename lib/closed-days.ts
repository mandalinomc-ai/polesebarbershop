import type { CalendarBlock } from "@/lib/booking/calendar-blocks";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const FULL_DAY_START = "00:00:00";
const FULL_DAY_END = "23:59:00";
const CLOSED_LABEL = "Chiusura giornaliera";

type BlockRow = {
  id: string;
  block_date: string | null;
  weekday: number | null;
  barber_id: string | null;
  start_time: string;
  end_time: string;
  kind: string;
  label: string | null;
};

function normalizeTime(value: string): string {
  // Postgres time may arrive as HH:MM:SS or HH:MM:SS.mmm
  return value.slice(0, 5);
}

function rowToBlock(row: BlockRow): CalendarBlock {
  return {
    id: row.id,
    date: row.block_date,
    weekday: row.weekday,
    barberId: row.barber_id,
    start: normalizeTime(row.start_time),
    end: normalizeTime(row.end_time),
    kind: (row.kind as CalendarBlock["kind"]) || "custom",
    label: row.label || undefined,
  };
}

/** Full-day closed blocks from calendar_blocks (kind = closed, dated). */
export async function loadClosedDates(opts?: {
  from?: string;
  to?: string;
}): Promise<Set<string>> {
  const set = new Set<string>();
  if (!isSupabaseConfigured()) return set;
  const db = getSupabaseAdmin();
  if (!db) return set;

  let query = db
    .from("calendar_blocks")
    .select("block_date")
    .eq("kind", "closed")
    .not("block_date", "is", null);

  if (opts?.from && DATE_RE.test(opts.from)) {
    query = query.gte("block_date", opts.from);
  }
  if (opts?.to && DATE_RE.test(opts.to)) {
    query = query.lte("block_date", opts.to);
  }

  const { data, error } = await query;
  if (error || !data) return set;
  for (const row of data) {
    const d = row.block_date as string | null;
    if (d && DATE_RE.test(d)) set.add(d);
  }
  return set;
}

export async function isSalonClosedDate(date: string): Promise<boolean> {
  if (!DATE_RE.test(date)) return false;
  const closed = await loadClosedDates({ from: date, to: date });
  return closed.has(date);
}

/** Optional calendar blocks for the free-window engine (includes closed days). */
export async function loadCalendarBlocksFromDb(): Promise<CalendarBlock[]> {
  if (!isSupabaseConfigured()) return [];
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data, error } = await db.from("calendar_blocks").select(
    "id, block_date, weekday, barber_id, start_time, end_time, kind, label",
  );
  if (error || !data) return [];
  return (data as BlockRow[]).map(rowToBlock);
}

export async function setSalonClosedDate(
  date: string,
  closed: boolean,
): Promise<{ ok: boolean; closed: boolean; error?: string }> {
  if (!DATE_RE.test(date)) {
    return { ok: false, closed: false, error: "Data non valida (YYYY-MM-DD)." };
  }
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      closed: false,
      error: "Database non collegato.",
    };
  }
  const db = getSupabaseAdmin();
  if (!db) {
    return { ok: false, closed: false, error: "Database non disponibile." };
  }

  if (!closed) {
    const { error } = await db
      .from("calendar_blocks")
      .delete()
      .eq("kind", "closed")
      .eq("block_date", date);
    if (error) {
      return { ok: false, closed: true, error: "Impossibile riaprire la giornata." };
    }
    return { ok: true, closed: false };
  }

  const existing = await isSalonClosedDate(date);
  if (existing) return { ok: true, closed: true };

  const { error } = await db.from("calendar_blocks").insert({
    block_date: date,
    weekday: null,
    barber_id: null,
    start_time: FULL_DAY_START,
    end_time: FULL_DAY_END,
    kind: "closed",
    label: CLOSED_LABEL,
  });
  if (error) {
    const missing =
      error.code === "PGRST205" ||
      /Could not find the table|does not exist/i.test(error.message || "");
    return {
      ok: false,
      closed: false,
      error: missing
        ? "Tabella calendar_blocks mancante: esegui supabase/migrations/008_calendar_blocks.sql."
        : "Impossibile chiudere la giornata.",
    };
  }
  return { ok: true, closed: true };
}
