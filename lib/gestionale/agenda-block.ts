/**
 * Gestionale agenda helpers — Fresha-style block timing.
 * Pure functions; no DB writes. Missing buffer_time → 0 (retrocompat).
 */
import { SHOP_HOURS } from "@/lib/catalog";
import { BOOKING_BUFFER_MINUTES, chairBlockMinutes } from "@/lib/booking";
import {
  addMinutes,
  formatWallTime,
  minutesToTime,
  timeToMinutes,
  wallTimeToUtc,
} from "@/lib/booking/time-utils";

function weekdayOfDate(date: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return 0;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
}

export const INSUFFICIENT_AGENDA_TIME_IT = "Tempo insufficiente in agenda";

export type AgendaBlockInput = {
  startsAt: Date | string;
  endsAt?: Date | string | null;
  /** Client-facing service duration (minutes). */
  durationMin: number;
  /**
   * Optional buffer. Missing / null / undefined / NaN → 0
   * (existing appointments without buffer_time stay visually identical).
   */
  bufferTime?: number | null;
};

export type ResolvedAgendaBlock = {
  start: Date;
  end: Date;
  serviceMinutes: number;
  /** Effective buffer used when endsAt was absent. */
  bufferMinutes: number;
};

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Normalize optional buffer_time — never invent a buffer for legacy rows. */
export function resolveBufferMinutes(bufferTime?: number | null): number {
  if (bufferTime == null || !Number.isFinite(bufferTime) || bufferTime <= 0) return 0;
  return Math.floor(bufferTime);
}

/**
 * Resolve occupied chair interval for agenda rendering.
 * Prefer stored endsAt (preserves existing bookings 1:1).
 * If endsAt is missing: start + duration + buffer (buffer defaults to 0).
 */
export function resolveAppointmentBlock(input: AgendaBlockInput): ResolvedAgendaBlock {
  const start = asDate(input.startsAt);
  const serviceMinutes = Math.max(0, Math.floor(input.durationMin || 0));
  const bufferMinutes = resolveBufferMinutes(input.bufferTime);

  if (input.endsAt != null && String(input.endsAt).trim() !== "") {
    const end = asDate(input.endsAt);
    if (!Number.isNaN(end.getTime()) && end.getTime() >= start.getTime()) {
      return { start, end, serviceMinutes, bufferMinutes };
    }
  }

  return {
    start,
    end: addMinutes(start, serviceMinutes + bufferMinutes),
    serviceMinutes,
    bufferMinutes,
  };
}

/** "08:30 – 09:30" */
export function formatTimeRange(start: Date, end: Date, timeZone?: string): string {
  return `${formatWallTime(start, timeZone)} – ${formatWallTime(end, timeZone)}`;
}

/** "08:30 – 09:30 | Giuseppe Coppola - Taglio Pro" */
export function formatAgendaBlockLabel(
  start: Date,
  end: Date,
  body: string,
  timeZone?: string,
): string {
  const range = formatTimeRange(start, end, timeZone);
  const text = body.trim() || "Prenotato";
  return `${range} | ${text}`;
}

/** Free 30-min cell label: "08:30 – 09:00 | LIBERO" */
export function formatFreeSlotLabel(startTime: string, stepMinutes = 30): string {
  const startMin = timeToMinutes(startTime);
  const endLabel = minutesToTime(startMin + stepMinutes);
  return `${startTime} – ${endLabel} | LIBERO`;
}

export type BusyForGap = {
  barberId: string;
  startsAt: Date | string;
  endsAt?: Date | string | null;
  durationMin?: number;
  bufferTime?: number | null;
  status?: string;
};

/** Shop close HH:MM for a date (Europe/Rome weekday), or null if closed. */
export function shopCloseTimeForDate(date: string): string | null {
  const hours = SHOP_HOURS[weekdayOfDate(date)] ?? null;
  return hours?.close ?? null;
}

/**
 * Minutes free from `startTime` until the next busy block (or shop close).
 * Overlap at start → 0.
 */
export function freeMinutesFromStart(input: {
  date: string;
  startTime: string;
  barberId: string;
  appointments: BusyForGap[];
  closeTime?: string | null;
  timeZone?: string;
}): number {
  const closeLabel = input.closeTime ?? shopCloseTimeForDate(input.date);
  if (!closeLabel) return 0;

  const start = wallTimeToUtc(input.date, input.startTime, input.timeZone);
  const close = wallTimeToUtc(input.date, closeLabel, input.timeZone);
  if (!(close.getTime() > start.getTime())) return 0;

  let nextBusy = close.getTime();

  for (const appt of input.appointments) {
    if (appt.barberId !== input.barberId) continue;
    if (appt.status === "cancelled") continue;
    const block = resolveAppointmentBlock({
      startsAt: appt.startsAt,
      endsAt: appt.endsAt,
      durationMin: appt.durationMin ?? 0,
      bufferTime: appt.bufferTime,
    });
    if (Number.isNaN(block.start.getTime()) || Number.isNaN(block.end.getTime())) continue;
    if (block.end.getTime() <= start.getTime()) continue;
    if (block.start.getTime() < start.getTime() && block.end.getTime() > start.getTime()) {
      return 0;
    }
    if (block.start.getTime() >= start.getTime() && block.start.getTime() < nextBusy) {
      nextBusy = block.start.getTime();
    }
  }

  return Math.max(0, Math.floor((nextBusy - start.getTime()) / 60_000));
}

/** Chair block for a new gestionale booking = service + operational buffer. */
export function newBookingBlockMinutes(
  serviceDurationMin: number,
  bufferMinutes: number = BOOKING_BUFFER_MINUTES,
): number {
  return chairBlockMinutes(serviceDurationMin, bufferMinutes);
}

export function serviceFitsInFreeMinutes(
  serviceDurationMin: number,
  freeMinutes: number,
  bufferMinutes: number = BOOKING_BUFFER_MINUTES,
): boolean {
  if (serviceDurationMin <= 0) return false;
  return newBookingBlockMinutes(serviceDurationMin, bufferMinutes) <= freeMinutes;
}
