import { BOOKING_BUFFER_MINUTES, SLOT_INTERVAL_MINUTES } from "./constants";
import { overlaps } from "./overlap";
import { addMinutes, minutesToTime, timeToMinutes } from "./time-utils";
import {
  candidateStartsInWindows,
  subtractBusyFromWindows,
  workingWindowsFromHours,
} from "./free-windows";

export type BusyInterval = { start: Date; end: Date };

/**
 * Chair occupation minutes = client-visible service duration + internal buffer.
 * Client UI / emails still show only `serviceDurationMin`.
 */
export function chairBlockMinutes(
  serviceDurationMin: number,
  bufferMinutes: number = BOOKING_BUFFER_MINUTES,
): number {
  if (serviceDurationMin <= 0) return 0;
  return serviceDurationMin + Math.max(0, bufferMinutes);
}

/** Client-facing end (service only). */
export function clientEndFromStart(
  start: Date,
  serviceDurationMin: number,
): Date {
  return addMinutes(start, serviceDurationMin);
}

/** Internal block end (service + buffer) — occupies the resource. */
export function blockEndFromStart(
  start: Date,
  serviceDurationMin: number,
  bufferMinutes: number = BOOKING_BUFFER_MINUTES,
): Date {
  return addMinutes(start, chairBlockMinutes(serviceDurationMin, bufferMinutes));
}

export function isIntervalFree(
  start: Date,
  end: Date,
  busy: BusyInterval[],
): boolean {
  return !busy.some((b) => overlaps(start, end, b.start, b.end));
}

/**
 * Candidate start labels (HH:MM) that fit chairBlockMinutes inside free windows.
 * Free windows = [open, close) minus busy; continuous (no forced grid snap).
 */
export function candidateStartLabels(
  open: string,
  close: string,
  serviceDurationMin: number,
  opts?: {
    slotIntervalMinutes?: number;
    bufferMinutes?: number;
    busyLabels?: { start: string; end: string }[];
    /** null = every search step (no online thinning). */
    displayIntervalMinutes?: number | null;
  },
): string[] {
  const working = workingWindowsFromHours(open, close);
  const busy = (opts?.busyLabels || []).map((b) => ({
    startMin: timeToMinutes(b.start),
    endMin: timeToMinutes(b.end),
  }));
  const free = subtractBusyFromWindows(working, busy);
  return candidateStartsInWindows(free, serviceDurationMin, {
    bufferMinutes: opts?.bufferMinutes ?? BOOKING_BUFFER_MINUTES,
    searchIntervalMinutes: opts?.slotIntervalMinutes ?? SLOT_INTERVAL_MINUTES,
    displayIntervalMinutes:
      opts?.displayIntervalMinutes === undefined ? null : opts.displayIntervalMinutes,
  }).map((s) => s.label);
}

export {
  BOOKING_BUFFER_MINUTES,
  SLOT_INTERVAL_MINUTES,
  overlaps,
};
