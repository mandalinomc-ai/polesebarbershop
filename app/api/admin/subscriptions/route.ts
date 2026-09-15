import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import { servicesSnapshot } from "@/lib/appointments";
import { resolveEffectiveServiceDuration } from "@/lib/booking";
import { getBarber, totalsForServices } from "@/lib/catalog";
import { resolveRuntimeServices } from "@/lib/runtime-catalog";
import { getSupabaseAdmin, isSupabaseConfigured, SUPABASE_MISSING_IT } from "@/lib/supabase";
import {
  formatSubscriptionSeriesNote,
  isMissingSubscriptionsTableError,
  listSubscriptionDates,
  parseSubscriptionSeriesId,
  reconstructSubscriptionsFromAppointments,
  serializeSubscriptionRow,
  subscriptionInsertRows,
  type SerializedSubscription,
} from "@/lib/subscriptions";
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

async function listLegacySubscriptions(
  db: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
): Promise<SerializedSubscription[]> {
  const { data, error } = await db
    .from("appointments")
    .select(
      "id, customer_first_name, customer_last_name, customer_phone, customer_email, barber_id, service_ids, starts_at, duration_min, duration_override_min, price_cents, notes, status",
    )
    .ilike("notes", "%[series:%")
    .neq("status", "cancelled")
    .order("starts_at", { ascending: true })
    .limit(800);

  if (error || !data) return [];
  return reconstructSubscriptionsFromAppointments(
    data as Parameters<typeof reconstructSubscriptionsFromAppointments>[0],
  );
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
    if (isMissingSubscriptionsTableError(error.message)) {
      const subscriptions = await listLegacySubscriptions(db);
      return NextResponse.json({
        subscriptions,
        mode: "appointments-fallback",
      });
    }
    return NextResponse.json({ error: "Impossibile caricare abbonamenti." }, { status: 500 });
  }

  return NextResponse.json({
    subscriptions: (data || []).map((r) =>
      serializeSubscriptionRow(r as Record<string, unknown>),
    ),
    mode: "table",
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

  const draft = {
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
  };

  let subscriptionId = "";
  let subscription: SerializedSubscription | null = null;
  let omitSubscriptionId = false;
  let mode: "table" | "appointments-fallback" = "table";

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
    if (!isMissingSubscriptionsTableError(subErr?.message)) {
      return NextResponse.json({ error: "Impossibile creare l'abbonamento." }, { status: 500 });
    }
    // Table 014 not applied yet — create the series as linked appointments only.
    subscriptionId = randomUUID();
    omitSubscriptionId = true;
    mode = "appointments-fallback";
    subscription = {
      id: subscriptionId,
      active: true,
      firstName: body.firstName.trim(),
      lastName: (body.lastName || "").trim(),
      phone: (body.phone || "").trim(),
      email: (body.email || "").trim(),
      barberId: body.barberId,
      serviceIds: services.map((s) => s.id),
      weekday: body.weekday,
      startTime: body.startTime,
      durationMin: totals.durationMin,
      durationOverrideMin: body.durationOverrideMin ?? null,
      priceCents,
      startsOn: body.startsOn,
      endsOn: body.endsOn,
      notes: formatSubscriptionSeriesNote(subscriptionId, body.notes),
      legacy: true,
    };
  } else {
    subscriptionId = String(sub.id);
    subscription = serializeSubscriptionRow(sub as Record<string, unknown>);
  }

  const rows = subscriptionInsertRows({
    subscriptionId,
    draft,
    services,
    dates,
    durationMin: resolved.durationMin,
    priceCents,
    omitSubscriptionId,
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
      delete fallback.subscription_id;
      fallback.notes = formatSubscriptionSeriesNote(subscriptionId, body.notes);
      ({ error } = await db.from("appointments").insert(fallback));
    }
    if (error) {
      skipped += 1;
      conflicts.push(String(row.starts_at).slice(0, 16));
      continue;
    }
    created += 1;
  }

  return NextResponse.json({
    ok: true,
    subscription,
    created,
    skipped,
    conflicts: conflicts.slice(0, 12),
    dates: dates.length,
    mode,
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
    const { error: subUpdateErr } = await db
      .from("booking_subscriptions")
      .update({ active: false })
      .eq("id", id);
    const tableMissing = isMissingSubscriptionsTableError(subUpdateErr?.message);

    const nowIso = new Date().toISOString();
    let cancelledFuture = 0;

    if (!tableMissing) {
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
        cancelledFuture = future.length;
      }
    }

    // Always also cancel by series note (covers pre-014 / missing subscription_id column).
    const { data: noted } = await db
      .from("appointments")
      .select("id, notes, starts_at, status")
      .ilike("notes", `%[series:${id}]%`)
      .gte("starts_at", nowIso)
      .neq("status", "cancelled");

    const noteIds = (noted || [])
      .filter((row) => parseSubscriptionSeriesId(row.notes) === id)
      .map((row) => row.id as string);

    if (noteIds.length) {
      await db
        .from("appointments")
        .update({ status: "cancelled", cancelled_at: nowIso })
        .in("id", noteIds);
      cancelledFuture = Math.max(cancelledFuture, noteIds.length);
    }

    return NextResponse.json({ ok: true, cancelledFuture });
  }

  return NextResponse.json({ ok: true });
}
