/**
 * Load optional calendar_blocks from Supabase and merge with CONFIG_CALENDAR_BLOCKS.
 * Additive / read-only — never mutates appointments.
 */
import {
  CONFIG_CALENDAR_BLOCKS,
  type CalendarBlock,
} from "@/lib/booking/calendar-blocks";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

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

function hhmm(time: string): string {
  // Postgres time may be "13:00:00"
  return String(time || "").slice(0, 5);
}

function rowToBlock(row: BlockRow): CalendarBlock {
  return {
    id: row.id,
    date: row.block_date,
    weekday: row.weekday,
    barberId: row.barber_id,
    start: hhmm(row.start_time),
    end: hhmm(row.end_time),
    kind: (row.kind as CalendarBlock["kind"]) || "custom",
    label: row.label || undefined,
  };
}

/** Config lunch + DB custom blocks. Falls back to config-only if table missing. */
export async function loadMergedCalendarBlocks(): Promise<CalendarBlock[]> {
  if (!isSupabaseConfigured()) return [...CONFIG_CALENDAR_BLOCKS];
  const db = getSupabaseAdmin();
  if (!db) return [...CONFIG_CALENDAR_BLOCKS];
  try {
    const { data, error } = await db
      .from("calendar_blocks")
      .select("id, block_date, weekday, barber_id, start_time, end_time, kind, label")
      .order("created_at", { ascending: true });
    if (error || !data) return [...CONFIG_CALENDAR_BLOCKS];
    const fromDb = (data as BlockRow[]).map(rowToBlock);
    return [...CONFIG_CALENDAR_BLOCKS, ...fromDb];
  } catch {
    return [...CONFIG_CALENDAR_BLOCKS];
  }
}

export async function listDbCalendarBlocks(): Promise<CalendarBlock[]> {
  if (!isSupabaseConfigured()) return [];
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data, error } = await db
    .from("calendar_blocks")
    .select("id, block_date, weekday, barber_id, start_time, end_time, kind, label")
    .order("block_date", { ascending: true });
  if (error || !data) return [];
  return (data as BlockRow[]).map(rowToBlock);
}

export async function insertCalendarBlock(input: {
  date: string;
  start: string;
  end: string;
  barberId?: string | null;
  label?: string;
  kind?: CalendarBlock["kind"];
}): Promise<{ ok: true; block: CalendarBlock } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Database non collegato." };
  }
  const db = getSupabaseAdmin();
  if (!db) return { ok: false, error: "Database non collegato." };
  const start = input.start.slice(0, 5);
  const end = input.end.slice(0, 5);
  if (!(end > start)) {
    return { ok: false, error: "L'orario di fine deve essere dopo l'inizio." };
  }
  const payload = {
    block_date: input.date,
    weekday: null,
    barber_id: input.barberId || null,
    start_time: start,
    end_time: end,
    kind: input.kind || "custom",
    label: input.label || "Blocco orario",
  };
  const { data, error } = await db
    .from("calendar_blocks")
    .insert(payload)
    .select("id, block_date, weekday, barber_id, start_time, end_time, kind, label")
    .single();
  if (error || !data) {
    return {
      ok: false,
      error:
        /relation|does not exist|schema cache/i.test(error?.message || "")
          ? "Tabella calendar_blocks assente. Esegui la migration 008 in Supabase SQL Editor."
          : error?.message || "Impossibile salvare il blocco.",
    };
  }
  return { ok: true, block: rowToBlock(data as BlockRow) };
}

export async function deleteCalendarBlock(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Database non collegato." };
  }
  const db = getSupabaseAdmin();
  if (!db) return { ok: false, error: "Database non collegato." };
  const { error } = await db.from("calendar_blocks").delete().eq("id", id);
  if (error) return { ok: false, error: error.message || "Eliminazione non riuscita." };
  return { ok: true };
}
