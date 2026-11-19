import { NextResponse } from "next/server";
import { formatDisplayHours, loadShopHours, weekdayLabel } from "@/lib/runtime-shop-hours";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Public shop hours for site contact block + booking notes. */
export async function GET() {
  const state = await loadShopHours();
  return NextResponse.json({
    days: state.days.map((d) => ({
      weekday: d.weekday,
      label: weekdayLabel(d.weekday),
      isClosed: d.isClosed,
      open: d.open,
      close: d.close,
      lunchEnabled: d.lunchEnabled,
      lunchStart: d.lunchStart,
      lunchEnd: d.lunchEnd,
    })),
    display: formatDisplayHours(state),
    source: state.source,
  });
}
