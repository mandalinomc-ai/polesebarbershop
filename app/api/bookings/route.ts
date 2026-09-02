import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { findSlot, formatItalianDate, formatWallTime, getAvailableSlots, getFirstBookableDate, wallTimeToUtc } from "@/lib/availability";
import { getBarber, resolveServices, totalsForServices } from "@/lib/catalog";
import { customerConfirmEmail, ownerNewBookingEmail, publicCustomerMailError, sendBookingEmails } from "@/lib/email";
import { buildIcs, googleCalendarUrl, icsFilename } from "@/lib/ics";
import { SITE, getAdminEmail, getSiteUrl } from "@/lib/site-config";
import { getSupabaseAdmin, isSupabaseConfigured, SUPABASE_MISSING_IT, type AppointmentRow } from "@/lib/supabase";
import { bookingSchema, flattenZodError } from "@/lib/validations";
import { loadDayAppointments, publicAppointment, servicesSnapshot } from "@/lib/appointments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let raw: unknown;
  try { raw = await request.json(); } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }
  const parsed = bookingSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
  }
  const body = parsed.data;
  const services = resolveServices(body.serviceIds);
  if (!services) return NextResponse.json({ error: "Seleziona almeno un servizio valido." }, { status: 400 });
  if (!getBarber(body.barberId)) return NextResponse.json({ error: "Barbiere non valido." }, { status: 400 });

  const totals = totalsForServices(services);
  if (body.date < getFirstBookableDate()) {
    return NextResponse.json({ error: `Le prenotazioni aprono dal ${formatItalianDate(SITE.openingDate)}.` }, { status: 400 });
  }

  const startsAt = wallTimeToUtc(body.date, body.startTime);
  const slots = getAvailableSlots({
    date: body.date,
    barberId: body.barberId,
    durationMinutes: totals.durationMin,
    appointments: await loadDayAppointments(body.date),
  });
  const slot = findSlot(slots, startsAt);
  if (!slot) {
    return NextResponse.json({ error: "Questo orario non è più disponibile. Scegline un altro." }, { status: 409 });
  }

  const barberName = getBarber(slot.barberId)?.name || slot.barberId;
  const manageToken = randomBytes(24).toString("hex");
  const manageUrl = `${getSiteUrl()}/appuntamento/${manageToken}`;
  const timeLabel = formatWallTime(slot.start);
  const dateLabel = formatItalianDate(body.date);
  const icsContent = buildIcs({
    uid: `${manageToken}@polesebarbershop.it`,
    startsAt: slot.start,
    endsAt: slot.end,
    summary: `${SITE.name} — ${totals.names}`,
    description: `${totals.names} con ${barberName}. ${SITE.addressFull}. Tel ${SITE.phone}. ${manageUrl}`,
    location: SITE.addressFull,
    url: manageUrl,
  });
  const filename = icsFilename(body.date, body.startTime);
  const gcal = googleCalendarUrl({
    startsAt: slot.start, endsAt: slot.end,
    summary: `${SITE.name} — ${totals.names}`,
    description: `${totals.names} con ${barberName}. Promemoria: 30 minuti prima.`,
    location: SITE.addressFull,
  });

  const warnings: string[] = [];
  let persisted = false;
  let appointmentId: string | null = null;
  let row: AppointmentRow | null = null;

  if (!isSupabaseConfigured()) {
    warnings.push(SUPABASE_MISSING_IT);
  } else {
    const db = getSupabaseAdmin();
    if (!db) warnings.push(SUPABASE_MISSING_IT);
    else {
      const { data, error } = await db.from("appointments").insert({
        status: "confirmed",
        manage_token: manageToken,
        customer_first_name: body.firstName,
        customer_last_name: body.lastName,
        customer_email: body.email,
        customer_phone: body.phone,
        gdpr_consent_at: new Date().toISOString(),
        barber_id: slot.barberId,
        service_ids: services.map((s) => s.id),
        services_snapshot: servicesSnapshot(services),
        starts_at: slot.startIso,
        ends_at: slot.endIso,
        duration_min: totals.durationMin,
        price_cents: totals.priceEuro * 100,
        is_walk_in: false,
        notes: body.notes || null,
        source: "online",
      }).select("*").single();
      if (error) {
        const overlap = error.code === "23P01" || /overlap|exclusion/i.test(error.message);
        if (overlap) {
          return NextResponse.json(
            { error: "Questo orario è appena stato prenotato. Scegline un altro." },
            { status: 409 },
          );
        }
        const schemaMissing =
          error.code === "PGRST205" ||
          /schema cache|Could not find the table|does not exist/i.test(error.message || "");
        warnings.push(
          schemaMissing
            ? `Database collegato ma manca lo schema: esegui supabase/migrations/001_schema.sql nel SQL Editor. Conferma e file .ics restano validi. Chiama il ${SITE.phone}.`
            : `Impossibile salvare nel database. Conferma e file .ics restano validi. Chiama il ${SITE.phone}.`,
        );
      } else {
        row = data as AppointmentRow;
        persisted = true;
        appointmentId = row.id;
      }
    }
  }

  const emails = await sendBookingEmails({
    customerEmail: body.email,
    customer: customerConfirmEmail({
      firstName: body.firstName,
      service: totals.names,
      barber: barberName,
      date: dateLabel,
      time: timeLabel,
      manageUrl,
      priceLabel: totals.priceLabel,
      durationLabel: totals.durationLabel,
    }),
    owner: ownerNewBookingEmail({
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      email: body.email,
      service: totals.names,
      durationMin: totals.durationMin,
      barber: barberName,
      date: dateLabel,
      time: timeLabel,
      priceLabel: totals.priceLabel,
      notes: body.notes,
      manageUrl,
    }),
    ics: { filename, content: icsContent },
  });
  if (!emails.customer.ok) {
    warnings.push(publicCustomerMailError(
      emails.customer.error,
      Boolean(body.phone),
    ));
  }
  const ownerFailed = emails.owner.results.filter((r) => !r.result.ok);
  if (ownerFailed.length && !emails.owner.ok) {
    warnings.push(
      `Avviso email al salone non recapitato a ${getAdminEmail()}.`,
    );
  }

  return NextResponse.json({
    ok: true,
    persisted,
    emailSent: Boolean(emails.customer.ok),
    ownerNotified: Boolean(emails.owner.ok),
    ownerWhatsAppSent: false,
    customerEmailFailed: !emails.customer.ok,
    confirmViaWhatsApp: false,
    customerWhatsAppSent: false,
    salonWhatsAppSent: false,
    customerWhatsAppUrl: null,
    salonRelay: emails.owner.ok
      ? null
      : {
          to: getAdminEmail(),
          subject: `NUOVA PRENOTAZIONE — ${body.firstName} ${body.lastName}`,
          message: [
            "NUOVA PRENOTAZIONE",
            `Nome: ${body.firstName} ${body.lastName}`,
            `Telefono: ${body.phone}`,
            `Email: ${body.email}`,
            `Servizio: ${totals.names}`,
            `Prezzo: ${totals.priceLabel}`,
            `Durata: ${totals.durationLabel}`,
            `Barbiere: ${barberName}`,
            `Quando: ${dateLabel} alle ${timeLabel}`,
            `Gestisci: ${manageUrl}`,
          ].filter(Boolean).join("\n"),
        },
    appointmentId,
    manageToken,
    manageUrl,
    barberId: slot.barberId, barberName, startsAt: slot.startIso, endsAt: slot.endIso,
    durationMinutes: totals.durationMin, totalPrice: totals.priceEuro, priceLabel: totals.priceLabel,
    serviceNames: totals.names, dateLabel, timeLabel, ics: icsContent, icsFilename: filename,
    googleCalendarUrl: gcal, warnings, appointment: row ? publicAppointment(row) : null,
  });
}
