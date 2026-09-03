"use client";

import {
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABEL,
  SERVICES,
  formatDuration,
  formatPriceRange,
} from "@/lib/catalog";
import { BOOKING_SERVICE_EVENT, serviceBookingHref } from "@/lib/site-config";

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

/** Compact official listino — tap a row to open booking with that service on step 2. */
export function ServiceListino() {
  return (
    <div className="booking-listino" id="listino">
      <h3 className="booking-listino-title font-serif">Listino</h3>
      {SERVICE_CATEGORIES.map((cat) => (
        <div key={cat} className="booking-listino-group">
          <p className="booking-listino-cat">{SERVICE_CATEGORY_LABEL[cat]}</p>
          <ul className="listino-rows">
            {SERVICES.filter((s) => s.category === cat).map((s) => (
              <li key={s.id}>
                <a
                  href={serviceBookingHref(s.id)}
                  className="listino-row"
                  onClick={(event) => {
                    event.preventDefault();
                    prenotaFromListino(s.id);
                  }}
                >
                  <div className="listino-row-head">
                    <h4 className="listino-row-name">{s.name}</h4>
                    <span className="listino-row-price">{formatPriceRange(s)}</span>
                  </div>
                  {s.description ? (
                    <p className="listino-row-desc">{s.description}</p>
                  ) : null}
                  <span className="listino-row-duration">{formatDuration(s)}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
