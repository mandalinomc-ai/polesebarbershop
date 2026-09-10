import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import {
  findSlot,
  getAvailableSlots,
  wallTimeToUtc,
} from "@/lib/availability";
import { blockEndFromStart, resolveEffectiveServiceDuration } from "@/lib/booking";
import { getBarber, totalsForServices } from "@/lib/catalog";
import { resolveRuntimeServices } from "@/lib/runtime-catalog";
import {
  AppointmentsUnavailableError,
  loadDayAppointments,
  publicAppointment,
  servicesSnapshot,
} from "@/lib/appointments";
import { getSupabaseAdmin, isSupabaseConfigured, SUPABASE_MISSING_IT, type AppointmentRow } from "@/lib/supabase";
import { flattenZodError, walkInSchema } from "@/lib/validations";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const walkInWithOverride = walkInSchema.extend({
  durationOverrideMin: z.number().int().min(1).max(480).nullable().optional(),
  force: z.boolean().optional(),
  clientRequestId: z.string().trim().min(8).max(80).optional(),
});

const recentLocks = new Map<string, number>();
function acquireSubmitLock(key: string, ttlMs = 8000): boolean {
  const now = Date.now();
  for (const [k, exp] of recentLocks) {
    if (exp < now) recentLocks.delete(k);
  }
  if (recentLocks.has(key)) return false;
  recentLocks.set(key, now + ttlMs);
  return true;
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: SUPABASE_MISSING_IT }, { status: 503 });
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }
  const parsed = walkInWithOverride.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
  const body = parsed.data;
  const services = await resolveRuntimeServices(body.serviceIds);
  if (!services) return NextResponse.json({ error: "Servizi non validi." }, { status: 400 });
  const barber = getBarber(body.barberId);
  if (!barber || barber.virtual) return NextResponse.json({ error: "Seleziona Felice o Davide." }, { status: 400 });
  const totals = totalsForServices(services);
  const durationOverride = body.durationOverrideMin ?? null;
  const resolved = resolveEffectiveServiceDuration({
    services,
    durationOverrideMin: durationOverride,
    assisted: true,
  });
  if (!resolved.ok || resolved.durationMin == null) {
    return NextResponse.json(
      { error: resolved.reason || "Imposta una durata override (min) per questo servizio." },
      { status: 400 },
    );
  }
  const occupancyDuration = resolved.durationMin;
  const startsAt = wallTimeToUtc(body.date, body.startTime);
  const firstName = (body.firstName || "Walk-in").trim() || "Walk-in";
  const lastName = (body.lastName || "").trim();
  const phone = (body.phone || "").trim();
  const email = (body.email || "").trim();
  const isIncomplete = phone.replace(/\D/g, "").length < 8 && !email.includes("@");

  const lockKey =
    body.clientRequestId ||
    `${body.barberId}|${body.date}|${body.startTime}|${firstName}|${lastName}|${body.serviceIds.join(",")}`;
  if (!acquireSubmitLock(lockKey)) {
    return NextResponse.json({ error: "Salvataggio già in corso. Attendi un momento." }, { status: 429 });
  }

  let dayAppointments;
  try {
    dayAppointments = await loadDayAppointments(body.date);
  } catch (err) {
    const message =
      err instanceof AppointmentsUnavailableError
        ? err.message
        : "Calendario non disponibile. Riprova tra poco.";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const slots = getAvailableSlots({
    date: body.date,
    barberId: body.barberId,
    durationMinutes: occupancyDuration,
    appointments: dayAppointments,
    minNoticeMinutes: 0,
    now: new Date(0),
    fullSearch: true,
  });
  let slot = findSlot(slots, startsAt);
  const force = Boolean(body.force);
  if (!slot && !force) {
    const alternatives = slots.slice(0, 6).map((s) => ({
      label: s.label,
      startIso: s.startIso,
      barberId: s.barberId,
    }));
    return NextResponse.json(
      {
        error: "Orario non disponibile per questa poltrona.",
        conflict: true,
        alternatives,
      },
      { status: 409 },
    );
  }

  const startIso = slot?.startIso ?? startsAt.toISOString();
  const blockEndIso = slot?.blockEndIso ?? blockEndFromStart(startsAt, occupancyDuration).toISOString();

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: SUPABASE_MISSING_IT }, { status: 503 });

  // Idempotency: same chair + start + name already saved → return existing (anti double-submit).
  const { data: existing } = await db
    .from("appointments")
    .select("*")
    .eq("barber_id", body.barberId)
    .eq("starts_at", startIso)
    .eq("customer_first_name", firstName)
    .eq("customer_last_name", lastName)
    .neq("status", "cancelled")
    .limit(1)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({
      ok: true,
      appointment: publicAppointment(existing as AppointmentRow),
      deduped: true,
    });
  }

  const insertPayload: Record<string, unknown> = {
    status: "walk_in",
    customer_first_name: firstName,
    customer_last_name: lastName,
    customer_email: email,
    customer_phone: phone,
    barber_id: body.barberId,
    service_ids: services.map((s) => s.id),
    services_snapshot: servicesSnapshot(services),
    starts_at: startIso,
    ends_at: blockEndIso,
    duration_min: totals.durationMin,
    duration_override_min: durationOverride,
    price_cents: Math.round(body.priceEuro * 100),
    is_walk_in: true,
    is_incomplete: isIncomplete,
    notes: body.notes || null,
    source: "walk_in",
  };
  let { data, error } = await db.from("appointments").insert(insertPayload).select("*").single();
  if (error && /is_incomplete|duration_override_min|schema cache|Could not find/i.test(error.message || "")) {
    delete insertPayload.is_incomplete;
    if (/duration_override_min/i.test(error.message || "")) delete insertPayload.duration_override_min;
    ({ data, error } = await db.from("appointments").insert(insertPayload).select("*").single());
    if (error && /duration_override_min|schema cache|Could not find/i.test(error.message || "")) {
      delete insertPayload.duration_override_min;
      ({ data, error } = await db.from("appointments").insert(insertPayload).select("*").single());
    }
  }
  if (error) {
    const overlap = error.code === "23P01" || /overlap|exclusion/i.test(error.message);
    if (overlap) {
      return NextResponse.json({ error: "Orario occupato (vincolo database).", conflict: true }, { status: 409 });
    }
    return NextResponse.json({ error: "Impossibile registrare il walk-in." }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    appointment: publicAppointment(data as AppointmentRow),
    forced: force && !slot,
    incomplete: isIncomplete,
  });
}
