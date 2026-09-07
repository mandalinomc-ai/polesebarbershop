import {
  CONFIG_CALENDAR_BLOCKS,
  type CalendarBlock,
} from "@/lib/booking/calendar-blocks";
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

/** Config + DB blocks for getAvailableSlots. Empty when no blocks exist. */
export async function loadMergedCalendarBlocks(): Promise<CalendarBlock[]> {
  const dbBlocks = await loadCalendarBlocksFromDb();
  return [...CONFIG_CALENDAR_BLOCKS, ...dbBlocks];
}

const TIME_RE = /^\d{2}:\d{2}$/;
const TEMP_KIND = "custom" as const;
const TEMP_LABEL = "Blocco temporaneo";

function toPgTime(hhmm: string): string {
  return `${hhmm}:00`;
}

function missingTableMessage(error: { code?: string; message?: string }): string | null {
  const missing =
    error.code === "PGRST205" ||
    /Could not find the table|does not exist/i.test(error.message || "");
  return missing
    ? "Tabella calendar_blocks mancante: esegui supabase/migrations/008_calendar_blocks.sql."
    : null;
}

/** Dated temporary unavailability blocks (kind=custom), not full-day closed. */
export async function listTemporaryBlocks(date: string): Promise<CalendarBlock[]> {
  if (!DATE_RE.test(date) || !isSupabaseConfigured()) return [];
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data, error } = await db
    .from("calendar_blocks")
    .select("id, block_date, weekday, barber_id, start_time, end_time, kind, label")
    .eq("block_date", date)
    .eq("kind", TEMP_KIND)
    .order("start_time", { ascending: true });
  if (error || !data) return [];
  return (data as BlockRow[]).map(rowToBlock);
}

export async function createTemporaryBlock(input: {
  date: string;
  start: string;
  end: string;
  label?: string;
}): Promise<{ ok: boolean; block?: CalendarBlock; error?: string }> {
  if (!DATE_RE.test(input.date)) {
    return { ok: false, error: "Data non valida (YYYY-MM-DD)." };
  }
  if (!TIME_RE.test(input.start) || !TIME_RE.test(input.end)) {
    return { ok: false, error: "Orari non validi (HH:MM)." };
  }
  if (input.end <= input.start) {
    return { ok: false, error: "L'orario di fine deve essere dopo l'inizio." };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Database non collegato." };
  }
  const db = getSupabaseAdmin();
  if (!db) return { ok: false, error: "Database non disponibile." };

  const label = (input.label || TEMP_LABEL).trim() || TEMP_LABEL;
  const { data, error } = await db
    .from("calendar_blocks")
    .insert({
      block_date: input.date,
      weekday: null,
      barber_id: null,
      start_time: toPgTime(input.start),
      end_time: toPgTime(input.end),
      kind: TEMP_KIND,
      label,
    })
    .select("id, block_date, weekday, barber_id, start_time, end_time, kind, label")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: missingTableMessage(error || {}) || "Impossibile creare il blocco.",
    };
  }
  return { ok: true, block: rowToBlock(data as BlockRow) };
}

export async function deleteTemporaryBlock(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return { ok: false, error: "Id blocco non valido." };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Database non collegato." };
  }
  const db = getSupabaseAdmin();
  if (!db) return { ok: false, error: "Database non disponibile." };

  const { error } = await db
    .from("calendar_blocks")
    .delete()
    .eq("id", id)
    .eq("kind", TEMP_KIND);
  if (error) {
    return {
      ok: false,
      error: missingTableMessage(error) || "Impossibile eliminare il blocco.",
    };
  }
  return { ok: true };
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
