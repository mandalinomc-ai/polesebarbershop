import { SHOP_HOURS, getBarber, getRealBarbers } from "@/lib/catalog";
import type { CalendarBlock } from "@/lib/booking/calendar-blocks";

/** Stable label stored on calendar_blocks for full-day operator offline. */
export const OPERATOR_OFFLINE_LABEL = "Operatore offline";

export function isRealOperatorId(barberId: string): boolean {
  const b = getBarber(barberId);
  return Boolean(b && !b.virtual);
}

export function shopHoursForDate(date: string): { open: string; close: string } | null {
  const wd = new Date(`${date}T12:00:00`).getDay();
  return SHOP_HOURS[wd] ?? null;
}

/**
 * Full-day offline marker only («Operatore offline» / closed barber day).
 * Half-hour «Non disponibile» blocks are separate and never count as day offline.
 */
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

/** True only when an Operatore offline day block exists — not for Non disponibile slots. */
export function isBarberOfflineOnDate(
  blocks: CalendarBlock[],
  date: string,
  barberId: string,
): boolean {
  return blocks.some((b) => isOperatorOfflineBlock(b, date, barberId));
}

export function offlineOperatorsForDate(
  blocks: CalendarBlock[],
  date: string,
): { barberId: string; blockId: string }[] {
  const out: { barberId: string; blockId: string }[] = [];
  for (const b of getRealBarbers()) {
    const hit = blocks.find((block) => isOperatorOfflineBlock(block, date, b.id));
    if (!hit) continue;
    out.push({ barberId: hit.barberId || b.id, blockId: hit.id });
  }
  return out;
}
