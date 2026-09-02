"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BOOKING_POLL_MS,
  formatNewBookingToast,
  isBookingHandled,
  pruneBookingStates,
  readBookingStates,
  readLastSeenAt,
  requestBrowserNotifyPermission,
  showBrowserBookingNotification,
  writeBookingState,
  writeLastSeenAt,
  type BookingNotifyState,
  type RecentBooking,
} from "@/lib/booking-notifications";

type Options = {
  enabled: boolean;
  onOpenBooking: (booking: RecentBooking, openWhatsApp?: boolean) => void;
};

export function useBookingNotifications({ enabled, onOpenBooking }: Options) {
  const [bookings, setBookings] = useState<RecentBooking[]>([]);
  const [states, setStates] = useState<Record<string, BookingNotifyState>>({});
  const [toasts, setToasts] = useState<RecentBooking[]>([]);
  const notifiedRef = useRef(new Set<string>());
  const lastSeenRef = useRef<string>("");

  const refreshStates = useCallback(() => {
    setStates(readBookingStates());
  }, []);

  const patchState = useCallback(
    (id: string, patch: Partial<BookingNotifyState>) => {
      writeBookingState(id, patch);
      setStates((prev) => {
        const next = { ...(prev[id] || { seen: false, whatsappSent: false }), ...patch };
        return { ...prev, [id]: next };
      });
    },
    [],
  );

  const unhandled = useMemo(
    () => bookings.filter((b) => !isBookingHandled(states[b.id])),
    [bookings, states],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const markSeen = useCallback(
    (id: string) => {
      patchState(id, { seen: true });
      const hit = bookings.find((b) => b.id === id);
      if (hit && hit.createdAt > lastSeenRef.current) {
        lastSeenRef.current = hit.createdAt;
        writeLastSeenAt(hit.createdAt);
      }
    },
    [bookings, patchState],
  );

  const markWhatsAppSent = useCallback(
    (id: string) => {
      patchState(id, { whatsappSent: true });
    },
    [patchState],
  );

  const markRead = useCallback(
    (id: string) => {
      markSeen(id);
      dismissToast(id);
    },
    [dismissToast, markSeen],
  );

  const markAllHandled = useCallback(() => {
    for (const b of unhandled) {
      writeBookingState(b.id, { seen: true, whatsappSent: true });
    }
    refreshStates();
    setToasts([]);
    const now = new Date().toISOString();
    lastSeenRef.current = now;
    writeLastSeenAt(now);
  }, [refreshStates, unhandled]);

  const openBooking = useCallback(
    (booking: RecentBooking, openWhatsApp?: boolean) => {
      markSeen(booking.id);
      if (openWhatsApp) markWhatsAppSent(booking.id);
      dismissToast(booking.id);
      onOpenBooking(booking, openWhatsApp);
    },
    [dismissToast, markSeen, markWhatsAppSent, onOpenBooking],
  );

  const sendWhatsApp = useCallback(
    (booking: RecentBooking) => {
      markSeen(booking.id);
      markWhatsAppSent(booking.id);
      dismissToast(booking.id);
      onOpenBooking(booking, true);
    },
    [dismissToast, markSeen, markWhatsAppSent, onOpenBooking],
  );

  const poll = useCallback(async () => {
    if (!enabled) return;
    const since = lastSeenRef.current || readLastSeenAt();
    try {
      const res = await fetch(`/api/admin/recent-bookings?since=${encodeURIComponent(since)}`);
      if (res.status === 401) return;
      const json = (await res.json()) as { bookings?: RecentBooking[] };
      const incoming = json.bookings || [];
      const fresh = incoming.filter((b) => !notifiedRef.current.has(b.id));
      if (fresh.length === 0) return;

      for (const b of fresh) notifiedRef.current.add(b.id);
      setBookings((prev) => {
        const ids = new Set(prev.map((x) => x.id));
        return [...fresh.filter((b) => !ids.has(b.id)), ...prev];
      });
      setToasts((prev) => {
        const ids = new Set(prev.map((x) => x.id));
        const next = [...fresh.filter((b) => !ids.has(b.id)), ...prev].slice(0, 5);
        return next.filter((b) => !isBookingHandled(readBookingStates()[b.id]));
      });

      for (const b of fresh) {
        if (isBookingHandled(readBookingStates()[b.id])) continue;
        showBrowserBookingNotification(b, () => openBooking(b));
      }
    } catch {
      /* ignore transient network errors */
    }
  }, [enabled, openBooking]);

  useEffect(() => {
    if (!enabled) return;
    lastSeenRef.current = readLastSeenAt();
    refreshStates();
    void requestBrowserNotifyPermission();
    void poll();
    const id = window.setInterval(() => void poll(), BOOKING_POLL_MS);
    const onFocus = () => void poll();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [enabled, poll, refreshStates]);

  useEffect(() => {
    if (bookings.length === 0) return;
    pruneBookingStates(new Set(bookings.map((b) => b.id)));
  }, [bookings, states]);

  return {
    unhandled,
    unhandledCount: unhandled.length,
    unreadCount: unhandled.length,
    toasts,
    dismissToast,
    markSeen,
    markWhatsAppSent,
    markRead,
    markAllHandled,
    markAllRead: markAllHandled,
    openBooking,
    sendWhatsApp,
    formatToast: formatNewBookingToast,
    isHandled: (id: string) => isBookingHandled(states[id]),
  };
}
