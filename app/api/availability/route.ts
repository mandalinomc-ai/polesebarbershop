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
  CALENDAR_UNAVAILABLE_IT,
  CLOSED_DAY_IT,
  resolveEffectiveServiceDuration,
} from "@/lib/booking";
import {
  ANYONE_BARBER_ID,
  getBarber,
  onlineBookingBlockReason,
  servicesAreOnlineBookable,
} from "@/lib/catalog";
import { resolveRuntimeServices } from "@/lib/runtime-catalog";
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

const RETRY_MESSAGE = CALENDAR_UNAVAILABLE_IT;

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
  const serviceIdsRaw = searchParams.get("serviceIds") || "";

  // Public availability never trusts client `duration` — only catalog/DB via serviceIds.
  if (!serviceIdsRaw) {
    return NextResponse.json(
      { error: "Indica i servizi (serviceIds). La durata non è accettata dal client." },
      { status: 400 },
    );
  }
  if (!parsed.success) {
    return NextResponse.json(
      { error: flattenZodError(parsed.error) },
      { status: 400 },
    );
  }
  const services = await resolveRuntimeServices(parsed.data.serviceIds);
  if (!services) {
    return NextResponse.json(
      { error: "Uno o più servizi non sono validi." },
      { status: 400 },
    );
  }
  if (!servicesAreOnlineBookable(services)) {
    return NextResponse.json(
      {
        error:
          onlineBookingBlockReason(services) ||
          "Uno o più servizi non sono prenotabili online.",
      },
      { status: 400 },
    );
  }
  const resolved = resolveEffectiveServiceDuration({ services });
  if (!resolved.ok || resolved.durationMin == null || !resolved.onlineBookable) {
    return NextResponse.json(
      {
        error:
          onlineBookingBlockReason(services) ||
          "Uno o più servizi non sono prenotabili online.",
      },
      { status: 400 },
    );
  }
  const durationMinutes = resolved.durationMin;

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
      warning: CLOSED_DAY_IT,
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
