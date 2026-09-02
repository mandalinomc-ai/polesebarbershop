import {
  ANYONE_BARBER_ID,
  BARBERS,
  type Barber,
  getRealBarbers,
  SHOP_HOURS,
  type DayHours,
} from "./catalog";
import {
  BOOKING_HORIZON_DAYS,
  MIN_NOTICE_MINUTES,
  SLOT_STEP_MINUTES,
  SITE,
  TIMEZONE,
} from "./site-config";

export { TIMEZONE };

export type ExistingAppointment = {
  barberId: string;
  startsAt: Date | string;
  endsAt: Date | string;
};

export type Slot = {
  start: Date;
  end: Date;
  startIso: string;
  endIso: string;
  label: string;
  barberId: string;
};

/** Full hour grid: free slots stay bookable; taken ones stay visible. */
export type ScheduleSlot = Slot & {
  available: boolean;
  booked: boolean;
};

export type DayOccupancy = {
  date: string;
  availableCount: number;
  bookedCount: number;
  full: boolean;
};

/** Salon agenda rows (day × hours). Finer 5-min wizard steps stay on the public grid. */
export const OCCUPANCY_STEP_MINUTES = 30;

export type OccupancyAppointment = ExistingAppointment & {
  id?: string;
  label?: string;
};

export type OccupancyCell = {
  time: string;
  barberId: string;
  occupied: boolean;
  label: string;
};

export type OccupancyRow = {
  time: string;
  cells: OccupancyCell[];
};

export type GetAvailableSlotsInput = {
  date: string;
  barberId: string;
  durationMinutes: number;
  appointments?: ExistingAppointment[];
  barbers?: Barber[];
  now?: Date;
  minNoticeMinutes?: number;
  slotStepMinutes?: number;
  timeZone?: string;
};

function parseDateParts(date: string): { y: number; m: number; d: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    throw new Error(`Invalid date: ${date}`);
  }
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

function parseTimeParts(time: string): { h: number; min: number } {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) {
    throw new Error(`Invalid time: ${time}`);
  }
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

export function formatItalianDate(date: string): string {
  const { y, m, d } = parseDateParts(date);
  const utcNoon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(utcNoon);
}

export function weekdayOfDate(date: string): number {
  const { y, m, d } = parseDateParts(date);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
}

export function toMinutes(time: string): number {
  const { h, min } = parseTimeParts(time);
  return h * 60 + min;
}

export function minutesToTime(total: number): string {
  const h = Math.floor(total / 60);
  const min = total % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function addMinutes(instant: Date, minutes: number): Date {
  return new Date(instant.getTime() + minutes * 60_000);
}

export function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function getHoursForDate(barber: Barber, date: string): DayHours {
  return (
    barber.hours[weekdayOfDate(date)] ?? SHOP_HOURS[weekdayOfDate(date)] ?? null
  );
}

export function isClosedDay(date: string, barber?: Barber): boolean {
  if (barber) return getHoursForDate(barber, date) === null;
  return SHOP_HOURS[weekdayOfDate(date)] === null;
}

export function getFirstBookableDate(now: Date = new Date()): string {
  const today = formatWallDate(now);
  return today > SITE.openingDate ? today : SITE.openingDate;
}

export function addDays(date: string, days: number): string {
  const { y, m, d } = parseDateParts(date);
  const next = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  return next.toISOString().slice(0, 10);
}

/** Monday (ISO week) of the civil date YYYY-MM-DD. */
export function mondayOfWeek(date: string): string {
  const dow = weekdayOfDate(date);
  return addDays(date, dow === 0 ? -6 : 1 - dow);
}

export function listBookableDates(
  count: number,
  now: Date = new Date(),
): string[] {
  const capped = Math.min(Math.max(count, 1), BOOKING_HORIZON_DAYS);
  const dates: string[] = [];
  let cursor = getFirstBookableDate(now);
  const guardMax = Math.max(capped * 3 + 14, 60);
  let guard = 0;
  while (dates.length < capped && guard < guardMax) {
    if (!isClosedDay(cursor)) dates.push(cursor);
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return dates;
}

export type DayChip = { date: string; dow: string; day: string };

export function listOpenDayChips(count: number, now: Date = new Date()): DayChip[] {
  const dowFmt = new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    timeZone: "UTC",
  });
  const dayFmt = new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    timeZone: "UTC",
  });
  return listBookableDates(count, now).map((iso) => {
    const { y, m, d } = parseDateParts(iso);
    const cursor = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    return {
      date: iso,
      dow: dowFmt.format(cursor).replace(".", ""),
      day: dayFmt.format(cursor),
    };
  });
}

function appointmentsForBarber(
  appointments: ExistingAppointment[],
  barberId: string,
): { start: Date; end: Date }[] {
  return appointments
    .filter((a) => a.barberId === barberId)
    .map((a) => ({ start: asDate(a.startsAt), end: asDate(a.endsAt) }));
}

export function loadMinutesForDay(
  appointments: ExistingAppointment[],
  barberId: string,
  date: string,
  timeZone: string = TIMEZONE,
): number {
  return appointments.reduce((sum, a) => {
    if (a.barberId !== barberId) return sum;
    const start = asDate(a.startsAt);
    if (formatWallDate(start, timeZone) !== date) return sum;
    return sum + (asDate(a.endsAt).getTime() - start.getTime()) / 60_000;
  }, 0);
}

export function pickLeastLoadedBarber(
  candidates: Barber[],
  appointments: ExistingAppointment[],
  date: string,
  timeZone: string = TIMEZONE,
): Barber | undefined {
  if (!candidates.length) return undefined;
  return [...candidates].sort((a, b) => {
    const loadA = loadMinutesForDay(appointments, a.id, date, timeZone);
    const loadB = loadMinutesForDay(appointments, b.id, date, timeZone);
    if (loadA !== loadB) return loadA - loadB;
    return a.id.localeCompare(b.id);
  })[0];
}

function slotStartsForHours(
  hours: DayHours,
  durationMinutes: number,
  slotStepMinutes: number,
): string[] {
  if (!hours || durationMinutes <= 0) return [];
  const open = toMinutes(hours.open);
  const close = toMinutes(hours.close);
  const labels: string[] = [];
  for (let t = open; t + durationMinutes <= close; t += slotStepMinutes) {
    labels.push(minutesToTime(t));
  }
  return labels;
}

function isSlotFree(
  start: Date,
  end: Date,
  busy: { start: Date; end: Date }[],
): boolean {
  return !busy.some((b) => rangesOverlap(start, end, b.start, b.end));
}

function evaluateBarberSlot(opts: {
  date: string;
  barber: Barber;
  label: string;
  durationMinutes: number;
  busy: { start: Date; end: Date }[];
  earliest: Date;
  timeZone: string;
}): ScheduleSlot | null {
  const start = wallTimeToUtc(opts.date, opts.label, opts.timeZone);
  const end = addMinutes(start, opts.durationMinutes);
  if (start < opts.earliest) return null;
  const booked = !isSlotFree(start, end, opts.busy);
  return {
    start,
    end,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    label: opts.label,
    barberId: opts.barber.id,
    available: !booked,
    booked,
  };
}

function scheduleForBarber(opts: {
  date: string;
  barber: Barber;
  durationMinutes: number;
  appointments: ExistingAppointment[];
  now: Date;
  minNoticeMinutes: number;
  slotStepMinutes: number;
  timeZone: string;
}): ScheduleSlot[] {
  const hours = getHoursForDate(opts.barber, opts.date);
  const labels = slotStartsForHours(
    hours,
    opts.durationMinutes,
    opts.slotStepMinutes,
  );
  const busy = appointmentsForBarber(opts.appointments, opts.barber.id);
  const earliest = addMinutes(opts.now, opts.minNoticeMinutes);
  const slots: ScheduleSlot[] = [];

  for (const label of labels) {
    const slot = evaluateBarberSlot({
      date: opts.date,
      barber: opts.barber,
      label,
      durationMinutes: opts.durationMinutes,
      busy,
      earliest,
      timeZone: opts.timeZone,
    });
    if (slot) slots.push(slot);
  }
  return slots;
}

function sortSlots<T extends { start: Date }>(slots: T[]): T[] {
  return [...slots].sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * Full slot grid for a civil date in Europe/Rome, including taken hours.
 * `anyone` stays bookable while at least one chair is free; both busy → booked.
 */
export function getScheduleSlots(input: GetAvailableSlotsInput): ScheduleSlot[] {
  const {
    date,
    barberId,
    durationMinutes,
    appointments = [],
    barbers = BARBERS,
    now = new Date(),
    minNoticeMinutes = MIN_NOTICE_MINUTES,
    slotStepMinutes = SLOT_STEP_MINUTES,
    timeZone = TIMEZONE,
  } = input;

  if (!date || durationMinutes <= 0) return [];
  if (date < getFirstBookableDate(now)) return [];
  if (isClosedDay(date)) return [];

  const real = getRealBarbers(barbers);
  const shared = {
    date,
    durationMinutes,
    appointments,
    now,
    minNoticeMinutes,
    slotStepMinutes,
    timeZone,
  };

  if (barberId === ANYONE_BARBER_ID) {
    const freeByLabel = new Map<string, ScheduleSlot>();
    const bookedByLabel = new Map<string, ScheduleSlot>();
    for (const barber of real) {
      const barberSlots = scheduleForBarber({ ...shared, barber });
      for (const slot of barberSlots) {
        if (slot.available) {
          bookedByLabel.delete(slot.label);
          const existing = freeByLabel.get(slot.label);
          if (!existing) {
            freeByLabel.set(slot.label, slot);
            continue;
          }
          const current = barbers.find((b) => b.id === existing.barberId);
          if (!current) {
            freeByLabel.set(slot.label, slot);
            continue;
          }
          const picked = pickLeastLoadedBarber(
            [current, barber],
            appointments,
            date,
            timeZone,
          );
          if (picked?.id === barber.id) {
            freeByLabel.set(slot.label, slot);
          }
          continue;
        }
        if (!freeByLabel.has(slot.label) && !bookedByLabel.has(slot.label)) {
          bookedByLabel.set(slot.label, {
            ...slot,
            barberId: ANYONE_BARBER_ID,
          });
        }
      }
    }
    return sortSlots([...freeByLabel.values(), ...bookedByLabel.values()]);
  }

  const barber = barbers.find((b) => b.id === barberId && !b.virtual);
  if (!barber) return [];

  return scheduleForBarber({ ...shared, barber });
}

export function summarizeSchedule(date: string, slots: ScheduleSlot[]): DayOccupancy {
  const availableCount = slots.filter((s) => s.available).length;
  const bookedCount = slots.filter((s) => s.booked).length;
  return {
    date,
    availableCount,
    bookedCount,
    full: slots.length > 0 && availableCount === 0,
  };
}

/**
 * Return free slots for a civil date in Europe/Rome.
 * `anyone` merges real barbers and assigns the least-loaded free barber.
 */
export function getAvailableSlots(input: GetAvailableSlotsInput): Slot[] {
  return getScheduleSlots(input).filter((s) => s.available);
}

export function listDayHourStarts(
  date: string,
  stepMinutes: number = OCCUPANCY_STEP_MINUTES,
  barber?: Barber,
): string[] {
  const hours = barber
    ? getHoursForDate(barber, date)
    : (SHOP_HOURS[weekdayOfDate(date)] ?? null);
  if (!hours) return [];
  const open = toMinutes(hours.open);
  const close = toMinutes(hours.close);
  const labels: string[] = [];
  for (let t = open; t < close; t += stepMinutes) {
    labels.push(minutesToTime(t));
  }
  return labels;
}

export function getOccupancyGrid(input: {
  date: string;
  appointments?: OccupancyAppointment[];
  barbers?: Barber[];
  stepMinutes?: number;
  timeZone?: string;
}): OccupancyRow[] {
  const {
    date,
    appointments = [],
    barbers = BARBERS,
    stepMinutes = OCCUPANCY_STEP_MINUTES,
    timeZone = TIMEZONE,
  } = input;
  if (isClosedDay(date)) return [];
  const real = getRealBarbers(barbers);
  return listDayHourStarts(date, stepMinutes).map((time) => {
    const start = wallTimeToUtc(date, time, timeZone);
    const end = addMinutes(start, stepMinutes);
    return {
      time,
      cells: real.map((barber) => {
        const hit = appointments.find(
          (a) =>
            a.barberId === barber.id &&
            rangesOverlap(start, end, asDate(a.startsAt), asDate(a.endsAt)),
        );
        return {
          time,
          barberId: barber.id,
          occupied: Boolean(hit),
          label: hit?.label || "",
        };
      }),
    };
  });
}

export function findSlot(slots: Slot[], startsAt: Date): Slot | undefined {
  const ms = startsAt.getTime();
  return slots.find((s) => s.start.getTime() === ms);
}
