import {
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABEL,
  SERVICES,
  formatPriceRange,
} from "@/lib/catalog";

/** Read-only listino for the booking section left column. */
export function ServiceListino() {
  return (
    <div className="booking-listino">
      <h3 className="booking-listino-title font-serif">Listino</h3>
      {SERVICE_CATEGORIES.map((cat) => (
        <div key={cat} className="booking-listino-group">
          <p className="booking-listino-cat">{SERVICE_CATEGORY_LABEL[cat]}</p>
          <ul className="booking-listino-items">
            {SERVICES.filter((s) => s.category === cat).map((s) => (
              <li key={s.id} className="booking-listino-item">
                <span className="booking-listino-name">{s.name}</span>
                <span className="booking-listino-meta">
                  {s.durationMin} min · {formatPriceRange(s)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
