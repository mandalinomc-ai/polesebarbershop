import { NextResponse } from "next/server";
import {
  getAvailableSlots,
  getFirstBookableDate,
  isClosedDay,
} from "@/lib/availability";
import {
  ANYONE_BARBER_ID,
  getBarber,
  resolveServices,
  totalsForServices,
} from "@/lib/catalog";
import { loadDayAppointments } from "@/lib/appointments";
import { formatItalianDate } from "@/lib/availability";
import { SITE } from "@/lib/site-config";
import { availabilityQuerySchema, flattenZodError } from "@/lib/validations";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = availabilityQuerySchema.safeParse({
    date: searchParams.get("date") || "",
    barberId: searchParams.get("barberId") || ANYONE_BARBER_ID,
    serviceIds:
      searchParams.get("serviceIds") || searchParams.get("duration") || "",
  });

  // Also accept duration-only (wizard fallback) without service ids.
  const date = searchParams.get("date") || "";
  const barberId = searchParams.get("barberId") || ANYONE_BARBER_ID;
  const durationParam = Number(searchParams.get("duration") || "0");
  const serviceIdsRaw = searchParams.get("serviceIds") || "";

  let durationMinutes = 0;
  let warning: string | undefined;

  if (serviceIdsRaw) {
    if (!parsed.success) {
      return NextResponse.json(
        { error: flattenZodError(parsed.error) },
        { status: 400 },
      );
    }
    const services = resolveServices(parsed.data.serviceIds);
    if (!services) {
      return NextResponse.json(
        { error: "Uno o più servizi non sono validi." },
        { status: 400 },
      );
    }
    durationMinutes = totalsForServices(services).durationMin;
  } else if (Number.isFinite(durationParam) && durationParam > 0) {
    durationMinutes = durationParam;
  } else {
    return NextResponse.json(
      { error: "Indica i servizi oppure una durata valida." },
      { status: 400 },
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "Parametro date non valido (YYYY-MM-DD)." },
      { status: 400 },
    );
  }
  if (!getBarber(barberId)) {
    return NextResponse.json({ error: "Barbiere non valido." }, { status: 400 });
  }

  const first = getFirstBookableDate();
  if (date < first) {
    return NextResponse.json({
      date,
      slots: [],
      firstBookableDate: first,
      shopOpen: false,
      warning: `Le prenotazioni aprono dal ${formatItalianDate(SITE.openingDate)}.`,
    });
  }

  if (isClosedDay(date)) {
    return NextResponse.json({
      date,
      slots: [],
      firstBookableDate: first,
      shopOpen: false,
      warning: "Il salone è chiuso in questo giorno (lunedì e domenica).",
    });
  }

  if (!isSupabaseConfigured()) {
    warning =
      "Calendario in modalità locale: il database non è configurato. Gli orari mostrati potrebbero non riflettere le prenotazioni reali.";
  }

  const appointments = await loadDayAppointments(date);
  const slots = getAvailableSlots({
    date,
    barberId,
    durationMinutes,
    appointments,
  });

  return NextResponse.json({
    date,
    firstBookableDate: first,
    shopOpen: true,
    durationMinutes,
    warning,
    slots: slots.map((s) => ({
      start: s.startIso,
      end: s.endIso,
      startIso: s.startIso,
      endIso: s.endIso,
      label: s.label,
      barberId: s.barberId,
    })),
  });
}
