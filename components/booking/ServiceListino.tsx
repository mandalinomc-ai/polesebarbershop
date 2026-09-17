"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABEL,
  SERVICES,
  formatDuration,
  formatPriceRange,
  isWhatsAppOnlyService,
  onlineBookableServices,
  type Service,
} from "@/lib/catalog";
import {
  BOOKING_SELECTION_SYNC_EVENT,
  CONSULTATION_SELECTION_SYNC_EVENT,
  getWhatsAppConsulenzaUrl,
} from "@/lib/site-config";

const BOOKING_GO_CALENDAR_EVENT = "polese-booking-go-calendar";

/** Scroll to the wizard (barber/date/time), not the listino above it on mobile. */
function scrollToBookingWizard() {
  const target =
    document.getElementById("booking-wizard") ||
    document.querySelector(".booking-flow-wrap") ||
    document.getElementById("prenota") ||
    document.querySelector(".booking-layout") ||
    document.getElementById("main-content");
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function broadcastOnline(ids: string[]) {
  window.dispatchEvent(new CustomEvent(BOOKING_SELECTION_SYNC_EVENT, { detail: ids }));
}

function broadcastConsult(ids: string[]) {
  window.dispatchEvent(
    new CustomEvent(CONSULTATION_SELECTION_SYNC_EVENT, { detail: { ids } }),
  );
}

function ListinoSection({
  title,
  eyebrow,
  services,
  selectedIds,
  mode,
  onToggle,
}: {
  title: string;
  eyebrow: string;
  services: Service[];
  selectedIds: string[];
  mode: "online" | "consultation";
  onToggle: (id: string) => void;
}) {
  if (!services.length) return null;
  return (
    <div className="booking-listino-section">
      <p className="booking-listino-eyebrow">{eyebrow}</p>
      <h3 className="booking-listino-title font-serif">{title}</h3>
      {SERVICE_CATEGORIES.map((cat) => {
        const rows = services.filter((s) => s.category === cat);
        if (!rows.length) return null;
        return (
          <div key={cat} className="booking-listino-group">
            <p className="booking-listino-cat">{SERVICE_CATEGORY_LABEL[cat]}</p>
            <ul className="listino-boxes">
              {rows.map((s) => {
                const selected = selectedIds.includes(s.id);
                return (
                  <li key={s.id}>
                    <article
                      className={`listino-box tilt-3d${selected ? " listino-box--selected" : ""}${mode === "consultation" ? " listino-box--wa" : ""}`}
                      data-selected={selected ? "true" : "false"}
                      aria-current={selected ? "true" : undefined}
                    >
                      <div className="listino-box-head">
                        <h4 className="listino-box-name">{s.name}</h4>
                        <span className="listino-box-price">{formatPriceRange(s)}</span>
                      </div>
                      {s.description ? (
                        <p className="listino-box-desc">{s.description}</p>
                      ) : null}
                      <div className="listino-box-foot">
                        <span className="listino-box-duration">{formatDuration(s)}</span>
                        <button
                          type="button"
                          className={`btn btn-listino-prenota${mode === "consultation" ? " btn-listino-wa" : ""}${selected ? " is-selected" : ""}`}
                          aria-pressed={selected}
                          onClick={() => onToggle(s.id)}
                        >
                          {mode === "consultation"
                            ? selected
                              ? "In carrello consulenza"
                              : "Aggiungi consulenza"
                            : selected
                              ? "Nel carrello"
                              : "Prenota ora"}
                        </button>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Dual listino + magnetic carts.
 * Calendario: Taglio Standard, Barba Standard, Barba Pro, Acconciatura.
 * Consulenza WhatsApp: Taglio Pro, Bambino, colore/meches/tinture.
 */
export function ServiceListino() {
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const [consultIds, setConsultIds] = useState<string[]>([]);

  useEffect(() => {
    const onOnline = (event: Event) => {
      const ids = (event as CustomEvent<string[]>).detail;
      if (Array.isArray(ids)) {
        setOnlineIds(ids.filter((id) => !isWhatsAppOnlyService(id)));
      }
    };
    const onConsult = (event: Event) => {
      const detail = (event as CustomEvent<{ ids?: string[] }>).detail;
      if (Array.isArray(detail?.ids)) {
        setConsultIds(detail.ids.filter(isWhatsAppOnlyService));
      }
    };
    window.addEventListener(BOOKING_SELECTION_SYNC_EVENT, onOnline);
    window.addEventListener(CONSULTATION_SELECTION_SYNC_EVENT, onConsult);
    return () => {
      window.removeEventListener(BOOKING_SELECTION_SYNC_EVENT, onOnline);
      window.removeEventListener(CONSULTATION_SELECTION_SYNC_EVENT, onConsult);
    };
  }, []);

  const toggleOnline = useCallback((id: string) => {
    if (isWhatsAppOnlyService(id)) return;
    setOnlineIds((curr) => {
      const adding = !curr.includes(id);
      const next = adding ? [...curr, id] : curr.filter((x) => x !== id);
      queueMicrotask(() => {
        broadcastOnline(next);
        const url = new URL(window.location.href);
        if (next[0]) url.searchParams.set("servizio", next[0]!);
        else url.searchParams.delete("servizio");
        url.hash = "prenota";
        window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
        if (adding && next.length) {
          window.dispatchEvent(
            new CustomEvent(BOOKING_GO_CALENDAR_EVENT, { detail: { ids: next } }),
          );
          scrollToBookingWizard();
        }
      });
      return next;
    });
  }, []);

  const toggleConsult = useCallback((id: string) => {
    if (!isWhatsAppOnlyService(id)) return;
    setConsultIds((curr) => {
      const next = curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id];
      queueMicrotask(() => broadcastConsult(next));
      return next;
    });
  }, []);

  const online = useMemo(() => onlineBookableServices(), []);
  const consultation = useMemo(
    () => SERVICES.filter((s) => s.active !== false && Boolean(s.whatsAppOnly)),
    [],
  );

  return (
    <div className="booking-listino" id="listino">
      <ListinoSection
        title="Listino prenota ora"
        eyebrow="Calendario online"
        services={online}
        selectedIds={onlineIds}
        mode="online"
        onToggle={toggleOnline}
      />
      <ListinoSection
        title="Listino consulenza"
        eyebrow="WhatsApp · tempi valutati in salone"
        services={consultation}
        selectedIds={consultIds}
        mode="consultation"
        onToggle={toggleConsult}
      />
    </div>
  );
}

/** Fixed dock: both mini-carts stack without overlapping FABs or each other. */
export function MiniCartDock() {
  return (
    <div className="booking-mini-cart-dock" aria-live="polite">
      <BookingMiniCart />
      <ConsultationMiniCart />
    </div>
  );
}

/** Magnetic cart — calendar booking. Parks (collapsed) when entering the wizard. */
export function BookingMiniCart() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [riseKey, setRiseKey] = useState(0);
  const parkedRef = useRef(false);

  useEffect(() => {
    const onSync = (event: Event) => {
      const ids = (event as CustomEvent<string[]>).detail;
      if (!Array.isArray(ids)) return;
      const next = ids.filter((id) => !isWhatsAppOnlyService(id));
      setSelectedIds(next);
      if (!next.length) {
        parkedRef.current = false;
        setOpen(false);
        return;
      }
      // Stay parked after «Prenota sul calendario» — sync echo must not reopen the panel.
      if (parkedRef.current) {
        setOpen(false);
        return;
      }
      setOpen(true);
      setRiseKey((k) => k + 1);
    };
    const onGoCalendar = () => {
      parkedRef.current = true;
      setOpen(false);
    };
    window.addEventListener(BOOKING_SELECTION_SYNC_EVENT, onSync);
    window.addEventListener(BOOKING_GO_CALENDAR_EVENT, onGoCalendar);
    return () => {
      window.removeEventListener(BOOKING_SELECTION_SYNC_EVENT, onSync);
      window.removeEventListener(BOOKING_GO_CALENDAR_EVENT, onGoCalendar);
    };
  }, []);

  const items = useMemo(
    () => SERVICES.filter((s) => selectedIds.includes(s.id) && !s.whatsAppOnly),
    [selectedIds],
  );
  const subtotal = items.reduce((sum, s) => sum + s.priceEuro, 0);
  if (!items.length) return null;

  function goBook() {
    parkedRef.current = true;
    setOpen(false);
    window.dispatchEvent(
      new CustomEvent(BOOKING_GO_CALENDAR_EVENT, { detail: { ids: selectedIds } }),
    );
    scrollToBookingWizard();
  }

  function remove(id: string) {
    const next = selectedIds.filter((x) => x !== id);
    setSelectedIds(next);
    broadcastOnline(next);
  }

  return (
    <div
      key={riseKey}
      className={`booking-mini-cart booking-mini-cart--online${open ? " is-open" : ""} is-rise`}
      role="complementary"
      aria-label="Anteprima carrello prenotazione"
    >
      <button
        type="button"
        className="booking-mini-cart-toggle"
        onClick={() => {
          setOpen((v) => {
            const next = !v;
            if (next) parkedRef.current = false;
            return next;
          });
        }}
        aria-expanded={open}
      >
        <span>
          {items.length} {items.length === 1 ? "servizio" : "servizi"}
        </span>
        <strong>{subtotal} €</strong>
      </button>
      {open ? (
        <div className="booking-mini-cart-panel" role="dialog" aria-label="Carrello prenotazione">
          <header>
            <h3 className="font-serif">Il tuo carrello</h3>
            <button type="button" className="btn btn-outline" onClick={() => setOpen(false)}>
              Chiudi
            </button>
          </header>
          <ul>
            {items.map((s) => (
              <li key={s.id}>
                <span>
                  {s.name}
                  <small> · {formatDuration(s)}</small>
                </span>
                <span className="booking-mini-cart-row-actions">
                  <em>{formatPriceRange(s)}</em>
                  <button type="button" className="btn btn-ghost" onClick={() => remove(s.id)} aria-label={`Rimuovi ${s.name}`}>
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <p className="booking-mini-cart-sub">
            Subtotale <strong>{subtotal} €</strong>
          </p>
          <p className="booking-mini-cart-hint">
            Puoi aggiungere altri trattamenti compatibili dal listino, poi prenota sul calendario.
          </p>
          <button type="button" className="btn btn-gold" onClick={goBook}>
            Prenota sul calendario
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Magnetic cart — WhatsApp consulenza only. */
export function ConsultationMiniCart() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [riseKey, setRiseKey] = useState(0);

  useEffect(() => {
    const onSync = (event: Event) => {
      const detail = (event as CustomEvent<{ ids?: string[] }>).detail;
      if (!Array.isArray(detail?.ids)) return;
      const next = detail.ids.filter(isWhatsAppOnlyService);
      setSelectedIds(next);
      if (next.length) {
        setOpen(true);
        setRiseKey((k) => k + 1);
      } else {
        setOpen(false);
      }
    };
    window.addEventListener(CONSULTATION_SELECTION_SYNC_EVENT, onSync);
    return () => window.removeEventListener(CONSULTATION_SELECTION_SYNC_EVENT, onSync);
  }, []);

  const items = useMemo(
    () => SERVICES.filter((s) => selectedIds.includes(s.id) && s.whatsAppOnly),
    [selectedIds],
  );
  if (!items.length) return null;

  const names = items.map((s) => s.name);
  const waHref = getWhatsAppConsulenzaUrl(names.join(" + "));

  function remove(id: string) {
    const next = selectedIds.filter((x) => x !== id);
    setSelectedIds(next);
    broadcastConsult(next);
  }

  function clear() {
    setSelectedIds([]);
    setOpen(false);
    broadcastConsult([]);
  }

  return (
    <div
      key={riseKey}
      className="booking-mini-cart booking-mini-cart--consult is-open is-rise"
      role="complementary"
      aria-label="Anteprima carrello consulenza"
    >
      <button
        type="button"
        className="booking-mini-cart-toggle booking-mini-cart-toggle--wa"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>
          {items.length} consulenza
        </span>
        <strong>WhatsApp</strong>
      </button>
      {open ? (
        <div className="booking-mini-cart-panel" role="dialog" aria-label="Carrello consulenza">
          <header>
            <h3 className="font-serif">Consulenza in sede</h3>
            <button type="button" className="btn btn-outline" onClick={() => setOpen(false)}>
              Chiudi
            </button>
          </header>
          <ul>
            {items.map((s) => (
              <li key={s.id}>
                <span>{s.name}</span>
                <button type="button" className="btn btn-ghost" aria-label={`Rimuovi ${s.name}`} onClick={() => remove(s.id)}>
                  ×
                </button>
              </li>
            ))}
          </ul>
          <p className="booking-mini-cart-hint">
            Messaggio: «Salve vorrei una consulenza per {names.join(" + ")}»
          </p>
          <a
            href={waHref}
            className="btn btn-listino-wa"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => clear()}
          >
            Invia su WhatsApp
          </a>
        </div>
      ) : null}
    </div>
  );
}

/** @deprecated */
export function listinoServiceHref(id: string) {
  return `/#prenota?servizio=${encodeURIComponent(id)}`;
}
