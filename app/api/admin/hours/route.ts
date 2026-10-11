import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import { revalidateBookingPaths } from "@/lib/revalidate-booking";
import { rescheduleAppointmentsOutsideHours } from "@/lib/reschedule-out-of-hours";
import {
  formatDisplayHours,
  loadShopHours,
  saveShopHours,
  weekdayLabel,
  type WeekdayHours,
} from "@/lib/runtime-shop-hours";
import { flattenZodError } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const daySchema = z.object({
  weekday: z.number().int().min(0).max(6),
  isClosed: z.boolean(),
  open: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  close: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  lunchEnabled: z.boolean(),
  lunchStart: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  lunchEnd: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
});

const putSchema = z.object({
  days: z.array(daySchema).length(7),
  rescheduleOutside: z.boolean().optional().default(true),
});

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }
  const state = await loadShopHours();
  return NextResponse.json({
    days: state.days.map((d) => ({ ...d, label: weekdayLabel(d.weekday) })),
    display: formatDisplayHours(state),
    source: state.source,
  });
}

export async function PUT(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }
  const parsed = putSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
  }

  const days = [...parsed.data.days].sort((a, b) => a.weekday - b.weekday) as WeekdayHours[];
  const saved = await saveShopHours(days);
  if (!saved.ok) {
    return NextResponse.json({ error: saved.error }, { status: 400 });
  }

  let rescheduled: Awaited<ReturnType<typeof rescheduleAppointmentsOutsideHours>> = [];
  if (parsed.data.rescheduleOutside) {
    rescheduled = await rescheduleAppointmentsOutsideHours(saved.state.days);
  }

  revalidateBookingPaths();
  return NextResponse.json({
    ok: true,
    days: saved.state.days.map((d) => ({ ...d, label: weekdayLabel(d.weekday) })),
    display: formatDisplayHours(saved.state),
    source: saved.state.source,
    rescheduled,
    rescheduledCount: rescheduled.filter((r) => r.ok).length,
    unmetCount: rescheduled.filter((r) => !r.ok).length,
  });
}
