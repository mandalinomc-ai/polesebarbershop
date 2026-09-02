"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BOOKING_POLL_MS,
  formatNewBookingToast,
  readLastSeenAt,
  requestBrowserNotifyPermission,
  showBrowserBookingNotification,
  writeLastSeenAt,
  type RecentBooking,
} from "@/lib/booking-notifications";

type Options = {
  enabled: boolean;
  onOpenBooking: (booking: RecentBooking, openWhatsApp?: boolean) => void;
};

export function useBookingNotifications({ enabled, onOpenBooking }: Options) {
  const [unread, setUnread] = useState<RecentBooking[]>([]);
  const [toasts, setToasts] = useState<RecentBooking[]>([]);
  const notifiedRef = useRef(new Set<string>());
  const lastSeenRef = useRef<string>("");

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const markRead = useCallback((id: string) => {
    setUnread((prev) => {
      const hit = prev.find((b) => b.id === id);
      if (hit && hit.createdAt > lastSeenRef.current) {
        lastSeenRef.current = hit.createdAt;
        writeLastSeenAt(hit.createdAt);
      }
      return prev.filter((b) => b.id !== id);
    });
    dismissToast(id);
  }, [dismissToast]);

  const markAllRead = useCallback(() => {
    setUnread([]);
    setToasts([]);
    const now = new Date().toISOString();
    lastSeenRef.current = now;
    writeLastSeenAt(now);
  }, []);

  const openBooking = useCallback(
    (booking: RecentBooking, openWhatsApp?: boolean) => {
      markRead(booking.id);
      onOpenBooking(booking, openWhatsApp);
    },
    [markRead, onOpenBooking],
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
      setUnread((prev) => {
        const ids = new Set(prev.map((x) => x.id));
        return [...fresh.filter((b) => !ids.has(b.id)), ...prev];
      });
      setToasts((prev) => {
        const ids = new Set(prev.map((x) => x.id));
        return [...fresh.filter((b) => !ids.has(b.id)), ...prev].slice(0, 5);
      });

      for (const b of fresh) {
        showBrowserBookingNotification(b, () => openBooking(b));
      }
    } catch {
      /* ignore transient network errors */
    }
  }, [enabled, openBooking]);

  useEffect(() => {
    if (!enabled) return;
    lastSeenRef.current = readLastSeenAt();
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
  }, [enabled, poll]);

  return {
    unreadCount: unread.length,
    toasts,
    dismissToast,
    markRead,
    markAllRead,
    openBooking,
    formatToast: formatNewBookingToast,
  };
}
