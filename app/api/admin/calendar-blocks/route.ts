import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import {
  deleteCalendarBlock,
  insertCalendarBlock,
  listDbCalendarBlocks,
} from "@/lib/calendar-blocks-db";
import { flattenZodError } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start: z.string().regex(/^\d{2}:\d{2}/),
  end: z.string().regex(/^\d{2}:\d{2}/),
  barberId: z.string().optional().nullable(),
  label: z.string().trim().max(120).optional(),
});

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }
  const blocks = await listDbCalendarBlocks();
  return NextResponse.json({ blocks });
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
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
  }
  const result = await insertCalendarBlock({
    date: parsed.data.date,
    start: parsed.data.start.slice(0, 5),
    end: parsed.data.end.slice(0, 5),
    barberId: parsed.data.barberId || null,
    label: parsed.data.label || "Blocco orario",
    kind: "custom",
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }
  return NextResponse.json({ ok: true, block: result.block });
}

export async function DELETE(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") || "";
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "ID non valido." }, { status: 400 });
  }
  const result = await deleteCalendarBlock(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
