import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import {
  createTemporaryBlock,
  deleteTemporaryBlock,
  listTemporaryBlocks,
} from "@/lib/closed-days";
import { flattenZodError } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
  label: z.string().max(80).optional(),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
});

export async function GET(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    date: searchParams.get("date") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
  }
  const blocks = await listTemporaryBlocks(parsed.data.date);
  return NextResponse.json({
    date: parsed.data.date,
    blocks: blocks.map((b) => ({
      id: b.id,
      date: b.date,
      start: b.start,
      end: b.end,
      kind: b.kind,
      label: b.label || "Blocco temporaneo",
    })),
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
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
  }
  const result = await createTemporaryBlock(parsed.data);
  if (!result.ok || !result.block) {
    return NextResponse.json({ error: result.error || "Operazione non riuscita." }, { status: 503 });
  }
  const b = result.block;
  return NextResponse.json({
    ok: true,
    block: {
      id: b.id,
      date: b.date,
      start: b.start,
      end: b.end,
      kind: b.kind,
      label: b.label || "Blocco temporaneo",
    },
  });
}

export async function DELETE(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }
  const parsed = deleteSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
  }
  const result = await deleteTemporaryBlock(parsed.data.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error || "Operazione non riuscita." }, { status: 503 });
  }
  return NextResponse.json({ ok: true, id: parsed.data.id });
}
