import { formatWallDate, formatWallTime, timeToMinutes, wallTimeToUtc } from "./time-utils";
import type { FreeWindow } from "./free-windows";

/**
 * Calendar blocks (pause / lunch / custom) that remove time from free windows.
 * Config-first; optional DB rows can be merged at runtime.
 * Empty by default — do not invent a lunch break Felice never configured.
 */
export type CalendarBlock = {
  id: string;
  /** YYYY-MM-DD, or null for recurring weekday block */
  date?: string | null;
  /** 0=Sun … 6=Sat when date is null */
  weekday?: number | null;
  /** Barber id, or null = all chairs */
  barberId?: string | null;
  start: string; // HH:MM
  end: string; // HH:MM
  label?: string;
  kind?: "pause" | "lunch" | "custom" | "closed";
};

/** In-repo blocks — extend carefully; prefer real shop policy over invented pauses. */
export const CONFIG_CALENDAR_BLOCKS: CalendarBlock[] = [
  // Example (disabled): { id: "tue-lunch", weekday: 2, start: "13:00", end: "14:00", kind: "lunch", label: "Pausa" },
];

export function blocksForDate(
  date: string,
  blocks: CalendarBlock[] = CONFIG_CALENDAR_BLOCKS,
  barberId?: string | null,
): CalendarBlock[] {
  const { weekday } = (() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    if (!m) return { weekday: -1 };
    return {
      weekday: new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0)).getUTCDay(),
    };
  })();

  return blocks.filter((b) => {
    if (b.barberId && barberId && b.barberId !== barberId) return false;
    if (b.date) return b.date === date;
    if (b.weekday != null) return b.weekday === weekday;
    return false;
  });
}

/** Convert matching blocks to busy free-window intervals [startMin, endMin). */
export function busyMinutesFromBlocks(
  date: string,
  blocks: CalendarBlock[] = CONFIG_CALENDAR_BLOCKS,
  barberId?: string | null,
): FreeWindow[] {
  return blocksForDate(date, blocks, barberId)
    .map((b) => {
      const startMin = timeToMinutes(b.start);
      const endMin = timeToMinutes(b.end);
      if (!(endMin > startMin)) return null;
      return { startMin, endMin };
    })
    .filter((x): x is FreeWindow => x != null);
}

/** UTC busy intervals for a day (for overlap checks). */
export function utcBusyFromBlocks(
  date: string,
  blocks: CalendarBlock[] = CONFIG_CALENDAR_BLOCKS,
  barberId?: string | null,
): { start: Date; end: Date; label: string }[] {
  return blocksForDate(date, blocks, barberId).map((b) => ({
    start: wallTimeToUtc(date, b.start),
    end: wallTimeToUtc(date, b.end),
    label: b.label || b.kind || "blocco",
  }));
}

/** Merge pause from DayHours-style {start,end} into workingWindows helper input. */
export function pauseFromBlocks(
  date: string,
  blocks: CalendarBlock[] = CONFIG_CALENDAR_BLOCKS,
  barberId?: string | null,
): { start: string; end: string } | null {
  const dayBlocks = blocksForDate(date, blocks, barberId);
  // Single contiguous pause only — multiple blocks stay as busyMinutes.
  if (dayBlocks.length !== 1) return null;
  const b = dayBlocks[0]!;
  if (b.kind === "closed") return null;
  return { start: b.start, end: b.end };
}

export function describeBlockTouching(
  instant: Date,
  blocks: CalendarBlock[],
  timeZone?: string,
): CalendarBlock | undefined {
  const date = formatWallDate(instant, timeZone);
  const label = formatWallTime(instant, timeZone);
  const min = timeToMinutes(label);
  return blocksForDate(date, blocks).find((b) => {
    const a = timeToMinutes(b.start);
    const z = timeToMinutes(b.end);
    return min >= a && min < z;
  });
}
