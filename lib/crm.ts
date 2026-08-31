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
  spendCents: number;
  services: ClientServiceStat[];
  history: ClientHistoryItem[];
};

export type CrmStats = {
  totalClients: number;
  totalVisits: number;
  cancelledCount: number;
  cancelRate: number;
  visitsPerClient: number;
  mostFrequentServices: ClientServiceStat[];
  takings: { dayCents: number; weekCents: number };
  takingsByBarber: { barberId: string; name: string; cents: number }[];
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

export function aggregateClients(rows: CrmAppointment[]): ClientRecord[] {
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
          spendCents: 0,
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
  opts: { date: string } = { date: formatWallDate(new Date()) },
): CrmStats {
  const date = opts.date;
  const weekStart = mondayOfWeek(date);
  const weekEnd = addDays(weekStart, 7);
  const clients = aggregateClients(rows);
  const serviceMap = new Map<string, ClientServiceStat>();
  const barberTakings = new Map<string, { barberId: string; name: string; cents: number }>();
  let cancelledCount = 0;
  let dayCents = 0;
  let weekCents = 0;

  for (const appt of rows) {
    if (isCancelledStatus(appt.status)) cancelledCount += 1;
    for (const svc of serviceEntries(appt)) bump(serviceMap, svc.id, svc.name);
    const wallDay = appt.dateLabel && /^\d{4}-\d{2}-\d{2}$/.test(appt.dateLabel)
      ? appt.dateLabel
      : formatWallDate(new Date(appt.startsAt));
    if (isPaidStatus(appt.status)) {
      if (wallDay === date) dayCents += appt.priceCents;
      if (wallDay >= weekStart && wallDay < weekEnd) weekCents += appt.priceCents;
      const barber = barberTakings.get(appt.barberId) || {
        barberId: appt.barberId,
        name: appt.barberName || getBarber(appt.barberId)?.name || appt.barberId,
        cents: 0,
      };
      barber.cents += appt.priceCents;
      barberTakings.set(appt.barberId, barber);
    }
  }

  const totalVisits = rows.length;
  const totalClients = clients.length;
  return {
    totalClients,
    totalVisits,
    cancelledCount,
    cancelRate: totalVisits === 0 ? 0 : cancelledCount / totalVisits,
    visitsPerClient: totalClients === 0 ? 0 : totalVisits / totalClients,
    mostFrequentServices: [...serviceMap.values()].sort((a, b) => b.count - a.count).slice(0, 8),
    takings: { dayCents, weekCents },
    takingsByBarber: [...barberTakings.values()].sort((a, b) => b.cents - a.cents),
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
