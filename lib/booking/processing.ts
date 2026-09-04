import type { Service, ServiceProcessing } from "@/lib/catalog";
import { BOOKING_BUFFER_MINUTES } from "./constants";
import { addMinutes } from "./time-utils";

export type { ServiceProcessing };

export type BusySegment = {
  start: Date;
  end: Date;
  kind: "servicing" | "processing" | "buffer";
};

/** Total client-facing wall minutes from processing config, or null if absent/invalid. */
export function clientDurationFromProcessing(
  service: Pick<Service, "processing"> | { processing?: ServiceProcessing | null },
): number | null {
  const p = service.processing;
  if (!p) return null;
  const before = Math.max(0, p.servicingBeforeMin || 0);
  const mid = Math.max(0, p.processingMin || 0);
  const after = Math.max(0, p.servicingAfterMin || 0);
  const total = before + mid + after;
  return total > 0 ? total : null;
}

/**
 * Barber-busy segments for an appointment start.
 * Buffer is always after the last servicing (separate from processing).
 * If barberFreeDuringProcessing, processing gap is omitted from busy list.
 */
export function barberBusySegments(input: {
  start: Date;
  processing: ServiceProcessing;
  bufferMinutes?: number;
}): BusySegment[] {
  const buffer = input.bufferMinutes ?? BOOKING_BUFFER_MINUTES;
  const p = input.processing;
  const before = Math.max(0, p.servicingBeforeMin || 0);
  const mid = Math.max(0, p.processingMin || 0);
  const after = Math.max(0, p.servicingAfterMin || 0);
  const freeDuring = Boolean(p.barberFreeDuringProcessing);

  const segments: BusySegment[] = [];
  let cursor = input.start;

  if (before > 0) {
    const end = addMinutes(cursor, before);
    segments.push({ start: cursor, end, kind: "servicing" });
    cursor = end;
  }

  if (mid > 0) {
    const end = addMinutes(cursor, mid);
    if (!freeDuring) {
      segments.push({ start: cursor, end, kind: "processing" });
    }
    cursor = end;
  }

  if (after > 0) {
    const end = addMinutes(cursor, after);
    segments.push({ start: cursor, end, kind: "servicing" });
    cursor = end;
  }

  if (buffer > 0) {
    segments.push({
      start: cursor,
      end: addMinutes(cursor, buffer),
      kind: "buffer",
    });
  }

  return segments.filter((s) => s.end.getTime() > s.start.getTime());
}

/** Wall-clock end including processing wait + buffer. */
export function processingBlockEnd(
  start: Date,
  processing: ServiceProcessing,
  bufferMinutes: number = BOOKING_BUFFER_MINUTES,
): Date {
  const client = clientDurationFromProcessing({ processing }) ?? 0;
  return addMinutes(start, client + Math.max(0, bufferMinutes));
}

/** True when service has usable processing config. */
export function hasProcessingConfig(service: Pick<Service, "processing">): boolean {
  return clientDurationFromProcessing(service) != null;
}
