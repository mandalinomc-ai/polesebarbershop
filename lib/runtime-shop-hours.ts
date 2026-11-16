/**
 * Runtime shop hours + lunch (gestionale → DB → booking + public site).
 * Prefer `shop_hours` table; if missing, persist/load via `calendar_blocks`
 * (`__shop_hours__` open rows + weekday `lunch` rows).
 */
import { SHOP_HOURS, type DayHours } from "@/lib/catalog";
import type { CalendarBlock } from "@/lib/booking/calendar-blocks";
import { CONFIG_CALENDAR_BLOCKS } from "@/lib/booking/calendar-blocks";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export type WeekdayHours = {
  weekday: number;
  isClosed: boolean;
  open: string | null;
  close: string | null;
  lunchEnabled: boolean;
  lunchStart: string | null;
  lunchEnd: string | null;
};

export type ShopHoursState = {
  days: WeekdayHours[];
  source: "database" | "defaults";
};

const DAY_LABELS = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"] as const;
const DAY_SHORT = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"] as const;

/** Marker label for open/close rows stored in calendar_blocks when shop_hours is absent. */
export const SHOP_HOURS_BLOCK_LABEL = "__shop_hours__";
export const LUNCH_BLOCK_LABEL = "Pausa pranzo";
export const DEFAULT_LUNCH_START = "13:00";
export const DEFAULT_LUNCH_END = "14:00";

const CACHE_TTL_MS = 5_000;
let cache: { at: number; state: ShopHoursState } | null = null;

/** Prime cache with unsaved/new hours (used while searching reschedule slots). */
export function setPrimedShopHours(state: ShopHoursState) {
  cache = { at: Date.now(), state };
}

function hhmm(time: string | null | undefined): string | null {
  if (!time) return null;
  return String(time).slice(0, 5);
}

function lunchFitsInDay(
  open: string | null | undefined,
  close: string | null | undefined,
  lunchStart: string,
  lunchEnd: string,
): boolean {
  if (!open || !close) return false;
  return lunchStart >= open && lunchEnd <= close && lunchEnd > lunchStart;
}

export function defaultShopHoursState(): ShopHoursState {
  const days: WeekdayHours[] = [];
  for (let wd = 0; wd <= 6; wd += 1) {
    const h = SHOP_HOURS[wd] ?? null;
    const configLunch = CONFIG_CALENDAR_BLOCKS.find(
      (b) => b.weekday === wd && b.kind === "lunch",
    );
    const lunchStart = configLunch?.start ?? DEFAULT_LUNCH_START;
    const lunchEnd = configLunch?.end ?? DEFAULT_LUNCH_END;
    const fits = Boolean(h) && lunchFitsInDay(h!.open, h!.close, lunchStart, lunchEnd);
    days.push({
      weekday: wd,
      isClosed: h == null,
      open: h?.open ?? null,
      close: h?.close ?? null,
      // Every open day that can host 13:00–14:00 gets lunch enabled by default.
      lunchEnabled: fits,
      lunchStart: fits ? lunchStart : h ? lunchStart : null,
      lunchEnd: fits ? lunchEnd : h ? lunchEnd : null,
    });
  }
  return { days, source: "defaults" };
}

export function invalidateShopHoursCache() {
  cache = null;
}

export function getShopHoursCache(): ShopHoursState | null {
  if (!cache) return null;
  if (Date.now() - cache.at > CACHE_TTL_MS) return null;
  return cache.state;
}

/** Sync read for booking engine — uses warm cache or static defaults. */
export function getRuntimeShopHoursMap(): Record<number, DayHours> {
  const state = getShopHoursCache() ?? defaultShopHoursState();
  return weekHoursToMap(state.days);
}

export function weekHoursToMap(days: WeekdayHours[]): Record<number, DayHours> {
  const out: Record<number, DayHours> = {};
  for (const d of days) {
    out[d.weekday] =
      d.isClosed || !d.open || !d.close ? null : { open: d.open, close: d.close };
  }
  return out;
}

export function lunchBlocksFromHours(days: WeekdayHours[]): CalendarBlock[] {
  return days
    .filter(
      (d) =>
        !d.isClosed &&
        d.lunchEnabled &&
        d.lunchStart &&
        d.lunchEnd &&
        d.open &&
        d.close &&
        d.lunchStart >= d.open &&
        d.lunchEnd <= d.close,
    )
    .map((d) => ({
      id: `shop-lunch-${d.weekday}`,
      weekday: d.weekday,
      start: d.lunchStart!,
      end: d.lunchEnd!,
      kind: "lunch" as const,
      label: LUNCH_BLOCK_LABEL,
    }));
}

type DbRow = {
  weekday: number;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
  lunch_enabled: boolean;
  lunch_start: string | null;
  lunch_end: string | null;
};

type BlockRow = {
  id: string;
  block_date: string | null;
  weekday: number | null;
  start_time: string;
  end_time: string;
  kind: string;
  label: string | null;
};

function rowsToState(rows: DbRow[]): ShopHoursState {
  const byWd = new Map(rows.map((r) => [r.weekday, r]));
  const days: WeekdayHours[] = [];
  for (let wd = 0; wd <= 6; wd += 1) {
    const r = byWd.get(wd);
    if (!r) {
      days.push(defaultShopHoursState().days[wd]!);
      continue;
    }
    days.push({
      weekday: wd,
      isClosed: Boolean(r.is_closed),
      open: hhmm(r.open_time),
      close: hhmm(r.close_time),
      lunchEnabled: Boolean(r.lunch_enabled),
      lunchStart: hhmm(r.lunch_start) || DEFAULT_LUNCH_START,
      lunchEnd: hhmm(r.lunch_end) || DEFAULT_LUNCH_END,
    });
  }
  return { days, source: "database" };
}

function isShopHoursMissingError(message?: string | null): boolean {
  return /relation|does not exist|schema cache|PGRST205/i.test(message || "");
}

/** Load open/close + lunch from calendar_blocks fallback rows. */
async function loadShopHoursFromCalendarBlocks(): Promise<ShopHoursState | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { data, error } = await db
    .from("calendar_blocks")
    .select("id, block_date, weekday, start_time, end_time, kind, label")
    .is("block_date", null)
    .not("weekday", "is", null);
  if (error || !data?.length) return null;

  const rows = data as BlockRow[];
  const openRows = rows.filter((r) => r.label === SHOP_HOURS_BLOCK_LABEL && r.kind === "custom");
  const lunchRows = rows.filter((r) => r.kind === "lunch" && r.weekday != null);
  if (!openRows.length && !lunchRows.length) return null;

  const defaults = defaultShopHoursState();
  const days: WeekdayHours[] = defaults.days.map((d) => ({ ...d }));

  for (const r of openRows) {
    if (r.weekday == null) continue;
    const idx = days.findIndex((d) => d.weekday === r.weekday);
    if (idx < 0) continue;
    const open = hhmm(r.start_time);
    const close = hhmm(r.end_time);
    days[idx] = {
      ...days[idx]!,
      isClosed: false,
      open,
      close,
    };
  }

  // Closed days: default Sunday stays closed unless an open row exists.
  // If we have any open rows, mark weekdays without open rows as closed only when
  // they were open in defaults but intentionally omitted — keep defaults for missing.
  for (const lunch of lunchRows) {
    if (lunch.weekday == null) continue;
    const idx = days.findIndex((d) => d.weekday === lunch.weekday);
    if (idx < 0) continue;
    const day = days[idx]!;
    if (day.isClosed) continue;
    const lunchStart = hhmm(lunch.start_time) || DEFAULT_LUNCH_START;
    const lunchEnd = hhmm(lunch.end_time) || DEFAULT_LUNCH_END;
    days[idx] = {
      ...day,
      lunchEnabled: lunchFitsInDay(day.open, day.close, lunchStart, lunchEnd),
      lunchStart,
      lunchEnd,
    };
  }

  // Clear lunch on open days that have no lunch row when open rows were saved
  // (explicit save without lunch for that weekday).
  if (openRows.length) {
    const lunchWd = new Set(lunchRows.map((r) => r.weekday));
    for (let i = 0; i < days.length; i += 1) {
      const d = days[i]!;
      if (d.isClosed) continue;
      if (!lunchWd.has(d.weekday)) {
        days[i] = {
          ...d,
          lunchEnabled: false,
          lunchStart: d.lunchStart || DEFAULT_LUNCH_START,
          lunchEnd: d.lunchEnd || DEFAULT_LUNCH_END,
        };
      }
    }
  }

  return { days, source: "database" };
}

async function saveShopHoursToCalendarBlocks(
  days: WeekdayHours[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = getSupabaseAdmin();
  if (!db) return { ok: false, error: "Database non collegato." };

  // Remove previous fallback open rows + recurring lunch (weekday, no date).
  const { data: existing, error: listErr } = await db
    .from("calendar_blocks")
    .select("id, block_date, weekday, kind, label")
    .is("block_date", null)
    .not("weekday", "is", null);
  if (listErr) {
    return { ok: false, error: listErr.message || "Impossibile leggere i blocchi orari." };
  }
  const toDelete = (existing || []).filter(
    (r: { kind: string; label: string | null }) =>
      r.label === SHOP_HOURS_BLOCK_LABEL || r.kind === "lunch",
  );
  for (const row of toDelete) {
    const { error: delErr } = await db.from("calendar_blocks").delete().eq("id", row.id);
    if (delErr) {
      return { ok: false, error: delErr.message || "Impossibile aggiornare la pausa pranzo." };
    }
  }

  const inserts: Array<{
    block_date: null;
    weekday: number;
    barber_id: null;
    start_time: string;
    end_time: string;
    kind: string;
    label: string;
  }> = [];

  for (const d of days) {
    if (d.isClosed || !d.open || !d.close) continue;
    inserts.push({
      block_date: null,
      weekday: d.weekday,
      barber_id: null,
      start_time: d.open,
      end_time: d.close,
      kind: "custom",
      label: SHOP_HOURS_BLOCK_LABEL,
    });
    if (d.lunchEnabled && d.lunchStart && d.lunchEnd) {
      inserts.push({
        block_date: null,
        weekday: d.weekday,
        barber_id: null,
        start_time: d.lunchStart,
        end_time: d.lunchEnd,
        kind: "lunch",
        label: LUNCH_BLOCK_LABEL,
      });
    }
  }

  if (inserts.length) {
    const { error: insErr } = await db.from("calendar_blocks").insert(inserts);
    if (insErr) {
      return {
        ok: false,
        error: insErr.message || "Impossibile salvare orari e pausa pranzo.",
      };
    }
  }
  return { ok: true };
}

export async function loadShopHours(): Promise<ShopHoursState> {
  const hit = getShopHoursCache();
  if (hit) return hit;
  const defaults = defaultShopHoursState();
  if (!isSupabaseConfigured()) {
    cache = { at: Date.now(), state: defaults };
    return defaults;
  }
  const db = getSupabaseAdmin();
  if (!db) {
    cache = { at: Date.now(), state: defaults };
    return defaults;
  }
  try {
    const { data, error } = await db
      .from("shop_hours")
      .select(
        "weekday, is_closed, open_time, close_time, lunch_enabled, lunch_start, lunch_end",
      )
      .order("weekday", { ascending: true });
    if (!error && data && data.length > 0) {
      const state = rowsToState(data as DbRow[]);
      cache = { at: Date.now(), state };
      return state;
    }
    // Table missing / empty → calendar_blocks fallback, then defaults.
    const fromBlocks = await loadShopHoursFromCalendarBlocks();
    if (fromBlocks) {
      cache = { at: Date.now(), state: fromBlocks };
      return fromBlocks;
    }
    cache = { at: Date.now(), state: defaults };
    return defaults;
  } catch {
    const fromBlocks = await loadShopHoursFromCalendarBlocks().catch(() => null);
    const state = fromBlocks || defaults;
    cache = { at: Date.now(), state };
    return state;
  }
}

/** Warm cache before booking / agenda calculations. */
export async function warmShopHoursCache(): Promise<ShopHoursState> {
  invalidateShopHoursCache();
  return loadShopHours();
}

export function validateWeekdayHours(
  day: WeekdayHours,
): string | null {
  if (day.isClosed) return null;
  if (!day.open || !day.close) return `${DAY_LABELS[day.weekday]}: inserisci apertura e chiusura.`;
  if (!(day.close > day.open)) {
    return `${DAY_LABELS[day.weekday]}: la chiusura deve essere dopo l'apertura.`;
  }
  if (day.lunchEnabled) {
    if (!day.lunchStart || !day.lunchEnd) {
      return `${DAY_LABELS[day.weekday]}: inserisci inizio e fine pausa pranzo.`;
    }
    if (!(day.lunchEnd > day.lunchStart)) {
      return `${DAY_LABELS[day.weekday]}: la pausa deve finire dopo l'inizio.`;
    }
    if (day.lunchStart < day.open || day.lunchEnd > day.close) {
      return `${DAY_LABELS[day.weekday]}: la pausa pranzo deve stare dentro l'orario di apertura.`;
    }
  }
  return null;
}

export async function saveShopHours(
  days: WeekdayHours[],
): Promise<{ ok: true; state: ShopHoursState } | { ok: false; error: string }> {
  if (days.length !== 7) {
    return { ok: false, error: "Servono gli orari per tutti i 7 giorni." };
  }
  for (const d of days) {
    const err = validateWeekdayHours(d);
    if (err) return { ok: false, error: err };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Database non collegato." };
  }
  const db = getSupabaseAdmin();
  if (!db) return { ok: false, error: "Database non collegato." };

  const payload = days.map((d) => ({
    weekday: d.weekday,
    is_closed: d.isClosed,
    open_time: d.isClosed ? null : d.open,
    close_time: d.isClosed ? null : d.close,
    lunch_enabled: !d.isClosed && d.lunchEnabled,
    lunch_start: !d.isClosed && d.lunchEnabled ? d.lunchStart : null,
    lunch_end: !d.isClosed && d.lunchEnabled ? d.lunchEnd : null,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await db.from("shop_hours").upsert(payload, { onConflict: "weekday" });
  if (error) {
    if (isShopHoursMissingError(error.message)) {
      const fallback = await saveShopHoursToCalendarBlocks(days);
      if (!fallback.ok) return fallback;
      invalidateShopHoursCache();
      const state = await loadShopHours();
      return { ok: true, state };
    }
    return {
      ok: false,
      error: error.message || "Salvataggio non riuscito.",
    };
  }
  // Keep lunch in calendar_blocks in sync too (booking merge prefers shop_hours lunch).
  await saveShopHoursToCalendarBlocks(days).catch(() => null);
  invalidateShopHoursCache();
  const state = await loadShopHours();
  return { ok: true, state };
}

export function formatDayHoursLine(day: WeekdayHours): string {
  const short = DAY_SHORT[day.weekday] ?? "";
  if (day.isClosed || !day.open || !day.close) return `${short} · Chiuso`;
  const base = `${short} · ${day.open} — ${day.close}`;
  if (day.lunchEnabled && day.lunchStart && day.lunchEnd) {
    return `${base} · pausa ${day.lunchStart}–${day.lunchEnd}`;
  }
  return base;
}

export function formatDisplayHours(state: ShopHoursState) {
  const by = (wd: number) => state.days.find((d) => d.weekday === wd)!;
  const lines = {
    monday: formatDayHoursLine(by(1)),
    tuesday: formatDayHoursLine(by(2)),
    wednesday: formatDayHoursLine(by(3)),
    thursday: formatDayHoursLine(by(4)),
    friday: formatDayHoursLine(by(5)),
    saturday: formatDayHoursLine(by(6)),
    sunday: formatDayHoursLine(by(0)),
  };
  const openDays = state.days.filter((d) => !d.isClosed && d.open && d.close);
  const weekdays = openDays.length
    ? openDays
        .map((d) => {
          const base = `${DAY_SHORT[d.weekday]} ${d.open}—${d.close}`;
          return d.lunchEnabled && d.lunchStart && d.lunchEnd
            ? `${base} (pausa ${d.lunchStart}–${d.lunchEnd})`
            : base;
        })
        .join(" · ")
    : "Chiuso";
  return { ...lines, weekdays };
}

export function weekdayLabel(wd: number): string {
  return DAY_LABELS[wd] ?? `Giorno ${wd}`;
}

export { DAY_LABELS, DAY_SHORT };
