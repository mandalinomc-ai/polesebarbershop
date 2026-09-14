"use client";

import { useEffect, useMemo, useState } from "react";
import {
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABEL,
  SERVICES,
  formatDuration,
  formatPriceRange,
  isWhatsAppOnlyService,
} from "@/lib/catalog";
import {
  BOOKING_SELECTION_SYNC_EVENT,
  BOOKING_SERVICE_EVENT,
  getWhatsAppConsulenzaUrl,
  serviceBookingHref,
} from "@/lib/site-config";

function prenotaFromListino(serviceId: string) {
  window.dispatchEvent(
    new CustomEvent(BOOKING_SERVICE_EVENT, { detail: serviceId }),
  );
  const url = new URL(window.location.href);
  url.searchParams.set("servizio", serviceId);
  url.hash = "prenota";
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  document.getElementById("prenota")?.scrollIntoView({ behavior: "smooth" });
}

/** Official listino — price boxes; WA-only services open consulenza chat. */
export function ServiceListino() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const onSync = (event: Event) => {
      const ids = (event as CustomEvent<string[]>).detail;
      if (Array.isArray(ids)) setSelectedIds(ids);
    };
    window.addEventListener(BOOKING_SELECTION_SYNC_EVENT, onSync);
    return () => window.removeEventListener(BOOKING_SELECTION_SYNC_EVENT, onSync);
  }, []);

  return (
    <div className="booking-listino" id="listino">
      <h3 className="booking-listino-title font-serif">Listino</h3>
      {SERVICE_CATEGORIES.map((cat) => (
        <div key={cat} className="booking-listino-group">
          <p className="booking-listino-cat">{SERVICE_CATEGORY_LABEL[cat]}</p>
          <ul className="listino-boxes">
            {SERVICES.filter((s) => s.category === cat).map((s) => {
              const selected = selectedIds.includes(s.id);
              const waOnly = isWhatsAppOnlyService(s.id) || Boolean(s.whatsAppOnly);
              return (
                <li key={s.id}>
                  <article
                    className={`listino-box tilt-3d${selected && !waOnly ? " listino-box--selected" : ""}${waOnly ? " listino-box--wa" : ""}`}
                    data-selected={selected && !waOnly ? "true" : "false"}
                    aria-current={selected && !waOnly ? "true" : undefined}
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
                      {waOnly ? (
                        <a
                          href={getWhatsAppConsulenzaUrl(s.name)}
                          className="btn btn-listino-prenota btn-listino-wa"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Consulenza WhatsApp
                        </a>
                      ) : (
                        <a
                          href={serviceBookingHref(s.id)}
                          className={`btn btn-listino-prenota${selected ? " is-selected" : ""}`}
                          aria-pressed={selected}
                          onClick={(event) => {
                            event.preventDefault();
                            prenotaFromListino(s.id);
                          }}
                        >
                          {selected ? "Selezionato" : "Prenota"}
                        </a>
                      )}
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Shein-style mini cart — bottom-right, live sync with selection. */
export function BookingMiniCart() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onSync = (event: Event) => {
      const ids = (event as CustomEvent<string[]>).detail;
      if (Array.isArray(ids)) {
        setSelectedIds(ids.filter((id) => !isWhatsAppOnlyService(id)));
        if (ids.length) setOpen(true);
      }
    };
    window.addEventListener(BOOKING_SELECTION_SYNC_EVENT, onSync);
    return () => window.removeEventListener(BOOKING_SELECTION_SYNC_EVENT, onSync);
  }, []);

  const items = useMemo(
    () => SERVICES.filter((s) => selectedIds.includes(s.id) && !s.whatsAppOnly),
    [selectedIds],
  );
  const subtotal = items.reduce((sum, s) => sum + s.priceEuro, 0);
  if (!items.length) return null;

  return (
    <div className={`booking-mini-cart${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="booking-mini-cart-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{items.length} servizi</span>
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
                <span>{s.name}</span>
                <em>{formatPriceRange(s)}</em>
              </li>
            ))}
          </ul>
          <p className="booking-mini-cart-sub">
            Subtotale <strong>{subtotal} €</strong>
          </p>
          <a
            href="#prenota"
            className="btn btn-gold"
            onClick={() => {
              document.getElementById("prenota")?.scrollIntoView({ behavior: "smooth" });
              setOpen(false);
            }}
          >
            Procedi alla prenotazione
          </a>
        </div>
      ) : null}
    </div>
  );
}
