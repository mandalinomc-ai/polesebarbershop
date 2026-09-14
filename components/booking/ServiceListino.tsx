"use client";

import { useEffect, useMemo, useState } from "react";
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
  BOOKING_SERVICE_EVENT,
  CONSULTATION_SELECTION_SYNC_EVENT,
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

function toggleConsultationId(id: string) {
  window.dispatchEvent(
    new CustomEvent(CONSULTATION_SELECTION_SYNC_EVENT, {
      detail: { toggle: id },
    }),
  );
}

function ListinoSection({
  title,
  eyebrow,
  services,
  selectedIds,
  mode,
}: {
  title: string;
  eyebrow: string;
  services: Service[];
  selectedIds: string[];
  mode: "online" | "consultation";
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
                        {mode === "consultation" ? (
                          <button
                            type="button"
                            className={`btn btn-listino-prenota btn-listino-wa${selected ? " is-selected" : ""}`}
                            aria-pressed={selected}
                            onClick={() => toggleConsultationId(s.id)}
                          >
                            {selected ? "In consulenza" : "Aggiungi consulenza"}
                          </button>
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
                            {selected ? "Selezionato" : "Prenota ora"}
                          </a>
                        )}
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

/** Official listino — split online booking vs WhatsApp consulenza. */
export function ServiceListino() {
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const [consultIds, setConsultIds] = useState<string[]>([]);

  useEffect(() => {
    const onOnline = (event: Event) => {
      const ids = (event as CustomEvent<string[]>).detail;
      if (Array.isArray(ids)) setOnlineIds(ids.filter((id) => !isWhatsAppOnlyService(id)));
    };
    const onConsult = (event: Event) => {
      const detail = (event as CustomEvent<{ ids?: string[]; toggle?: string }>).detail;
      if (Array.isArray(detail?.ids)) {
        setConsultIds(detail.ids.filter(isWhatsAppOnlyService));
        return;
      }
      if (detail?.toggle && isWhatsAppOnlyService(detail.toggle)) {
        setConsultIds((curr) => {
          const next = curr.includes(detail.toggle!)
            ? curr.filter((x) => x !== detail.toggle)
            : [...curr, detail.toggle!];
          queueMicrotask(() => {
            window.dispatchEvent(
              new CustomEvent(CONSULTATION_SELECTION_SYNC_EVENT, { detail: { ids: next } }),
            );
          });
          return next;
        });
      }
    };
    window.addEventListener(BOOKING_SELECTION_SYNC_EVENT, onOnline);
    window.addEventListener(CONSULTATION_SELECTION_SYNC_EVENT, onConsult);
    return () => {
      window.removeEventListener(BOOKING_SELECTION_SYNC_EVENT, onOnline);
      window.removeEventListener(CONSULTATION_SELECTION_SYNC_EVENT, onConsult);
    };
  }, []);

  const online = useMemo(() => onlineBookableServices(), []);
  const consultation = useMemo(
    () => SERVICES.filter((s) => s.active !== false && s.whatsAppOnly),
    [],
  );

  return (
    <div className="booking-listino" id="listino">
      <ListinoSection
        title="Listino prenota ora"
        eyebrow="Online"
        services={online}
        selectedIds={onlineIds}
        mode="online"
      />
      <ListinoSection
        title="Listino consulenza"
        eyebrow="Solo WhatsApp · tempi gestiti in salone"
        services={consultation}
        selectedIds={consultIds}
        mode="consultation"
      />
    </div>
  );
}

/** Magnetic bottom cart for online-bookable selections. */
export function BookingMiniCart() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [rise, setRise] = useState(false);

  useEffect(() => {
    const onSync = (event: Event) => {
      const ids = (event as CustomEvent<string[]>).detail;
      if (!Array.isArray(ids)) return;
      const next = ids.filter((id) => !isWhatsAppOnlyService(id));
      setSelectedIds(next);
      if (next.length) {
        setOpen(true);
        setRise(true);
        window.setTimeout(() => setRise(false), 450);
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
    <div className={`booking-mini-cart booking-mini-cart--online${open ? " is-open" : ""}${rise ? " is-rise" : ""}`}>
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
            <h3 className="font-serif">Prenota ora</h3>
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

/** Separate magnetic cart for WhatsApp consulenza multi-select. */
export function ConsultationMiniCart() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [rise, setRise] = useState(false);

  useEffect(() => {
    const onSync = (event: Event) => {
      const detail = (event as CustomEvent<{ ids?: string[]; toggle?: string }>).detail;
      if (Array.isArray(detail?.ids)) {
        const next = detail.ids.filter(isWhatsAppOnlyService);
        setSelectedIds(next);
        if (next.length) {
          setOpen(true);
          setRise(true);
          window.setTimeout(() => setRise(false), 450);
        }
        return;
      }
      // Ignore raw toggle events — ServiceListino already rebroadcasts ids.
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

  function clear() {
    setSelectedIds([]);
    setOpen(false);
    window.dispatchEvent(
      new CustomEvent(CONSULTATION_SELECTION_SYNC_EVENT, { detail: { ids: [] } }),
    );
  }

  return (
    <div className={`booking-mini-cart booking-mini-cart--consult${open ? " is-open" : ""}${rise ? " is-rise" : ""}`}>
      <button
        type="button"
        className="booking-mini-cart-toggle booking-mini-cart-toggle--wa"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{items.length} consulenza</span>
        <strong>WhatsApp</strong>
      </button>
      {open ? (
        <div className="booking-mini-cart-panel" role="dialog" aria-label="Carrello consulenza">
          <header>
            <h3 className="font-serif">Consulenza</h3>
            <button type="button" className="btn btn-outline" onClick={() => setOpen(false)}>
              Chiudi
            </button>
          </header>
          <ul>
            {items.map((s) => (
              <li key={s.id}>
                <span>{s.name}</span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  aria-label={`Rimuovi ${s.name}`}
                  onClick={() => toggleConsultationId(s.id)}
                >
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
