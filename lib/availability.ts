import {
  ANYONE_BARBER_ID,
  BARBERS,
  type Barber,
  getRealBarbers,
  SHOP_HOURS,
  type DayHours,
} from "./catalog";
import {
  BOOKING_BUFFER_MINUTES,
  DEFAULT_OPTIMIZATION_MODE,
  ONLINE_DISPLAY_INTERVAL_MINUTES,
  SLOT_INTERVAL_MINUTES,
  TIME_SLOT_INTERVAL_MINUTES,
  blockEndFromStart,
  candidateStartsInWindows,
  clientEndFromStart,
  isIntervalFree,
  overlaps,
  subtractBusyFromWindows,
  workingWindowsFromHours,
  TIMEZONE,
  addMinutes as bookingAddMinutes,
  formatWallDate as bookingFormatWallDate,
  formatWallTime as bookingFormatWallTime,
  minutesToTime as bookingMinutesToTime,
  timeToMinutes,
  wallTimeToUtc as bookingWallTimeToUtc,
  type OptimizationMode,
  type SlotRank,
} from "./booking";
import {
  BOOKING_HORIZON_DAYS,
  MIN_NOTICE_MINUTES,
  SITE,
} from "./site-config";

export {
  TIMEZONE,
  BOOKING_BUFFER_MINUTES,
  SLOT_INTERVAL_MINUTES,
  TIME_SLOT_INTERVAL_MINUTES,
  ONLINE_DISPLAY_INTERVAL_MINUTES,
  DEFAULT_OPTIMIZATION_MODE,
};
/** @deprecated Prefer SLOT_INTERVAL_MINUTES — kept for existing imports. */
export const SLOT_STEP_MINUTES = SLOT_INTERVAL_MINUTES;
export type { OptimizationMode, SlotRank };

export type ExistingAppointment = {
  barberId: string;
  startsAt: Date | string;
  endsAt: Date | string;
};

export type Slot = {
  start: Date;
  /** Client-facing service end (no operational buffer). */
  end: Date;
  startIso: string;
  endIso: string;
  /** Chair occupation end = service + BOOKING_BUFFER_MINUTES. */
  blockEnd: Date;
  blockEndIso: string;
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
  /** Internal chair buffer; default BOOKING_BUFFER_MINUTES. */
  bufferMinutes?: number;
  timeZone?: string;
  /** Gap optimization mode; default REDUCE_GAPS. */
  optimizationMode?: OptimizationMode;
  /**
   * Online thinning cadence. `null` = every search step (gestionale / tests / revalidation).
   * Omit for online default (ONLINE_DISPLAY_INTERVAL_MINUTES).
   */
  displayIntervalMinutes?: number | null;
  /** When true, omit display thinning (full search grid inside free windows). */
  fullSearch?: boolean;
};

function parseDateParts(date: string): { y: number; m: number; d: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    throw new Error(`Invalid date: ${date}`);
  }
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

export function wallTimeToUtc(
  date: string,
  time: string,
  timeZone: string = TIMEZONE,
): Date {
  return bookingWallTimeToUtc(date, time, timeZone);
}

export function formatWallTime(
  instant: Date,
  timeZone: string = TIMEZONE,
): string {
  return bookingFormatWallTime(instant, timeZone);
}

export function formatWallDate(
  instant: Date,
  timeZone: string = TIMEZONE,
): string {
  return bookingFormatWallDate(instant, timeZone);
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
  return timeToMinutes(time);
}

export function minutesToTime(total: number): string {
  return bookingMinutesToTime(total);
}

export function addMinutes(instant: Date, minutes: number): Date {
  return bookingAddMinutes(instant, minutes);
}

/** Semi-open [start, end) overlap — delegated to lib/booking. */
export function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return overlaps(aStart, aEnd, bStart, bEnd);
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

function busyWallMinutesForBarber(
  appointments: ExistingAppointment[],
  barberId: string,
  date: string,
  timeZone: string,
): { startMin: number; endMin: number }[] {
  return appointments
    .filter((a) => a.barberId === barberId)
    .map((a) => {
      const start = asDate(a.startsAt);
      const end = asDate(a.endsAt);
      // Only intervals that touch this civil date (wall clock).
      if (formatWallDate(start, timeZone) !== date && formatWallDate(end, timeZone) !== date) {
        return null;
      }
      return {
        startMin: timeToMinutes(formatWallTime(start, timeZone)),
        endMin: timeToMinutes(formatWallTime(end, timeZone)),
      };
    })
    .filter((x): x is { startMin: number; endMin: number } => x != null && x.endMin > x.startMin);
}

function slotStartsForHours(
  hours: DayHours,
  durationMinutes: number,
  slotStepMinutes: number,
  bufferMinutes: number,
  busyMinutes: { startMin: number; endMin: number }[],
  optimizationMode: OptimizationMode,
  displayIntervalMinutes: number | null,
): string[] {
  if (!hours || durationMinutes <= 0) return [];
  const working = workingWindowsFromHours(hours.open, hours.close);
  const free = subtractBusyFromWindows(working, busyMinutes);
  return candidateStartsInWindows(free, durationMinutes, {
    bufferMinutes,
    searchIntervalMinutes: slotStepMinutes,
    mode: optimizationMode,
    displayIntervalMinutes,
  }).map((s) => s.label);
}

function evaluateBarberSlot(opts: {
  date: string;
  barber: Barber;
  label: string;
  durationMinutes: number;
  busy: { start: Date; end: Date }[];
  earliest: Date;
  timeZone: string;
  bufferMinutes: number;
}): ScheduleSlot | null {
  const start = wallTimeToUtc(opts.date, opts.label, opts.timeZone);
  const end = clientEndFromStart(start, opts.durationMinutes);
  const blockEnd = blockEndFromStart(
    start,
    opts.durationMinutes,
    opts.bufferMinutes,
  );
  if (start < opts.earliest) return null;
  const booked = !isIntervalFree(start, blockEnd, opts.busy);
  return {
    start,
    end,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    blockEnd,
    blockEndIso: blockEnd.toISOString(),
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
  bufferMinutes: number;
  optimizationMode: OptimizationMode;
  displayIntervalMinutes: number | null;
}): ScheduleSlot[] {
  const hours = getHoursForDate(opts.barber, opts.date);
  const busyMinutes = busyWallMinutesForBarber(
    opts.appointments,
    opts.barber.id,
    opts.date,
    opts.timeZone,
  );
  const labels = slotStartsForHours(
    hours,
    opts.durationMinutes,
    opts.slotStepMinutes,
    opts.bufferMinutes,
    busyMinutes,
    opts.optimizationMode,
    opts.displayIntervalMinutes,
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
      bufferMinutes: opts.bufferMinutes,
    });
    if (slot) slots.push(slot);
  }
  return slots;
}

function sortSlots<T extends { start: Date }>(slots: T[]): T[] {
  return [...slots].sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * Free-window schedule for a civil date in Europe/Rome.
 * Available starts come from free windows (continuous); optional display thinning for online.
 * `anyone` stays bookable while at least one chair is free.
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
    slotStepMinutes = SLOT_INTERVAL_MINUTES,
    bufferMinutes = BOOKING_BUFFER_MINUTES,
    timeZone = TIMEZONE,
    optimizationMode = DEFAULT_OPTIMIZATION_MODE,
    fullSearch = false,
  } = input;

  const displayIntervalMinutes =
    input.displayIntervalMinutes !== undefined
      ? input.displayIntervalMinutes
      : fullSearch
        ? null
        : ONLINE_DISPLAY_INTERVAL_MINUTES;

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
    bufferMinutes,
    timeZone,
    optimizationMode,
    displayIntervalMinutes,
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

export function summarizeSchedule(
  date: string,
  slots: ScheduleSlot[],
  opts?: { openDay?: boolean },
): DayOccupancy {
  const availableCount = slots.filter((s) => s.available).length;
  const bookedCount = slots.filter((s) => s.booked).length;
  const openDay = opts?.openDay ?? false;
  return {
    date,
    availableCount,
    bookedCount,
    // Free-windows lists may be empty when the day is fully booked.
    full: openDay ? availableCount === 0 : slots.length > 0 && availableCount === 0,
  };
}

/**
 * Return free slots for a civil date in Europe/Rome.
 * `anyone` merges real barbers and assigns the least-loaded free barber.
 * Defaults to full search (no online thinning) so revalidation / gestionale
 * can hit continuous free-window starts; pass displayInterval for online UI.
 */
export function getAvailableSlots(input: GetAvailableSlotsInput): Slot[] {
  const fullSearch = input.fullSearch ?? input.displayIntervalMinutes === undefined;
  return getScheduleSlots({
    ...input,
    fullSearch,
    displayIntervalMinutes:
      input.displayIntervalMinutes !== undefined
        ? input.displayIntervalMinutes
        : fullSearch
          ? null
          : ONLINE_DISPLAY_INTERVAL_MINUTES,
  }).filter((s) => s.available);
}

/** Online-facing smart starts (thinned). */
export function getSmartAvailableSlots(input: GetAvailableSlotsInput): Slot[] {
  return getAvailableSlots({
    ...input,
    fullSearch: false,
    displayIntervalMinutes:
      input.displayIntervalMinutes === undefined
        ? ONLINE_DISPLAY_INTERVAL_MINUTES
        : input.displayIntervalMinutes,
  });
}

/**
 * First availability across upcoming open days (gestionale PRIMA DISPONIBILITÀ).
 */
export function findFirstAvailability(input: {
  barberId: string;
  durationMinutes: number;
  appointments?: ExistingAppointment[];
  barbers?: Barber[];
  now?: Date;
  fromDate?: string;
  maxDays?: number;
  minNoticeMinutes?: number;
  bufferMinutes?: number;
  optimizationMode?: OptimizationMode;
}): Slot | null {
  const now = input.now ?? new Date();
  const startDate = input.fromDate ?? getFirstBookableDate(now);
  const maxDays = Math.min(Math.max(input.maxDays ?? 21, 1), BOOKING_HORIZON_DAYS);
  let cursor = startDate;
  for (let i = 0; i < maxDays * 2; i += 1) {
    if (!isClosedDay(cursor)) {
      const slots = getAvailableSlots({
        date: cursor,
        barberId: input.barberId,
        durationMinutes: input.durationMinutes,
        appointments: input.appointments,
        barbers: input.barbers,
        now,
        minNoticeMinutes: input.minNoticeMinutes ?? 0,
        bufferMinutes: input.bufferMinutes,
        optimizationMode: input.optimizationMode,
        fullSearch: true,
      });
      if (slots[0]) return slots[0];
    }
    cursor = addDays(cursor, 1);
    if (cursor > addDays(startDate, maxDays)) break;
  }
  return null;
}

/**
 * Build a concrete Slot if start fits a free window (continuous), else undefined.
 * Used for booking revalidation / gestionale move when the start may be off display grid.
 */
export function resolveBookableSlot(input: GetAvailableSlotsInput & { start: Date }): Slot | undefined {
  const slots = getAvailableSlots({ ...input, fullSearch: true });
  const hit = findSlot(slots, input.start);
  if (hit) return hit;
  // Exact label match via wall time (continuous free start may be 1-min precision)
  const label = formatWallTime(input.start, input.timeZone ?? TIMEZONE);
  return slots.find((s) => s.label === label && s.start.getTime() === input.start.getTime());
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

export const WEEKDAY_LABELS_IT = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"] as const;

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function startOfMonth(date: string): string {
  const { y, m } = parseDateParts(date);
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-01`;
}

export function addMonths(date: string, months: number): string {
  const { y, m } = parseDateParts(date);
  const next = new Date(Date.UTC(y, m - 1 + months, 1, 12, 0, 0));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export function formatItalianMonth(date: string): string {
  const { y, m } = parseDateParts(date);
  const utcNoon = new Date(Date.UTC(y, m - 1, 1, 12, 0, 0));
  return new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(utcNoon);
}

export type CalendarDay = {
  date: string;
  inMonth: boolean;
  closed: boolean;
};

/** Monday-first month grid for the mobile booking calendar. */
export function monthCalendarWeeks(monthDate: string): (CalendarDay | null)[][] {
  const { y, m } = parseDateParts(monthDate);
  const first = startOfMonth(monthDate);
  const firstDow = weekdayOfDate(first);
  const mondayPad = firstDow === 0 ? 6 : firstDow - 1;
  const daysInMonth = new Date(Date.UTC(y, m, 0, 12, 0, 0)).getUTCDate();
  const cells: (CalendarDay | null)[] = [];
  for (let i = 0; i < mondayPad; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({
      date,
      inMonth: true,
      closed: isClosedDay(date),
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (CalendarDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}
