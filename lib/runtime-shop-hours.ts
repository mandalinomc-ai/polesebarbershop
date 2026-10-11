/**
 * Runtime shop hours + lunch (gestionale → DB → booking + public site).
 * Falls back to SHOP_HOURS / CONFIG lunch when the table is missing or empty.
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

export function defaultShopHoursState(): ShopHoursState {
  const days: WeekdayHours[] = [];
  for (let wd = 0; wd <= 6; wd += 1) {
    const h = SHOP_HOURS[wd] ?? null;
    const configLunch = CONFIG_CALENDAR_BLOCKS.find(
      (b) => b.weekday === wd && b.kind === "lunch",
    );
    const lunchFits =
      Boolean(h && configLunch) &&
      configLunch!.start >= h!.open &&
      configLunch!.end <= h!.close;
    days.push({
      weekday: wd,
      isClosed: h == null,
      open: h?.open ?? null,
      close: h?.close ?? null,
      lunchEnabled: Boolean(lunchFits),
      lunchStart: lunchFits ? configLunch!.start : null,
      lunchEnd: lunchFits ? configLunch!.end : null,
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
      label: "Pausa pranzo",
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
      lunchStart: hhmm(r.lunch_start),
      lunchEnd: hhmm(r.lunch_end),
    });
  }
  return { days, source: "database" };
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
    if (error || !data || data.length === 0) {
      cache = { at: Date.now(), state: defaults };
      return defaults;
    }
    const state = rowsToState(data as DbRow[]);
    cache = { at: Date.now(), state };
    return state;
  } catch {
    cache = { at: Date.now(), state: defaults };
    return defaults;
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
    return {
      ok: false,
      error: /relation|does not exist|schema cache/i.test(error.message || "")
        ? "Tabella shop_hours assente. Esegui la migration 011 in Supabase SQL Editor."
        : error.message || "Salvataggio non riuscito.",
    };
  }
  invalidateShopHoursCache();
  const state = await loadShopHours();
  return { ok: true, state };
}

export function formatDayHoursLine(day: WeekdayHours): string {
  const short = DAY_SHORT[day.weekday] ?? "";
  if (day.isClosed || !day.open || !day.close) return `${short} · Chiuso`;
  return `${short} · ${day.open} — ${day.close}`;
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
    ? openDays.map((d) => `${DAY_SHORT[d.weekday]} ${d.open}—${d.close}`).join(" · ")
    : "Chiuso";
  return { ...lines, weekdays };
}

export function weekdayLabel(wd: number): string {
  return DAY_LABELS[wd] ?? `Giorno ${wd}`;
}

export { DAY_LABELS, DAY_SHORT };
