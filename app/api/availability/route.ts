import { NextResponse } from "next/server";
import {
  formatItalianDate,
  getFirstBookableDate,
  getScheduleSlots,
  isClosedDay,
  summarizeSchedule,
  ONLINE_DISPLAY_INTERVAL_MINUTES,
  type ScheduleSlot,
} from "@/lib/availability";
import {
  ANYONE_BARBER_ID,
  getBarber,
  resolveServices,
  totalsForServices,
  servicesAreOnlineBookable,
} from "@/lib/catalog";
import {
  AppointmentsUnavailableError,
  loadAppointmentsBetween,
  loadDayAppointments,
} from "@/lib/appointments";
import { BOOKING_UI_DAYS, SITE } from "@/lib/site-config";
import { availabilityQuerySchema, flattenZodError } from "@/lib/validations";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const RETRY_MESSAGE =
  "Calendario non disponibile in questo momento. Riprova tra poco.";

function serializeSlot(s: ScheduleSlot) {
  return {
    start: s.startIso,
    end: s.endIso,
    startIso: s.startIso,
    endIso: s.endIso,
    blockEnd: s.blockEndIso,
    blockEndIso: s.blockEndIso,
    label: s.label,
    barberId: s.barberId,
    available: s.available,
    booked: s.booked,
  };
}

function parseSummaryDates(raw: string | null, selectedDate: string): string[] {
  const fromQuery = (raw || "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => DATE_RE.test(value));
  const unique = [...new Set([selectedDate, ...fromQuery])];
  return unique.slice(0, BOOKING_UI_DAYS + 1);
}

function emptyPayload(
  date: string,
  first: string,
  warning: string,
  durationMinutes = 0,
) {
  return {
    date,
    slots: [],
    days: [{ date, availableCount: 0, bookedCount: 0, full: false }],
    firstBookableDate: first,
    shopOpen: false,
    durationMinutes,
    availableCount: 0,
    bookedCount: 0,
    full: false,
    warning,
    sourceUnavailable: true,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = availabilityQuerySchema.safeParse({
    date: searchParams.get("date") || "",
    barberId: searchParams.get("barberId") || ANYONE_BARBER_ID,
    serviceIds:
      searchParams.get("serviceIds") || searchParams.get("duration") || "",
  });

  const date = searchParams.get("date") || "";
  const barberId = searchParams.get("barberId") || ANYONE_BARBER_ID;
  const durationParam = Number(searchParams.get("duration") || "0");
  const serviceIdsRaw = searchParams.get("serviceIds") || "";

  let durationMinutes = 0;

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
    if (!servicesAreOnlineBookable(services)) {
      const unknown = services.filter((s) => !s.durationKnown).map((s) => s.name).join(", ");
      return NextResponse.json(
        {
          error: `Durata non definita per: ${unknown}. Prenota in salone — nessuna durata inventata online.`,
          durationUnknown: true,
        },
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

  if (!DATE_RE.test(date)) {
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
      days: [{ date, availableCount: 0, bookedCount: 0, full: false }],
      firstBookableDate: first,
      shopOpen: false,
      durationMinutes,
      warning: `Le prenotazioni aprono dal ${formatItalianDate(SITE.openingDate)}.`,
    });
  }

  if (isClosedDay(date)) {
    return NextResponse.json({
      date,
      slots: [],
      days: [{ date, availableCount: 0, bookedCount: 0, full: false }],
      firstBookableDate: first,
      shopOpen: false,
      durationMinutes,
      warning: "Il salone è chiuso in questo giorno (domenica).",
    });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(emptyPayload(date, first, RETRY_MESSAGE, durationMinutes), {
      status: 503,
    });
  }

  const summaryDates = parseSummaryDates(searchParams.get("summaryDates"), date);
  const rangeStart = summaryDates.reduce((min, d) => (d < min ? d : min), date);
  const rangeEnd = summaryDates.reduce((max, d) => (d > max ? d : max), date);

  let appointments;
  try {
    appointments =
      summaryDates.length > 1
        ? await loadAppointmentsBetween(rangeStart, rangeEnd)
        : await loadDayAppointments(date);
  } catch (err) {
    const message =
      err instanceof AppointmentsUnavailableError ? err.message : RETRY_MESSAGE;
    return NextResponse.json(emptyPayload(date, first, message, durationMinutes), {
      status: 503,
    });
  }

  const slots = getScheduleSlots({
    date,
    barberId,
    durationMinutes,
    appointments,
    fullSearch: false,
    displayIntervalMinutes: ONLINE_DISPLAY_INTERVAL_MINUTES,
  });
  const occupancy = summarizeSchedule(date, slots, { openDay: true });
  const days = summaryDates.map((iso) => {
    if (iso === date) return occupancy;
    if (iso < first || isClosedDay(iso)) {
      return { date: iso, availableCount: 0, bookedCount: 0, full: false };
    }
    return summarizeSchedule(
      iso,
      getScheduleSlots({
        date: iso,
        barberId,
        durationMinutes,
        appointments,
        fullSearch: false,
        displayIntervalMinutes: ONLINE_DISPLAY_INTERVAL_MINUTES,
      }),
      { openDay: true },
    );
  });

  return NextResponse.json({
    date,
    firstBookableDate: first,
    shopOpen: true,
    durationMinutes,
    availableCount: occupancy.availableCount,
    bookedCount: occupancy.bookedCount,
    full: occupancy.full,
    days,
    slots: slots.map(serializeSlot),
    sourceUnavailable: false,
  });
}
