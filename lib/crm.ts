import { addDays, formatWallDate, mondayOfWeek } from "@/lib/availability";
import { namesFromSnapshot } from "@/lib/appointments";
import { getBarber } from "@/lib/catalog";

export type CrmAppointment = {
  id: string;
  status: string;
  barberId: string;
  barberName: string;
  serviceIds: string[];
  serviceNames: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  startsAt: string;
  endsAt: string;
  timeLabel?: string;
  dateLabel?: string;
  durationMin: number;
  priceCents: number;
  isWalkIn: boolean;
  notes: string | null;
};

export type ClientServiceStat = { id: string; name: string; count: number };

export type ClientHistoryItem = {
  id: string;
  startsAt: string;
  status: string;
  cancelled: boolean;
  serviceNames: string;
  barberName: string;
  priceCents: number;
  isWalkIn: boolean;
};

export type ClientRecord = {
  key: string;
  firstName: string;
  lastName: string;
  name: string;
  phone: string;
  email: string;
  visitCount: number;
  cancelledCount: number;
  lastVisitAt: string | null;
  lastVisitStatus: string | null;
  nextVisitAt: string | null;
  spendCents: number;
  topService: string | null;
  topBarber: string | null;
  crmNotes: string;
  services: ClientServiceStat[];
  history: ClientHistoryItem[];
};

export type StatsPeriod = "today" | "7d" | "month" | "year" | "all";

export type TimeSeriesPoint = { date: string; count: number; revenueCents: number };

export type ServiceRevenueStat = { id: string; name: string; count: number; revenueCents: number };

export type CrmStats = {
  period: StatsPeriod;
  totalClients: number;
  totalVisits: number;
  cancelledCount: number;
  confirmedCount: number;
  cancelRate: number;
  visitsPerClient: number;
  newClients: number;
  returningClients: number;
  todayAppointments: number;
  upcomingCount: number;
  expectedRevenueCents: number;
  ticketMedioCents: number;
  mostFrequentServices: ClientServiceStat[];
  revenueByService: ServiceRevenueStat[];
  takings: { dayCents: number; weekCents: number; monthCents: number; totalCents: number };
  takingsByBarber: { barberId: string; name: string; cents: number; count: number }[];
  appointmentsOverTime: TimeSeriesPoint[];
  revenueOverTime: TimeSeriesPoint[];
};

export function isPaidStatus(status: string) {
  return status === "confirmed" || status === "walk_in" || status === "completed";
}

export function isCancelledStatus(status: string) {
  return status === "cancelled";
}

export { mondayOfWeek };

export function formatEuroCents(cents: number) {
  return `${(cents / 100).toLocaleString("it-IT")} €`;
}

function digits(phone: string) {
  return phone.replace(/\D/g, "");
}

/** Group key: phone, then email, then unique id for anonymous walk-ins. */
export function clientKey(row: {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}): string {
  const phone = digits(row.phone);
  if (phone.length >= 8) return `p:${phone}`;
  const email = row.email.trim().toLowerCase();
  if (email.includes("@")) return `e:${email}`;
  const name = `${row.firstName} ${row.lastName}`.trim().toLowerCase();
  if (!name || name === "walk-in") return `id:${row.id}`;
  return `n:${name}`;
}

function serviceEntries(row: CrmAppointment): { id: string; name: string }[] {
  const names = row.serviceNames
    .split("+")
    .map((s) => s.trim())
    .filter(Boolean);
  const ids = row.serviceIds || [];
  if (ids.length && names.length) {
    return ids.map((id, i) => ({ id, name: names[i] || id }));
  }
  if (ids.length) return ids.map((id) => ({ id, name: id }));
  return names.map((name) => ({ id: name.toLowerCase(), name }));
}

function bump(map: Map<string, ClientServiceStat>, id: string, name: string) {
  const prev = map.get(id);
  if (prev) prev.count += 1;
  else map.set(id, { id, name, count: 1 });
}

function bumpRevenue(map: Map<string, ServiceRevenueStat>, id: string, name: string, cents: number) {
  const prev = map.get(id);
  if (prev) {
    prev.count += 1;
    prev.revenueCents += cents;
  } else map.set(id, { id, name, count: 1, revenueCents: cents });
}

export function periodBounds(period: StatsPeriod, anchorDate: string): { from: string | null; to: string | null } {
  if (period === "all") return { from: null, to: null };
  if (period === "today") return { from: anchorDate, to: anchorDate };
  if (period === "7d") return { from: addDays(anchorDate, -6), to: anchorDate };
  if (period === "month") return { from: `${anchorDate.slice(0, 7)}-01`, to: anchorDate };
  if (period === "year") return { from: `${anchorDate.slice(0, 4)}-01-01`, to: anchorDate };
  return { from: null, to: null };
}

function inPeriod(wallDay: string, from: string | null, to: string | null) {
  if (!from || !to) return true;
  return wallDay >= from && wallDay <= to;
}

export function aggregateClients(
  rows: CrmAppointment[],
  notesMap: Record<string, string> = {},
): ClientRecord[] {
  const groups = new Map<
    string,
    {
      row: ClientRecord;
      services: Map<string, ClientServiceStat>;
    }
  >();

  const sorted = [...rows].sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  for (const appt of sorted) {
    const key = clientKey({
      id: appt.id,
      firstName: appt.firstName,
      lastName: appt.lastName,
      phone: appt.phone,
      email: appt.email,
    });
    let group = groups.get(key);
    if (!group) {
      group = {
        services: new Map(),
        row: {
          key,
          firstName: appt.firstName,
          lastName: appt.lastName,
          name: `${appt.firstName} ${appt.lastName}`.trim(),
          phone: appt.phone,
          email: appt.email,
          visitCount: 0,
          cancelledCount: 0,
          lastVisitAt: null,
          lastVisitStatus: null,
          nextVisitAt: null,
          spendCents: 0,
          topService: null,
          topBarber: null,
          crmNotes: notesMap[key] || "",
          services: [],
          history: [],
        },
      };
      groups.set(key, group);
    }
    const rec = group.row;
    rec.visitCount += 1;
    if (isCancelledStatus(appt.status)) rec.cancelledCount += 1;
    if (isPaidStatus(appt.status)) rec.spendCents += appt.priceCents;
    rec.lastVisitAt = appt.startsAt;
    rec.lastVisitStatus = appt.status;
    if (appt.firstName && appt.firstName !== "Walk-in") rec.firstName = appt.firstName;
    if (appt.lastName) rec.lastName = appt.lastName;
    rec.name = `${rec.firstName} ${rec.lastName}`.trim();
    if (digits(appt.phone).length >= 8) rec.phone = appt.phone;
    if (appt.email.includes("@")) rec.email = appt.email;
    for (const svc of serviceEntries(appt)) bump(group.services, svc.id, svc.name);
    rec.history.push({
      id: appt.id,
      startsAt: appt.startsAt,
      status: appt.status,
      cancelled: isCancelledStatus(appt.status),
      serviceNames: appt.serviceNames,
      barberName: appt.barberName,
      priceCents: appt.priceCents,
      isWalkIn: appt.isWalkIn,
    });
  }

  // Second pass: next visit + top service/barber
  const nowIso = new Date().toISOString();
  for (const group of groups.values()) {
    const rec = group.row;
    const future = rec.history
      .filter((h) => !h.cancelled && h.startsAt > nowIso)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    rec.nextVisitAt = future[0]?.startsAt || null;
    rec.topService = rec.services[0]?.name || null;
    const barberCounts = new Map<string, number>();
    for (const h of rec.history.filter((x) => !x.cancelled)) {
      barberCounts.set(h.barberName, (barberCounts.get(h.barberName) || 0) + 1);
    }
    rec.topBarber = [...barberCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    rec.crmNotes = notesMap[rec.key] || rec.crmNotes;
  }

  return [...groups.values()]
    .map(({ row, services }) => ({
      ...row,
      services: [...services.values()].sort((a, b) => b.count - a.count),
      history: [...row.history].sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
    }))
    .sort((a, b) => (b.lastVisitAt || "").localeCompare(a.lastVisitAt || ""));
}

export function aggregateStats(
  rows: CrmAppointment[],
  opts: { date: string; period?: StatsPeriod } = { date: formatWallDate(new Date()) },
): CrmStats {
  const date = opts.date;
  const period = opts.period || "all";
  const { from, to } = periodBounds(period, date);
  const weekStart = mondayOfWeek(date);
  const weekEnd = addDays(weekStart, 7);
  const monthStart = `${date.slice(0, 7)}-01`;
  const periodRows = rows.filter((appt) => {
    const wallDay =
      appt.dateLabel && /^\d{4}-\d{2}-\d{2}$/.test(appt.dateLabel)
        ? appt.dateLabel
        : formatWallDate(new Date(appt.startsAt));
    return inPeriod(wallDay, from, to);
  });
  const clients = aggregateClients(rows);
  const periodClients = aggregateClients(periodRows);
  const serviceMap = new Map<string, ClientServiceStat>();
  const revenueMap = new Map<string, ServiceRevenueStat>();
  const barberTakings = new Map<string, { barberId: string; name: string; cents: number; count: number }>();
  let cancelledCount = 0;
  let confirmedCount = 0;
  let dayCents = 0;
  let weekCents = 0;
  let monthCents = 0;
  let totalCents = 0;
  let paidCount = 0;
  const nowIso = new Date().toISOString();
  let todayAppointments = 0;
  let upcomingCount = 0;
  let expectedRevenueCents = 0;
  const seriesMap = new Map<string, TimeSeriesPoint>();

  for (const appt of rows) {
    const wallDay =
      appt.dateLabel && /^\d{4}-\d{2}-\d{2}$/.test(appt.dateLabel)
        ? appt.dateLabel
        : formatWallDate(new Date(appt.startsAt));
    if (wallDay === date && !isCancelledStatus(appt.status)) todayAppointments += 1;
    if (appt.startsAt > nowIso && !isCancelledStatus(appt.status)) {
      upcomingCount += 1;
      if (wallDay === date) expectedRevenueCents += appt.priceCents;
    }
  }

  for (const appt of periodRows) {
    if (isCancelledStatus(appt.status)) cancelledCount += 1;
    else if (appt.status === "confirmed" || appt.status === "pending") confirmedCount += 1;
    for (const svc of serviceEntries(appt)) bump(serviceMap, svc.id, svc.name);
    const wallDay =
      appt.dateLabel && /^\d{4}-\d{2}-\d{2}$/.test(appt.dateLabel)
        ? appt.dateLabel
        : formatWallDate(new Date(appt.startsAt));
    const point = seriesMap.get(wallDay) || { date: wallDay, count: 0, revenueCents: 0 };
    point.count += 1;
    if (isPaidStatus(appt.status)) {
      point.revenueCents += appt.priceCents;
      paidCount += 1;
      for (const svc of serviceEntries(appt)) bumpRevenue(revenueMap, svc.id, svc.name, appt.priceCents);
    }
    seriesMap.set(wallDay, point);
    if (isPaidStatus(appt.status)) {
      if (wallDay === date) dayCents += appt.priceCents;
      if (wallDay >= weekStart && wallDay < weekEnd) weekCents += appt.priceCents;
      if (wallDay >= monthStart && wallDay <= date) monthCents += appt.priceCents;
      totalCents += appt.priceCents;
      const barber = barberTakings.get(appt.barberId) || {
        barberId: appt.barberId,
        name: appt.barberName || getBarber(appt.barberId)?.name || appt.barberId,
        cents: 0,
        count: 0,
      };
      barber.cents += appt.priceCents;
      barber.count += 1;
      barberTakings.set(appt.barberId, barber);
    }
  }

  let newClients = 0;
  let returningClients = 0;
  for (const c of periodClients) {
    const paidVisits = c.history.filter((h) => !h.cancelled).length;
    if (paidVisits <= 1 && c.visitCount <= 1) newClients += 1;
    else if (paidVisits > 1 || c.visitCount > 1) returningClients += 1;
  }

  const totalVisits = periodRows.length;
  const totalClients = periodClients.length;
  const sortedSeries = [...seriesMap.values()].sort((a, b) => a.date.localeCompare(b.date));
  return {
    period,
    totalClients,
    totalVisits,
    cancelledCount,
    confirmedCount,
    cancelRate: totalVisits === 0 ? 0 : cancelledCount / totalVisits,
    visitsPerClient: totalClients === 0 ? 0 : totalVisits / totalClients,
    newClients,
    returningClients,
    todayAppointments,
    upcomingCount,
    expectedRevenueCents,
    ticketMedioCents: paidCount === 0 ? 0 : Math.round(totalCents / paidCount),
    mostFrequentServices: [...serviceMap.values()].sort((a, b) => b.count - a.count).slice(0, 8),
    revenueByService: [...revenueMap.values()].sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 8),
    takings: { dayCents, weekCents, monthCents, totalCents },
    takingsByBarber: [...barberTakings.values()].sort((a, b) => b.cents - a.cents),
    appointmentsOverTime: sortedSeries,
    revenueOverTime: sortedSeries.map((p) => ({ date: p.date, count: p.count, revenueCents: p.revenueCents })),
  };
}

export function emptyCrmStats(date: string): CrmStats {
  return aggregateStats([], { date });
}

export function toCrmAppointment(row: {
  id: string;
  status: string;
  barber_id: string;
  service_ids: string[] | null;
  services_snapshot: unknown;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;
  starts_at: string;
  ends_at: string;
  duration_min: number;
  price_cents: number;
  is_walk_in: boolean;
  notes: string | null;
}): CrmAppointment {
  return {
    id: row.id,
    status: row.status,
    barberId: row.barber_id,
    barberName: getBarber(row.barber_id)?.name || row.barber_id,
    serviceIds: row.service_ids || [],
    serviceNames: namesFromSnapshot(row.services_snapshot),
    firstName: row.customer_first_name,
    lastName: row.customer_last_name,
    phone: row.customer_phone || "",
    email: row.customer_email || "",
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    dateLabel: formatWallDate(new Date(row.starts_at)),
    durationMin: row.duration_min,
    priceCents: row.price_cents,
    isWalkIn: row.is_walk_in,
    notes: row.notes,
  };
}
