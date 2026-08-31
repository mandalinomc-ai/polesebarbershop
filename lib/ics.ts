import { SITE, TIMEZONE } from "./site-config";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** UTC timestamp YYYYMMDDTHHMMSSZ */
export function formatIcsUtc(instant: Date): string {
  return (
    instant.getUTCFullYear().toString() +
    pad(instant.getUTCMonth() + 1) +
    pad(instant.getUTCDate()) +
    "T" +
    pad(instant.getUTCHours()) +
    pad(instant.getUTCMinutes()) +
    pad(instant.getUTCSeconds()) +
    "Z"
  );
}

/** Fold ICS content lines at 75 octets (RFC 5545). */
export function foldIcsLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const chunks: string[] = [];
  let offset = 0;
  let first = true;
  const decoder = new TextDecoder();
  while (offset < bytes.length) {
    const max = first ? 75 : 74;
    let end = Math.min(offset + max, bytes.length);
    while (end > offset && (bytes[end] & 0b1100_0000) === 0b1000_0000) {
      end -= 1;
    }
    if (end === offset) end = Math.min(offset + max, bytes.length);
    const slice = decoder.decode(bytes.slice(offset, end));
    chunks.push(first ? slice : ` ${slice}`);
    first = false;
    offset = end;
  }
  return chunks.join("\r\n");
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export type IcsInput = {
  uid: string;
  startsAt: Date;
  endsAt: Date;
  summary: string;
  description: string;
  location?: string;
  url?: string;
  stamp?: Date;
};

/**
 * Build a VCALENDAR with a 30-minute VALARM display reminder.
 */
export function buildIcs(input: IcsInput): string {
  const stamp = formatIcsUtc(input.stamp ?? new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Polese Barbershop//Prenotazioni//IT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-TIMEZONE:${TIMEZONE}`,
    "BEGIN:VEVENT",
    `UID:${input.uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${formatIcsUtc(input.startsAt)}`,
    `DTEND:${formatIcsUtc(input.endsAt)}`,
    `SUMMARY:${escapeIcsText(input.summary)}`,
    `DESCRIPTION:${escapeIcsText(input.description)}`,
    `LOCATION:${escapeIcsText(input.location ?? SITE.addressFull)}`,
  ];
  if (input.url) {
    lines.push(`URL:${input.url}`);
  }
  lines.push(
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:-PT30M",
    "DESCRIPTION:Promemoria: appuntamento da Polese Barbershop tra 30 minuti",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  );
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}

export function icsFilename(date: string, time: string): string {
  const safe = `${date}-${time.replace(":", "")}`.replace(/[^\d-]/g, "");
  return `polese-barbershop-${safe}.ics`;
}

export function googleCalendarUrl(input: {
  startsAt: Date;
  endsAt: Date;
  summary: string;
  description: string;
  location?: string;
}): string {
  const dates = `${formatIcsUtc(input.startsAt)}/${formatIcsUtc(input.endsAt)}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.summary,
    dates,
    details: input.description,
    location: input.location ?? SITE.addressFull,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function icsDataUri(ics: string): string {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}
