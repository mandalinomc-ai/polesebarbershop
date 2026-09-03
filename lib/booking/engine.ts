import { BOOKING_BUFFER_MINUTES, SLOT_INTERVAL_MINUTES } from "./constants";
import { overlaps } from "./overlap";
import { addMinutes, minutesToTime, timeToMinutes } from "./time-utils";

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
 * Candidate start labels (HH:MM) that fit chairBlockMinutes inside [open, close).
 */
export function candidateStartLabels(
  open: string,
  close: string,
  serviceDurationMin: number,
  opts?: {
    slotIntervalMinutes?: number;
    bufferMinutes?: number;
  },
): string[] {
  const block = chairBlockMinutes(
    serviceDurationMin,
    opts?.bufferMinutes ?? BOOKING_BUFFER_MINUTES,
  );
  if (block <= 0) return [];
  const step = opts?.slotIntervalMinutes ?? SLOT_INTERVAL_MINUTES;
  const openMin = timeToMinutes(open);
  const closeMin = timeToMinutes(close);
  const labels: string[] = [];
  for (let t = openMin; t + block <= closeMin; t += step) {
    labels.push(minutesToTime(t));
  }
  return labels;
}

export {
  BOOKING_BUFFER_MINUTES,
  SLOT_INTERVAL_MINUTES,
  overlaps,
};
