import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import {
  findSlot,
  formatItalianDate,
  formatWallDate,
  formatWallTime,
  getAvailableSlots,
  getFirstBookableDate,
  wallTimeToUtc,
} from "@/lib/availability";
import {
  ANYONE_BARBER_ID,
  getBarber,
  resolveServices,
  totalsForServices,
} from "@/lib/catalog";
import {
  customerConfirmEmail,
  ownerNewBookingEmail,
  sendEmail,
} from "@/lib/email";
import { scheduleWhatsAppReminder } from "@/lib/qstash";
import { SITE, getSiteUrl } from "@/lib/site-config";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
  SUPABASE_MISSING_IT,
  type AppointmentRow,
} from "@/lib/supabase";
import {
  customerConfirmMessage,
  normalizeWhatsAppNumber,
  ownerNewBookingMessage,
  sendWhatsAppMessage,
} from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BookingBody = {
  serviceIds?: string[];
  barberId?: string;
  startsAt?: string;
  date?: string;
  startTime?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  customer?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
};

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function loadDayAppointments(date: string) {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const dayStart = wallTimeToUtc(date, "00:00").toISOString();
  const dayEnd = wallTimeToUtc(date, "23:59").toISOString();
  const { data } = await db
    .from("appointments")
    .select("barber_id, starts_at, ends_at")
    .eq("status", "confirmed")
    .gte("starts_at", dayStart)
    .lte("starts_at", dayEnd);
  return (data || []).map(
    (row: { barber_id: string; starts_at: string; ends_at: string }) => ({
      barberId: row.barber_id,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
    }),
  );
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: SUPABASE_MISSING_IT }, { status: 503 });
  }
  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: SUPABASE_MISSING_IT }, { status: 503 });
  }

  let body: BookingBody;
  try {
    body = (await request.json()) as BookingBody;
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const serviceIds = body.serviceIds || [];
  const services = resolveServices(serviceIds);
  if (!services || !services.length) {
    return NextResponse.json(
      { error: "Seleziona almeno un servizio valido." },
      { status: 400 },
    );
  }

  const requestedBarber = body.barberId || ANYONE_BARBER_ID;
  if (!getBarber(requestedBarber)) {
    return NextResponse.json({ error: "Barbiere non valido." }, { status: 400 });
  }

  let startsAt: Date | null = body.startsAt ? new Date(body.startsAt) : null;
  if ((!startsAt || Number.isNaN(startsAt.getTime())) && body.date && body.startTime) {
    startsAt = wallTimeToUtc(body.date, body.startTime);
  }
  if (!startsAt || Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: "Orario non valido." }, { status: 400 });
  }

  const firstName = (body.customer?.firstName || body.firstName || "").trim();
  const lastName = (body.customer?.lastName || body.lastName || "").trim();
  const email = (body.customer?.email || body.email || "").trim().toLowerCase();
  const phoneRaw = (body.customer?.phone || body.phone || "").trim();
  const phone = normalizeWhatsAppNumber(phoneRaw);

  if (!firstName || !lastName) {
    return NextResponse.json({ error: "Inserisci nome e cognome." }, { status: 400 });
  }
  if (!isEmail(email)) {
    return NextResponse.json({ error: "Email non valida." }, { status: 400 });
  }
  if (!phone) {
    return NextResponse.json(
      { error: "Numero WhatsApp non valido." },
      { status: 400 },
    );
  }

  const { durationMin, price, names } = totalsForServices(services);
  const date = formatWallDate(startsAt);
  const firstBookable = getFirstBookableDate();
  if (date < firstBookable) {
    return NextResponse.json(
      { error: "Le prenotazioni aprono dal 1 settembre 2026." },
      { status: 400 },
    );
  }

  const appointments = await loadDayAppointments(date);
  const slots = getAvailableSlots({
    date,
    barberId: requestedBarber,
    durationMinutes: durationMin,
    appointments,
  });
  const slot = findSlot(slots, startsAt);
  if (!slot) {
    return NextResponse.json(
      { error: "Questo orario non è più disponibile. Scegline un altro." },
      { status: 409 },
    );
  }

  const assignedBarberId = slot.barberId;
  const barber = getBarber(assignedBarberId);
  const manageToken = randomBytes(24).toString("hex");

  const insert = {
    status: "confirmed" as const,
    manage_token: manageToken,
    customer_first_name: firstName,
    customer_last_name: lastName,
    customer_email: email,
    customer_phone: phone,
    barber_id: assignedBarberId,
    service_ids: services.map((s) => s.id),
    service_names: names,
    duration_minutes: durationMin,
    total_price: price,
    starts_at: slot.startIso,
    ends_at: slot.endIso,
  };

  const { data, error } = await db
    .from("appointments")
    .insert(insert)
    .select("*")
    .single();

  if (error) {
    const overlap =
      error.code === "23P01" ||
      /overlap|exclusion|appointments_no_overlap/i.test(error.message);
    return NextResponse.json(
      {
        error: overlap
          ? "Questo orario è appena stato prenotato. Scegline un altro."
          : "Impossibile salvare la prenotazione. Riprova.",
      },
      { status: overlap ? 409 : 500 },
    );
  }

  const row = data as AppointmentRow;
  const manageUrl = `${getSiteUrl()}/appuntamento/${manageToken}`;
  const timeLabel = formatWallTime(slot.start);
  const dateLabel = formatItalianDate(date);
  const barberName = barber?.name || assignedBarberId;
  const ownerPhone = process.env.OWNER_PHONE || SITE.phone;
  const ownerEmail = process.env.OWNER_EMAIL || SITE.email;

  const customerEmail = customerConfirmEmail({
    firstName,
    service: names,
    barber: barberName,
    date: dateLabel,
    time: timeLabel,
    manageUrl,
    priceLabel: `€ ${price}`,
  });
  const ownerMail = ownerNewBookingEmail({
    firstName,
    lastName,
    phone,
    email,
    service: names,
    barber: barberName,
    date: dateLabel,
    time: timeLabel,
    priceLabel: `€ ${price}`,
  });

  await Promise.allSettled([
    sendEmail({ to: email, ...customerEmail }),
    sendEmail({ to: ownerEmail, ...ownerMail }),
    sendWhatsAppMessage(
      phone,
      customerConfirmMessage({
        firstName,
        service: names,
        barber: barberName,
        date: dateLabel,
        time: timeLabel,
        manageUrl,
      }),
    ),
    sendWhatsAppMessage(
      ownerPhone,
      ownerNewBookingMessage({
        firstName,
        lastName,
        phone,
        service: names,
        date: dateLabel,
        time: timeLabel,
        barber: barberName,
      }),
    ),
  ]);

  let qstashMessageId: string | undefined;
  try {
    const scheduled = await scheduleWhatsAppReminder({
      appointmentId: row.id,
      manageToken,
      startsAt: slot.start,
    });
    qstashMessageId = scheduled.messageId;
  } catch (err) {
    console.error("qstash schedule", err);
  }

  if (qstashMessageId) {
    await db
      .from("appointments")
      .update({ qstash_message_id: qstashMessageId })
      .eq("id", row.id);
  }

  return NextResponse.json({
    ok: true,
    appointmentId: row.id,
    manageToken,
    manageUrl,
    barberId: assignedBarberId,
    barberName,
    startsAt: slot.startIso,
    endsAt: slot.endIso,
    durationMinutes: durationMin,
    totalPrice: price,
    serviceNames: names,
  });
}
