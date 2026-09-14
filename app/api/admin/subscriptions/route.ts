import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import { servicesSnapshot } from "@/lib/appointments";
import { resolveEffectiveServiceDuration } from "@/lib/booking";
import { getBarber, totalsForServices } from "@/lib/catalog";
import { resolveRuntimeServices } from "@/lib/runtime-catalog";
import { getSupabaseAdmin, isSupabaseConfigured, SUPABASE_MISSING_IT } from "@/lib/supabase";
import { listSubscriptionDates, subscriptionInsertRows } from "@/lib/subscriptions";
import { flattenZodError } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const createSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  email: z.string().trim().max(120).optional().default(""),
  barberId: z.string().min(1),
  serviceIds: z.array(z.string().min(1)).min(1).max(8),
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  durationOverrideMin: z.number().int().min(1).max(480).nullable().optional(),
  priceEuro: z.number().min(0).max(2000).optional(),
  notes: z.string().trim().max(500).optional(),
});

function serializeSub(row: Record<string, unknown>) {
  return {
    id: row.id,
    active: row.active,
    firstName: row.customer_first_name,
    lastName: row.customer_last_name,
    phone: row.customer_phone,
    email: row.customer_email,
    barberId: row.barber_id,
    serviceIds: row.service_ids,
    weekday: row.weekday,
    startTime: String(row.start_time).slice(0, 5),
    durationMin: row.duration_min,
    durationOverrideMin: row.duration_override_min,
    priceCents: row.price_cents,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    notes: row.notes,
  };
}

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: SUPABASE_MISSING_IT }, { status: 503 });
  }
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: SUPABASE_MISSING_IT }, { status: 503 });

  const { data, error } = await db
    .from("booking_subscriptions")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    if (/booking_subscriptions|schema cache|Could not find/i.test(error.message || "")) {
      return NextResponse.json({
        subscriptions: [],
        warning: "Tabella abbonamenti non ancora migrata su Supabase (014_booking_subscriptions).",
      });
    }
    return NextResponse.json({ error: "Impossibile caricare abbonamenti." }, { status: 500 });
  }

  return NextResponse.json({
    subscriptions: (data || []).map((r) => serializeSub(r as Record<string, unknown>)),
  });
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: SUPABASE_MISSING_IT }, { status: 503 });
  }
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: SUPABASE_MISSING_IT }, { status: 503 });

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
  const body = parsed.data;
  if (body.endsOn < body.startsOn) {
    return NextResponse.json({ error: "La data fine deve essere successiva all'inizio." }, { status: 400 });
  }

  const barber = getBarber(body.barberId);
  if (!barber || barber.virtual) {
    return NextResponse.json({ error: "Seleziona Felice o Davide." }, { status: 400 });
  }

  const services = await resolveRuntimeServices(body.serviceIds);
  if (!services) {
    return NextResponse.json({ error: "Servizi non validi." }, { status: 400 });
  }

  const totals = totalsForServices(services);
  const resolved = resolveEffectiveServiceDuration({
    services,
    durationOverrideMin: body.durationOverrideMin ?? null,
    assisted: true,
  });
  if (!resolved.ok || resolved.durationMin == null) {
    return NextResponse.json({ error: resolved.reason || "Durata non valida." }, { status: 400 });
  }

  const dates = listSubscriptionDates(body.startsOn, body.endsOn, body.weekday);
  if (dates.length === 0) {
    return NextResponse.json(
      { error: "Nessuna data aperta in questo intervallo per quel giorno." },
      { status: 400 },
    );
  }

  const priceCents =
    body.priceEuro != null ? Math.round(body.priceEuro * 100) : Math.round(totals.priceEuro * 100);

  const { data: sub, error: subErr } = await db
    .from("booking_subscriptions")
    .insert({
      active: true,
      customer_first_name: body.firstName.trim(),
      customer_last_name: (body.lastName || "").trim(),
      customer_phone: (body.phone || "").trim(),
      customer_email: (body.email || "").trim(),
      barber_id: body.barberId,
      service_ids: services.map((s) => s.id),
      services_snapshot: servicesSnapshot(services),
      weekday: body.weekday,
      start_time: body.startTime,
      duration_min: totals.durationMin,
      duration_override_min: body.durationOverrideMin ?? null,
      price_cents: priceCents,
      starts_on: body.startsOn,
      ends_on: body.endsOn,
      notes: body.notes || null,
    })
    .select("*")
    .single();

  if (subErr || !sub) {
    if (/booking_subscriptions|schema cache|Could not find/i.test(subErr?.message || "")) {
      return NextResponse.json(
        {
          error:
            "Abbonamenti non disponibili: applica la migration 014_booking_subscriptions su Supabase.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Impossibile creare l'abbonamento." }, { status: 500 });
  }

  const rows = subscriptionInsertRows({
    subscriptionId: sub.id as string,
    draft: {
      firstName: body.firstName,
      lastName: body.lastName || "",
      phone: body.phone,
      email: body.email,
      barberId: body.barberId,
      serviceIds: body.serviceIds,
      weekday: body.weekday,
      startTime: body.startTime,
      startsOn: body.startsOn,
      endsOn: body.endsOn,
      durationOverrideMin: body.durationOverrideMin,
      notes: body.notes,
    },
    services,
    dates,
    durationMin: resolved.durationMin,
    priceCents,
  });
  if (!rows) {
    return NextResponse.json({ error: "Barbiere non valido." }, { status: 400 });
  }

  let created = 0;
  let skipped = 0;
  const conflicts: string[] = [];
  for (const row of rows) {
    let { error } = await db.from("appointments").insert(row);
    if (error && /subscription_id|schema cache|Could not find/i.test(error.message || "")) {
      const fallback = { ...row };
      delete (fallback as { subscription_id?: string }).subscription_id;
      ({ error } = await db.from("appointments").insert(fallback));
    }
    if (error) {
      skipped += 1;
      conflicts.push(row.starts_at.slice(0, 16));
      continue;
    }
    created += 1;
  }

  return NextResponse.json({
    ok: true,
    subscription: serializeSub(sub as Record<string, unknown>),
    created,
    skipped,
    conflicts: conflicts.slice(0, 12),
    dates: dates.length,
  });
}

export async function PATCH(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: SUPABASE_MISSING_IT }, { status: 503 });
  }
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: SUPABASE_MISSING_IT }, { status: 503 });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const schema = z.object({
    id: z.string().uuid(),
    active: z.boolean().optional(),
    cancelFuture: z.boolean().optional(),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
  }
  const { id, active, cancelFuture } = parsed.data;

  if (active === false || cancelFuture) {
    await db.from("booking_subscriptions").update({ active: false }).eq("id", id);
    const nowIso = new Date().toISOString();
    const { data: future } = await db
      .from("appointments")
      .select("id")
      .eq("subscription_id", id)
      .gte("starts_at", nowIso)
      .neq("status", "cancelled");
    if (future?.length) {
      await db
        .from("appointments")
        .update({ status: "cancelled", cancelled_at: nowIso })
        .in(
          "id",
          future.map((f) => f.id),
        );
    }
    return NextResponse.json({ ok: true, cancelledFuture: future?.length || 0 });
  }

  return NextResponse.json({ ok: true });
}
