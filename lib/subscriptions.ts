import { addDays, isClosedDay, wallTimeToUtc } from "@/lib/availability";
import { blockEndFromStart } from "@/lib/booking";
import { getBarber, totalsForServices, type Service } from "@/lib/catalog";
import { servicesSnapshot } from "@/lib/appointments";

export type SubscriptionDraft = {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  barberId: string;
  serviceIds: string[];
  /** 0=Sun … 6=Sat */
  weekday: number;
  startTime: string;
  startsOn: string;
  endsOn: string;
  durationOverrideMin?: number | null;
  priceEuro?: number;
  notes?: string;
};

export type SubscriptionOccurrence = {
  date: string;
  startsAt: Date;
  endsAt: Date;
};

/** Weekly dates matching weekday from startsOn through endsOn, skipping closed days. */
export function listSubscriptionDates(
  startsOn: string,
  endsOn: string,
  weekday: number,
): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startsOn) || !/^\d{4}-\d{2}-\d{2}$/.test(endsOn)) return [];
  if (endsOn < startsOn) return [];
  if (weekday < 0 || weekday > 6) return [];
  const startWd = new Date(`${startsOn}T12:00:00`).getDay();
  let day = addDays(startsOn, (weekday - startWd + 7) % 7);
  const out: string[] = [];
  for (let i = 0; i < 62 && day <= endsOn; i += 1) {
    if (!isClosedDay(day)) out.push(day);
    day = addDays(day, 7);
  }
  return out;
}

export function buildSubscriptionOccurrences(input: {
  dates: string[];
  startTime: string;
  durationMin: number;
}): SubscriptionOccurrence[] {
  return input.dates.map((date) => {
    const startsAt = wallTimeToUtc(date, input.startTime);
    const endsAt = blockEndFromStart(startsAt, input.durationMin);
    return { date, startsAt, endsAt };
  });
}

export function subscriptionInsertRows(input: {
  subscriptionId: string;
  draft: SubscriptionDraft;
  services: Service[];
  dates: string[];
  durationMin: number;
  priceCents: number;
}) {
  const { subscriptionId, draft, services, dates, durationMin, priceCents } = input;
  const barber = getBarber(draft.barberId);
  if (!barber || barber.virtual) return null;
  const snapshot = servicesSnapshot(services);
  const catalogDuration = totalsForServices(services).durationMin;
  return dates.map((date) => {
    const startsAt = wallTimeToUtc(date, draft.startTime);
    const endsAt = blockEndFromStart(startsAt, durationMin);
    return {
      status: "confirmed" as const,
      customer_first_name: draft.firstName.trim(),
      customer_last_name: (draft.lastName || "").trim(),
      customer_email: (draft.email || "").trim(),
      customer_phone: (draft.phone || "").trim(),
      barber_id: draft.barberId,
      service_ids: services.map((s) => s.id),
      services_snapshot: snapshot,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      duration_min: catalogDuration,
      duration_override_min: draft.durationOverrideMin ?? null,
      price_cents: priceCents,
      is_walk_in: false,
      notes: draft.notes || "Abbonamento · cadenza fissa",
      source: "admin" as const,
      subscription_id: subscriptionId,
    };
  });
}

export const WEEKDAY_OPTIONS_IT: { value: number; label: string }[] = [
  { value: 1, label: "Lunedì" },
  { value: 2, label: "Martedì" },
  { value: 3, label: "Mercoledì" },
  { value: 4, label: "Giovedì" },
  { value: 5, label: "Venerdì" },
  { value: 6, label: "Sabato" },
];
