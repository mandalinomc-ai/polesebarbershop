import { formatItalianDate, formatWallDate, formatWallTime } from "@/lib/availability";
import type { ClientRecord } from "@/lib/crm";
import { buildNotifyCopy, waMeUrl } from "@/lib/crm-notify";

export type RecentBooking = {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  startsAt: string;
  timeLabel: string;
  dateLabel: string;
  serviceNames: string;
  barberName: string;
  createdAt: string;
};

export const BOOKING_NOTIFY_STORAGE_KEY = "polese_gestionale_last_seen_at";
export const BOOKING_STATE_STORAGE_KEY = "polese_gestionale_booking_states";
export const BOOKING_POLL_MS = 45_000;

export type BookingNotifyState = {
  seen: boolean;
  whatsappSent: boolean;
};

export function isBookingHandled(state: BookingNotifyState | undefined): boolean {
  return Boolean(state?.seen && state?.whatsappSent);
}

export function readBookingStates(): Record<string, BookingNotifyState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(BOOKING_STATE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Partial<BookingNotifyState>>;
    const out: Record<string, BookingNotifyState> = {};
    for (const [id, v] of Object.entries(parsed)) {
      if (v && typeof v === "object") {
        out[id] = { seen: Boolean(v.seen), whatsappSent: Boolean(v.whatsappSent) };
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function writeBookingState(id: string, patch: Partial<BookingNotifyState>) {
  if (typeof window === "undefined") return;
  try {
    const all = readBookingStates();
    const prev = all[id] || { seen: false, whatsappSent: false };
    all[id] = { ...prev, ...patch };
    localStorage.setItem(BOOKING_STATE_STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export function pruneBookingStates(activeIds: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    const all = readBookingStates();
    let changed = false;
    for (const id of Object.keys(all)) {
      if (!activeIds.has(id) && isBookingHandled(all[id])) {
        delete all[id];
        changed = true;
      }
    }
    if (changed) localStorage.setItem(BOOKING_STATE_STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export function formatNewBookingToast(b: RecentBooking): string {
  const name = `${b.firstName} ${b.lastName}`.trim() || "Cliente";
  const when = [b.dateLabel, b.timeLabel ? `alle ${b.timeLabel}` : ""].filter(Boolean).join(" ");
  return `Nuova prenotazione: ${name} — ${when}`;
}

export function bookingAgendaDate(b: RecentBooking): string {
  return formatWallDate(new Date(b.startsAt));
}

export function newBookingWhatsAppUrl(b: RecentBooking): string | null {
  const copy = buildNotifyCopy("reminder", {
    firstName: b.firstName,
    dateLabel: b.dateLabel || formatItalianDate(bookingAgendaDate(b)),
    timeLabel: b.timeLabel || formatWallTime(new Date(b.startsAt)),
    serviceNames: b.serviceNames,
    barberName: b.barberName,
  });
  return waMeUrl(b.phone || "", copy.text);
}

export function clientReminderWhatsAppUrl(
  client: Pick<ClientRecord, "firstName" | "phone" | "nextVisitAt" | "history">,
): string | null {
  const nowIso = new Date().toISOString();
  const upcoming = client.history
    .filter((h) => !h.cancelled && h.startsAt > nowIso)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
  const startsAt = upcoming?.startsAt || client.nextVisitAt;
  const dateLabel = startsAt ? formatItalianDate(formatWallDate(new Date(startsAt))) : undefined;
  const timeLabel = startsAt ? formatWallTime(new Date(startsAt)) : undefined;
  const copy = buildNotifyCopy("reminder", {
    firstName: client.firstName,
    dateLabel,
    timeLabel,
    serviceNames: upcoming?.serviceNames,
    barberName: upcoming?.barberName,
  });
  return waMeUrl(client.phone, copy.text);
}

export function readLastSeenAt(): string {
  if (typeof window === "undefined") return new Date().toISOString();
  try {
    const stored = localStorage.getItem(BOOKING_NOTIFY_STORAGE_KEY);
    if (stored && !Number.isNaN(Date.parse(stored))) return stored;
  } catch {
    /* ignore */
  }
  return new Date().toISOString();
}

export function writeLastSeenAt(iso: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BOOKING_NOTIFY_STORAGE_KEY, iso);
  } catch {
    /* ignore */
  }
}

export async function requestBrowserNotifyPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function showBrowserBookingNotification(
  booking: RecentBooking,
  onClick?: () => void,
): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;
  try {
    const n = new Notification("Nuova prenotazione", {
      body: formatNewBookingToast(booking),
      tag: `booking-${booking.id}`,
      icon: "/favicon.ico",
    });
    if (onClick) {
      n.onclick = () => {
        window.focus();
        onClick();
        n.close();
      };
    }
    return true;
  } catch {
    return false;
  }
}
