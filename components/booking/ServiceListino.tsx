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

/** Official listino — price boxes with PRENOTA opening the Fresha wizard. */
export function ServiceListino() {
  return (
    <div className="booking-listino" id="listino">
      <h3 className="booking-listino-title font-serif">Listino</h3>
      {SERVICE_CATEGORIES.map((cat) => (
        <div key={cat} className="booking-listino-group">
          <p className="booking-listino-cat">{SERVICE_CATEGORY_LABEL[cat]}</p>
          <ul className="listino-boxes">
            {SERVICES.filter((s) => s.category === cat).map((s) => (
              <li key={s.id}>
                <article className="listino-box">
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
                      className="btn btn-listino-prenota"
                      onClick={(event) => {
                        event.preventDefault();
                        prenotaFromListino(s.id);
                      }}
                    >
                      Prenota
                    </a>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
