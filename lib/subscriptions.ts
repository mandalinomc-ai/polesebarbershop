import { addDays, isClosedDay, wallTimeToUtc } from "@/lib/availability";
import { blockEndFromStart, formatWallDate, formatWallTime, TIMEZONE } from "@/lib/booking";
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

export type SerializedSubscription = {
  id: string;
  active: boolean;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  barberId: string;
  serviceIds: string[];
  weekday: number;
  startTime: string;
  durationMin: number;
  durationOverrideMin: number | null;
  priceCents: number;
  startsOn: string;
  endsOn: string;
  notes: string | null;
  /** True when reconstructed from appointments (table 014 absent). */
  legacy?: boolean;
};

const SERIES_UUID_RE =
  /\[series:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]/i;

/** Stable note marker so abbonamenti work even without booking_subscriptions. */
export const SUBSCRIPTION_SERIES_LABEL = "Abbonamento · cadenza fissa";

export function formatSubscriptionSeriesNote(
  seriesId: string,
  extra?: string | null,
): string {
  const base = `${SUBSCRIPTION_SERIES_LABEL} [series:${seriesId}]`;
  const trimmed = (extra || "").trim();
  if (!trimmed || trimmed === SUBSCRIPTION_SERIES_LABEL) return base;
  return `${base} · ${trimmed}`;
}

export function parseSubscriptionSeriesId(
  notes: string | null | undefined,
): string | null {
  if (!notes) return null;
  const match = SERIES_UUID_RE.exec(notes);
  return match?.[1]?.toLowerCase() ?? null;
}

export function isMissingSubscriptionsTableError(
  message: string | null | undefined,
  code?: string | null,
): boolean {
  if (code === "PGRST205" || code === "42P01") return true;
  return /booking_subscriptions|schema cache|Could not find|does not exist|PGRST205|relation/i.test(
    message || "",
  );
}

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
  /** When true, omit subscription_id (column may be missing pre-014). */
  omitSubscriptionId?: boolean;
}) {
  const {
    subscriptionId,
    draft,
    services,
    dates,
    durationMin,
    priceCents,
    omitSubscriptionId,
  } = input;
  const barber = getBarber(draft.barberId);
  if (!barber || barber.virtual) return null;
  const snapshot = servicesSnapshot(services);
  const catalogDuration = totalsForServices(services).durationMin;
  const note = formatSubscriptionSeriesNote(subscriptionId, draft.notes);
  return dates.map((date) => {
    const startsAt = wallTimeToUtc(date, draft.startTime);
    const endsAt = blockEndFromStart(startsAt, durationMin);
    const row: Record<string, unknown> = {
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
      notes: note,
      source: "admin" as const,
    };
    if (!omitSubscriptionId) {
      row.subscription_id = subscriptionId;
    }
    return row;
  });
}

export function serializeSubscriptionRow(
  row: Record<string, unknown>,
): SerializedSubscription {
  return {
    id: String(row.id),
    active: Boolean(row.active),
    firstName: String(row.customer_first_name || ""),
    lastName: String(row.customer_last_name || ""),
    phone: String(row.customer_phone || ""),
    email: String(row.customer_email || ""),
    barberId: String(row.barber_id || ""),
    serviceIds: Array.isArray(row.service_ids)
      ? (row.service_ids as string[])
      : [],
    weekday: Number(row.weekday),
    startTime: String(row.start_time).slice(0, 5),
    durationMin: Number(row.duration_min) || 0,
    durationOverrideMin:
      row.duration_override_min == null ? null : Number(row.duration_override_min),
    priceCents: Number(row.price_cents) || 0,
    startsOn: String(row.starts_on),
    endsOn: String(row.ends_on),
    notes: row.notes == null ? null : String(row.notes),
  };
}

type AppointmentSeriesRow = {
  id?: string;
  customer_first_name?: string | null;
  customer_last_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  barber_id?: string | null;
  service_ids?: string[] | null;
  starts_at: string;
  duration_min?: number | null;
  duration_override_min?: number | null;
  price_cents?: number | null;
  notes?: string | null;
  status?: string | null;
};

/**
 * Rebuild active subscription cards from appointment notes when table 014 is absent.
 * Groups by [series:uuid]; keeps series with at least one future non-cancelled visit.
 */
export function reconstructSubscriptionsFromAppointments(
  rows: AppointmentSeriesRow[],
  now: Date = new Date(),
): SerializedSubscription[] {
  const nowMs = now.getTime();
  const bySeries = new Map<string, AppointmentSeriesRow[]>();

  for (const row of rows) {
    if (row.status === "cancelled") continue;
    const seriesId = parseSubscriptionSeriesId(row.notes);
    if (!seriesId) continue;
    const list = bySeries.get(seriesId) || [];
    list.push(row);
    bySeries.set(seriesId, list);
  }

  const out: SerializedSubscription[] = [];
  for (const [seriesId, list] of bySeries) {
    const future = list.filter((r) => new Date(r.starts_at).getTime() >= nowMs);
    if (!future.length) continue;
    const ordered = [...list].sort(
      (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );
    const first = ordered[0]!;
    const last = ordered[ordered.length - 1]!;
    const start = new Date(first.starts_at);
    const startsOn = formatWallDate(start, TIMEZONE);
    out.push({
      id: seriesId,
      active: true,
      firstName: first.customer_first_name || "",
      lastName: first.customer_last_name || "",
      phone: first.customer_phone || "",
      email: first.customer_email || "",
      barberId: first.barber_id || "",
      serviceIds: Array.isArray(first.service_ids) ? first.service_ids : [],
      weekday: new Date(`${startsOn}T12:00:00`).getDay(),
      startTime: formatWallTime(start, TIMEZONE),
      durationMin: Number(first.duration_min) || 0,
      durationOverrideMin:
        first.duration_override_min == null
          ? null
          : Number(first.duration_override_min),
      priceCents: Number(first.price_cents) || 0,
      startsOn,
      endsOn: formatWallDate(new Date(last.starts_at), TIMEZONE),
      notes: SUBSCRIPTION_SERIES_LABEL,
      legacy: true,
    });
  }

  return out.sort((a, b) => a.startsOn.localeCompare(b.startsOn));
}

export const WEEKDAY_OPTIONS_IT: { value: number; label: string }[] = [
  { value: 1, label: "Lunedì" },
  { value: 2, label: "Martedì" },
  { value: 3, label: "Mercoledì" },
  { value: 4, label: "Giovedì" },
  { value: 5, label: "Venerdì" },
  { value: 6, label: "Sabato" },
];
