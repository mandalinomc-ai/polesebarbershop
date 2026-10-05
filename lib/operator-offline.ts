import { SHOP_HOURS, getBarber, getRealBarbers } from "@/lib/catalog";
import {
  CONFIG_CALENDAR_BLOCKS,
  blocksForDate,
  type CalendarBlock,
} from "@/lib/booking/calendar-blocks";
import { minutesToTime, timeToMinutes } from "@/lib/booking/time-utils";

/** Stable label stored on calendar_blocks for full-day operator offline. */
export const OPERATOR_OFFLINE_LABEL = "Operatore offline";

const SLOT_STEP_MIN = 30;

export function isRealOperatorId(barberId: string): boolean {
  const b = getBarber(barberId);
  return Boolean(b && !b.virtual);
}

export function shopHoursForDate(date: string): { open: string; close: string } | null {
  const wd = new Date(`${date}T12:00:00`).getDay();
  return SHOP_HOURS[wd] ?? null;
}

export function isOperatorOfflineBlock(
  block: Pick<CalendarBlock, "label" | "kind" | "barberId" | "date">,
  date: string,
  barberId?: string,
): boolean {
  if (block.date !== date) return false;
  if (barberId && block.barberId && block.barberId !== barberId) return false;
  if (barberId && !block.barberId) return false;
  return (
    block.label === OPERATOR_OFFLINE_LABEL ||
    (block.kind === "closed" && Boolean(block.barberId))
  );
}

/** True if [slotStart, slotEnd) is covered by any block interval. */
function slotCoveredByBlocks(
  slotStart: number,
  slotEnd: number,
  blocks: Pick<CalendarBlock, "start" | "end">[],
): boolean {
  return blocks.some((b) => {
    const start = timeToMinutes(b.start);
    const end = timeToMinutes(b.end);
    return start <= slotStart && end >= slotEnd;
  });
}

/**
 * Bookable half-hour starts for a civil date (shop hours minus configured lunch).
 */
export function bookableSlotStarts(date: string): string[] {
  const hours = shopHoursForDate(date);
  if (!hours) return [];
  const open = timeToMinutes(hours.open);
  const close = timeToMinutes(hours.close);
  const lunch = blocksForDate(date, CONFIG_CALENDAR_BLOCKS).find((b) => b.kind === "lunch");
  const lunchStart = lunch ? timeToMinutes(lunch.start) : -1;
  const lunchEnd = lunch ? timeToMinutes(lunch.end) : -1;
  const out: string[] = [];
  for (let t = open; t + SLOT_STEP_MIN <= close; t += SLOT_STEP_MIN) {
    if (lunchStart >= 0 && t >= lunchStart && t < lunchEnd) continue;
    out.push(minutesToTime(t));
  }
  return out;
}

/** DB blocks that belong to this barber on this civil date. */
export function barberDayBlocks(
  blocks: CalendarBlock[],
  date: string,
  barberId: string,
): CalendarBlock[] {
  return blocks.filter(
    (b) => b.date === date && (b.barberId === barberId || isOperatorOfflineBlock(b, date, barberId)),
  );
}

/**
 * Barber is offline for the day if:
 * - classic «Operatore offline» / closed full-day block, OR
 * - every bookable half-hour is covered by their calendar blocks
 *   (e.g. many «Non disponibile» slots clicked in agenda).
 */
export function isBarberOfflineOnDate(
  blocks: CalendarBlock[],
  date: string,
  barberId: string,
): boolean {
  if (blocks.some((b) => isOperatorOfflineBlock(b, date, barberId))) return true;
  const slots = bookableSlotStarts(date);
  if (!slots.length) return false;
  const mine = barberDayBlocks(blocks, date, barberId);
  if (!mine.length) return false;
  return slots.every((start) => {
    const startMin = timeToMinutes(start);
    return slotCoveredByBlocks(startMin, startMin + SLOT_STEP_MIN, mine);
  });
}

export function offlineOperatorsForDate(
  blocks: CalendarBlock[],
  date: string,
): { barberId: string; blockId: string }[] {
  const out: { barberId: string; blockId: string }[] = [];
  for (const b of getRealBarbers()) {
    if (!isBarberOfflineOnDate(blocks, date, b.id)) continue;
    const hit =
      blocks.find((block) => isOperatorOfflineBlock(block, date, b.id)) ||
      barberDayBlocks(blocks, date, b.id)[0];
    if (hit?.barberId) out.push({ barberId: hit.barberId, blockId: hit.id });
    else out.push({ barberId: b.id, blockId: hit?.id || `${b.id}-${date}` });
  }
  return out;
}
