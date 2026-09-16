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

export function offlineOperatorsForDate(
  blocks: CalendarBlock[],
  date: string,
): { barberId: string; blockId: string }[] {
  const out: { barberId: string; blockId: string }[] = [];
  for (const b of getRealBarbers()) {
    const hit = blocks.find((block) => isOperatorOfflineBlock(block, date, b.id));
    if (hit?.barberId) out.push({ barberId: hit.barberId, blockId: hit.id });
  }
  return out;
}
