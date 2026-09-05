import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import {
  isSalonClosedDate,
  loadClosedDates,
  setSalonClosedDate,
} from "@/lib/closed-days";
import { flattenZodError } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  closed: z.boolean(),
});

export async function GET(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    date: searchParams.get("date") || undefined,
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
  }

  if (parsed.data.date) {
    const closed = await isSalonClosedDate(parsed.data.date);
    return NextResponse.json({ date: parsed.data.date, closed });
  }

  const closedDates = [...(await loadClosedDates({ from: parsed.data.from, to: parsed.data.to }))].sort();
  return NextResponse.json({ closedDates });
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
  const result = await setSalonClosedDate(parsed.data.date, parsed.data.closed);
  if (!result.ok) {
    return NextResponse.json({ error: result.error || "Operazione non riuscita." }, { status: 503 });
  }
  return NextResponse.json({ ok: true, date: parsed.data.date, closed: result.closed });
}
