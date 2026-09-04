"use client";

import { useEffect, useState } from "react";
import {
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABEL,
  SERVICES,
  formatDuration,
  formatPriceRange,
} from "@/lib/catalog";
import {
  BOOKING_SELECTION_SYNC_EVENT,
  BOOKING_SERVICE_EVENT,
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

/** Official listino — price boxes; selected services light up during the order. */
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
              return (
                <li key={s.id}>
                  <article
                    className={`listino-box tilt-3d${selected ? " listino-box--selected" : ""}`}
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
