import { formatWallDate, formatWallTime } from "@/lib/availability";
import { namesFromSnapshot } from "@/lib/appointments";
import { getBarber } from "@/lib/catalog";
import type { AppointmentRow } from "@/lib/supabase";

export const CRM_BELL_SEEN_KEY = "fp-gestionale-bell-seen-v1";
export const CRM_BELL_SEEDED_KEY = "fp-gestionale-bell-seeded-v1";
/** Appointments newer than this stay unread until the panel is opened (first visit). */
export const CRM_BELL_RECENT_MS = 72 * 60 * 60 * 1000;

export type CrmNotificationType = "booking" | "walk_in" | "cancelled";

export type CrmNotification = {
  id: string;
  appointmentId: string;
  type: CrmNotificationType;
  title: string;
  body: string;
  createdAt: string;
  date: string;
};

export function notificationFromAppointment(row: AppointmentRow): CrmNotification {
  const name = `${row.customer_first_name} ${row.customer_last_name}`.trim() || "Cliente";
  const services = namesFromSnapshot(row.services_snapshot) || "Servizio";
  const barber = getBarber(row.barber_id)?.name || row.barber_id;
  const start = new Date(row.starts_at);
  const date = formatWallDate(start);
  const when = `${date} ${formatWallTime(start)}`;
  const body = `${name} · ${services} · ${barber} · ${when}`;

  if (row.status === "cancelled") {
    return {
      id: `${row.id}:cancelled`,
      appointmentId: row.id,
      type: "cancelled",
      title: "Prenotazione annullata",
      body,
      createdAt: row.cancelled_at || row.updated_at || row.created_at,
      date,
    };
  }
  if (row.is_walk_in || row.source === "walk_in") {
    return {
      id: `${row.id}:walk_in`,
      appointmentId: row.id,
      type: "walk_in",
      title: "Walk-in in agenda",
      body,
      createdAt: row.created_at || row.starts_at,
      date,
    };
  }
  return {
    id: `${row.id}:booking`,
    appointmentId: row.id,
    type: "booking",
    title: "Nuova prenotazione",
    body,
    createdAt: row.created_at || row.starts_at,
    date,
  };
}

export function unreadNotifications(items: CrmNotification[], seenIds: Iterable<string>): CrmNotification[] {
  const seen = new Set(seenIds);
  return items.filter((n) => !seen.has(n.id));
}

/** On first visit, mark older items seen so only recent arrivals light the bell. */
export function seedSeenIds(
  items: CrmNotification[],
  nowMs = Date.now(),
  recentMs = CRM_BELL_RECENT_MS,
): string[] {
  return items.filter((n) => {
    const t = Date.parse(n.createdAt);
    if (Number.isNaN(t)) return true;
    return nowMs - t > recentMs;
  }).map((n) => n.id);
}

export function mergeSeenIds(existing: Iterable<string>, extra: Iterable<string>): string[] {
  return [...new Set([...existing, ...extra])];
}

export function loadSeenIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CRM_BELL_SEEN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function saveSeenIds(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CRM_BELL_SEEN_KEY, JSON.stringify(ids.slice(-400)));
  } catch {
    /* ignore quota */
  }
}

export function isBellSeeded(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(CRM_BELL_SEEDED_KEY) === "1";
  } catch {
    return true;
  }
}

export function markBellSeeded() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CRM_BELL_SEEDED_KEY, "1");
  } catch {
    /* ignore */
  }
}
