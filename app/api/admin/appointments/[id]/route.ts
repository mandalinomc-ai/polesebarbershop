import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSupabaseAdmin, isSupabaseConfigured, SUPABASE_MISSING_IT } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const idSchema = z.string().uuid();

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: SUPABASE_MISSING_IT }, { status: 503 });
  }

  const { id } = await context.params;
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) {
    return NextResponse.json({ error: "ID non valido." }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: SUPABASE_MISSING_IT }, { status: 503 });
  }

  const { data: existing, error: loadErr } = await db
    .from("appointments")
    .select("id")
    .eq("id", parsed.data)
    .maybeSingle();
  if (loadErr) {
    return NextResponse.json({ error: "Impossibile verificare l'appuntamento." }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Appuntamento non trovato." }, { status: 404 });
  }

  const { error: delErr } = await db.from("appointments").delete().eq("id", parsed.data);
  if (delErr) {
    return NextResponse.json({ error: "Impossibile eliminare l'appuntamento." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deletedId: parsed.data });
}

/** Soft-exclude from stats (exclude_from_stats = true). Keeps the row. */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: SUPABASE_MISSING_IT }, { status: 503 });
  }
  const { id } = await context.params;
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) {
    return NextResponse.json({ error: "ID non valido." }, { status: 400 });
  }
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }
  const body = z
    .object({
      excludeFromStats: z.boolean(),
    })
    .safeParse(raw);
  if (!body.success) {
    return NextResponse.json({ error: "Parametro excludeFromStats richiesto." }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: SUPABASE_MISSING_IT }, { status: 503 });
  }

  const { data, error } = await db
    .from("appointments")
    .update({ exclude_from_stats: body.data.excludeFromStats })
    .eq("id", parsed.data)
    .select("id, exclude_from_stats")
    .maybeSingle();

  if (error) {
    if (/exclude_from_stats|schema cache|Could not find/i.test(error.message || "")) {
      return NextResponse.json(
        {
          error:
            "Colonna exclude_from_stats assente. Esegui supabase/migrations/013_exclude_from_stats.sql nel SQL Editor.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Aggiornamento non riuscito." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Appuntamento non trovato." }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    id: data.id,
    excludeFromStats: Boolean(data.exclude_from_stats),
  });
}
