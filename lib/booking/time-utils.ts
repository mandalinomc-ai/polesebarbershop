import { TIMEZONE } from "@/lib/site-config";

export { TIMEZONE };

export function timeToMinutes(time: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) throw new Error(`Invalid time: ${time}`);
  return Number(match[1]) * 60 + Number(match[2]);
}

export function minutesToTime(total: number): string {
  const h = Math.floor(total / 60);
  const min = total % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function addMinutes(instant: Date, minutes: number): Date {
  return new Date(instant.getTime() + minutes * 60_000);
}

function parseDateParts(date: string): { y: number; m: number; d: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error(`Invalid date: ${date}`);
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

function parseTimeParts(time: string): { h: number; min: number } {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) throw new Error(`Invalid time: ${time}`);
  return { h: Number(match[1]), min: Number(match[2]) };
}

/**
 * Convert a civil wall clock in `timeZone` (default Europe/Rome) to a UTC Date.
 * Handles DST by measuring the zone offset twice.
 */
export function wallTimeToUtc(
  date: string,
  time: string,
  timeZone: string = TIMEZONE,
): Date {
  const { y, m, d } = parseDateParts(date);
  const { h, min } = parseTimeParts(time);
  const utcGuess = Date.UTC(y, m - 1, d, h, min, 0);

  const asWallUtc = (ms: number): number => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(ms));
    const get = (type: string) =>
      Number(parts.find((p) => p.type === type)?.value);
    return Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
      get("second"),
    );
  };

  const offset = asWallUtc(utcGuess) - utcGuess;
  let adjusted = utcGuess - offset;
  const offset2 = asWallUtc(adjusted) - adjusted;
  if (offset2 !== offset) {
    adjusted = utcGuess - offset2;
  }
  return new Date(adjusted);
}

export function formatWallTime(
  instant: Date,
  timeZone: string = TIMEZONE,
): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

export function formatWallDate(
  instant: Date,
  timeZone: string = TIMEZONE,
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
