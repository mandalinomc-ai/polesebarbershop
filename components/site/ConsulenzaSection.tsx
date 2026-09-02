import { SITE } from "@/lib/site-config";

/** Free in-salon consultation — not part of the bookable service grid. */
export function ConsulenzaSection() {
  return (
    <section id="consulenza" className="section-pad bg-marble-light marble-accent">
      <div className="eyebrow reveal">Consulenza</div>
      <h2 className="section-title font-serif reveal reveal-d1">Consulenza Gratuita</h2>
      <div className="consulenza-copy reveal glass-card">
        <p className="prose">
          Prima di taglio, barba o colore puoi prenotare una consulenza gratuita in salone:
          valutiamo stile, prodotti e tempi insieme a te.
        </p>
        <p className="consulenza-price">Gratis</p>
        <a className="btn btn-ink" href="/#prenota">
          Prenota consulenza
        </a>
        <p className="booking-open-note" style={{ marginTop: "1rem" }}>
          {SITE.pricesIncludeVat}
        </p>
      </div>
    </section>
  );
}
