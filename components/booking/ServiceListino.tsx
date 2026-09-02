import Link from "next/link";
import {
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABEL,
  SERVICES,
  formatPriceRange,
} from "@/lib/catalog";
import { serviceBookingHref } from "@/lib/site-config";

/** Premium listino — real prices from catalog.ts, PRENOTA opens booking with service preselected. */
export function ServiceListino() {
  return (
    <div className="booking-listino" id="listino">
      <h3 className="booking-listino-title font-serif">Listino</h3>
      {SERVICE_CATEGORIES.map((cat) => (
        <div key={cat} className="booking-listino-group">
          <p className="booking-listino-cat">{SERVICE_CATEGORY_LABEL[cat]}</p>
          <ul className="listino-cards">
            {SERVICES.filter((s) => s.category === cat).map((s) => (
              <li key={s.id}>
                <article className="listino-card">
                  <div className="listino-card-head">
                    <h4 className="listino-card-name">{s.name}</h4>
                    <span className="listino-card-price">{formatPriceRange(s)}</span>
                  </div>
                  {s.description ? (
                    <p className="listino-card-desc">{s.description}</p>
                  ) : null}
                  <div className="listino-card-foot">
                    <span className="listino-card-duration">{s.durationMin} min</span>
                    <Link
                      href={serviceBookingHref(s.id)}
                      className="btn btn-listino-prenota"
                    >
                      Prenota
                    </Link>
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
