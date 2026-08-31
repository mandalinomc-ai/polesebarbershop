import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { findSlot, getAvailableSlots, wallTimeToUtc } from "@/lib/availability";
import { getBarber, resolveServices, totalsForServices } from "@/lib/catalog";
import { loadDayAppointments, publicAppointment, servicesSnapshot } from "@/lib/appointments";
import { getSupabaseAdmin, isSupabaseConfigured, SUPABASE_MISSING_IT, type AppointmentRow } from "@/lib/supabase";
import { flattenZodError, walkInSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: SUPABASE_MISSING_IT }, { status: 503 });
  let raw: unknown;
  try { raw = await request.json(); } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }
  const parsed = walkInSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
  const body = parsed.data;
  const services = resolveServices(body.serviceIds);
  if (!services) return NextResponse.json({ error: "Servizi non validi." }, { status: 400 });
  const barber = getBarber(body.barberId);
  if (!barber || barber.virtual) return NextResponse.json({ error: "Seleziona Felice o Davide." }, { status: 400 });
  const totals = totalsForServices(services);
  const startsAt = wallTimeToUtc(body.date, body.startTime);
  const slots = getAvailableSlots({
    date: body.date, barberId: body.barberId, durationMinutes: totals.durationMin,
    appointments: await loadDayAppointments(body.date), minNoticeMinutes: 0, now: new Date(0),
  });
  const slot = findSlot(slots, startsAt);
  if (!slot) return NextResponse.json({ error: "Orario non disponibile per questa poltrona." }, { status: 409 });
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: SUPABASE_MISSING_IT }, { status: 503 });
  const { data, error } = await db.from("appointments").insert({
    status: "walk_in",
    customer_first_name: body.firstName || "Walk-in",
    customer_last_name: body.lastName || "",
    customer_email: body.email || "",
    customer_phone: body.phone || "",
    barber_id: body.barberId,
    service_ids: services.map((s) => s.id),
    services_snapshot: servicesSnapshot(services),
    starts_at: slot.startIso,
    ends_at: slot.endIso,
    duration_min: totals.durationMin,
    price_cents: Math.round(body.priceEuro * 100),
    is_walk_in: true,
    notes: body.notes || null,
    source: "walk_in",
  }).select("*").single();
  if (error) return NextResponse.json({ error: "Impossibile registrare il walk-in." }, { status: 500 });
  return NextResponse.json({ ok: true, appointment: publicAppointment(data as AppointmentRow) });
}
