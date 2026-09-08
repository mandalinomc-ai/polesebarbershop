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
import { normalizePersonName } from "@/lib/crm";
import { getSupabaseAdmin, isSupabaseConfigured, SUPABASE_MISSING_IT, type AppointmentRow } from "@/lib/supabase";
import { flattenZodError, walkInSchema } from "@/lib/validations";
import { z } from "zod";

async function contactFromAnagrafica(
  firstName: string,
  lastName: string,
): Promise<{ phone: string; email: string; matched: boolean }> {
  const db = getSupabaseAdmin();
  if (!db) return { phone: "", email: "", matched: false };
  const wantFirst = normalizePersonName(firstName);
  const wantLast = normalizePersonName(lastName);
  if (!wantFirst || !wantLast) return { phone: "", email: "", matched: false };
  const { data } = await db
    .from("appointments")
    .select("customer_first_name, customer_last_name, customer_phone, customer_email, starts_at")
    .order("starts_at", { ascending: false })
    .limit(800);
  const hit = (data || []).find((row) => {
    const same =
      normalizePersonName(String(row.customer_first_name || "")) === wantFirst &&
      normalizePersonName(String(row.customer_last_name || "")) === wantLast;
    if (!same) return false;
    const phone = String(row.customer_phone || "").replace(/\D/g, "");
    const email = String(row.customer_email || "").trim();
    return phone.length >= 8 || email.includes("@");
  });
  if (!hit) return { phone: "", email: "", matched: false };
  return {
    phone: String(hit.customer_phone || "").trim(),
    email: String(hit.customer_email || "").trim(),
    matched: true,
  };
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const walkInWithOverride = walkInSchema.extend({
  durationOverrideMin: z.number().int().min(1).max(480).nullable().optional(),
  force: z.boolean().optional(),
});

export async function POST(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: SUPABASE_MISSING_IT }, { status: 503 });
  let raw: unknown;
  try { raw = await request.json(); } catch {
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

  // Walk-in essentials: servizi + nome + cognome. If anagrafica already has
  // this person, reuse phone/email — never invent or require them here.
  let phone = (body.phone || "").trim();
  let email = (body.email || "").trim();
  let linkedExisting = false;
  if (!phone && !email) {
    const fromAnag = await contactFromAnagrafica(body.firstName, body.lastName);
    if (fromAnag.matched) {
      phone = fromAnag.phone;
      email = fromAnag.email;
      linkedExisting = true;
    }
  }

  const insertPayload: Record<string, unknown> = {
    status: "walk_in",
    customer_first_name: body.firstName.trim(),
    customer_last_name: body.lastName.trim(),
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
    notes: body.notes || null,
    source: "walk_in",
  };
  let { data, error } = await db.from("appointments").insert(insertPayload).select("*").single();
  if (error && /duration_override_min|schema cache|Could not find/i.test(error.message || "")) {
    delete insertPayload.duration_override_min;
    ({ data, error } = await db.from("appointments").insert(insertPayload).select("*").single());
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
    linkedExisting,
  });
}
