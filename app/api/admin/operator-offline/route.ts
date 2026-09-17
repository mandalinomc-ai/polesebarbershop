import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import {
  listDbCalendarBlocks,
  setOperatorOfflineDay,
} from "@/lib/calendar-blocks-db";
import {
  offlineOperatorsForDate,
  isRealOperatorId,
} from "@/lib/operator-offline";
import { revalidateBookingPaths } from "@/lib/revalidate-booking";
import { flattenZodError } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  barberId: z.string().min(1),
  offline: z.boolean(),
});

export async function GET(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }
  const date = new URL(request.url).searchParams.get("date") || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Data non valida." }, { status: 400 });
  }
  const blocks = await listDbCalendarBlocks();
  const offline = offlineOperatorsForDate(blocks, date);
  return NextResponse.json({
    date,
    offline,
    offlineBarberIds: offline.map((o) => o.barberId),
  });
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
  }
  if (!isRealOperatorId(parsed.data.barberId)) {
    return NextResponse.json({ error: "Seleziona Felice." }, { status: 400 });
  }

  const result = await setOperatorOfflineDay(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }
  revalidateBookingPaths();
  return NextResponse.json({
    ok: true,
    date: parsed.data.date,
    barberId: parsed.data.barberId,
    offline: result.offline,
    block: result.block ?? null,
  });
}
