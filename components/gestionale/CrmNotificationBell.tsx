"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Bell, X } from "lucide-react";
import {
  isBellSeeded,
  loadSeenIds,
  markBellSeeded,
  mergeSeenIds,
  saveSeenIds,
  seedSeenIds,
  unreadNotifications,
  type CrmNotification,
} from "@/lib/crm-notifications";

export function CrmNotificationBell({
  reloadToken,
  onOpenAppointment,
}: {
  reloadToken: number;
  onOpenAppointment: (date: string) => void;
}) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CrmNotification[]>([]);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSeenIds(loadSeenIds());
    setReady(true);
  }, []);

  const persistSeen = useCallback((ids: string[]) => {
    setSeenIds(ids);
    saveSeenIds(ids);
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications", { cache: "no-store" });
      if (res.status === 401) return;
      const json = (await res.json()) as { notifications?: CrmNotification[] };
      const next = Array.isArray(json.notifications) ? json.notifications : [];
      setItems(next);
      if (!isBellSeeded()) {
        const seeded = mergeSeenIds(loadSeenIds(), seedSeenIds(next));
        persistSeen(seeded);
        markBellSeeded();
      }
    } catch {
      /* keep last list */
    }
  }, [persistSeen]);

  useEffect(() => {
    if (!ready) return;
    void loadNotifications();
  }, [ready, reloadToken, loadNotifications]);

  useEffect(() => {
    if (!ready) return;
    const tick = () => void loadNotifications();
    const id = window.setInterval(tick, 15_000);
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ready, loadNotifications]);

  const unread = useMemo(() => unreadNotifications(items, seenIds), [items, seenIds]);
  const unreadCount = unread.length;

  const closeAndMarkRead = useCallback(() => {
    setOpen(false);
    persistSeen(mergeSeenIds(seenIds, items.map((n) => n.id)));
  }, [items, persistSeen, seenIds]);

  const toggle = useCallback(() => {
    setOpen((was) => {
      if (was) {
        persistSeen(mergeSeenIds(seenIds, items.map((n) => n.id)));
        return false;
      }
      return true;
    });
  }, [items, persistSeen, seenIds]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAndMarkRead();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closeAndMarkRead]);

  return (
    <div className="crm-bell-wrap">
      <button
        type="button"
        className={`crm-bell-btn${unreadCount > 0 ? " has-unread" : ""}`}
        aria-label={unreadCount > 0 ? `Notifiche, ${unreadCount} non lette` : "Notifiche"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        <Bell size={18} aria-hidden />
        {unreadCount > 0 ? (
          <span className="crm-bell-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
        ) : null}
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="crm-bell-overlay"
            aria-label="Chiudi notifiche"
            onClick={closeAndMarkRead}
          />
          <div className="crm-bell-panel" id={panelId} role="dialog" aria-label="Notifiche prenotazioni">
            <header className="crm-bell-head">
              <strong>Notifiche</strong>
              <button type="button" className="crm-icon-btn" onClick={closeAndMarkRead} aria-label="Chiudi">
                <X size={16} />
              </button>
            </header>
            {items.length === 0 ? (
              <p className="slot-status">Nessuna prenotazione recente.</p>
            ) : (
              <ul className="crm-bell-list">
                {items.map((n) => {
                  const isUnread = unread.some((u) => u.id === n.id);
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        className={isUnread ? "is-unread" : ""}
                        onClick={() => {
                          persistSeen(mergeSeenIds(seenIds, [n.id]));
                          onOpenAppointment(n.date);
                          setOpen(false);
                        }}
                      >
                        <strong>{n.title}</strong>
                        <span>{n.body}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
