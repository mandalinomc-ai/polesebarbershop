import { SITE, getMapsUrl } from "@/lib/site-config";
import {
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABEL,
  SERVICES,
  formatPrice,
} from "@/lib/catalog";
import {
  BookingSectionNote,
  FreshaBookingFlow,
} from "@/components/booking/FreshaBookingFlow";

const GALLERY = [
  {
    src: "/assets/images/gallery/fresha-01.jpg",
    alt: "Interno salone Polese Barbershop — marmo e postazioni",
    tall: false,
  },
  {
    src: "/assets/images/hero-bg.jpg",
    alt: "Salone Felice Polese Benevento",
    tall: true,
  },
  {
    src: "/assets/images/gallery/fresha-02.jpg",
    alt: "Postazione barbiere Polese",
    tall: false,
  },
  {
    src: "/assets/images/brand-products.jpg",
    alt: "Linea prodotti Felice Polese",
    tall: false,
  },
  {
    src: "/assets/images/gallery/fresha-00.jpg",
    alt: "Prodotti grooming Felice Polese",
    tall: false,
  },
];

export function LandingSections() {
  return (
    <>
      <section id="about" className="section-pad bg-marble-light">
        <div className="eyebrow reveal">Il brand</div>
        <h2 className="section-title font-serif reveal reveal-d1">
          Tradizione &amp; precisione
        </h2>
        <div className="about-grid">
          <div className="about-visual reveal">
            <img
              src="/assets/images/logo.png"
              alt="Logo Felice Polese"
              className="brand-logo brand-logo--about"
              width={512}
              height={331}
            />
          </div>
          <div className="reveal reveal-d2">
            <p className="prose">
              <strong>{SITE.brand}</strong> interpreta la barberia come rituale
              di cura e stile. Due poltrone indipendenti: <strong>Felice</strong>{" "}
              e <strong>Davide</strong>.
            </p>
            <p className="prose">
              Il salone in {SITE.address}, {SITE.city} — ambiente dark, elegante
              e riservato.
            </p>
          </div>
        </div>
      </section>

      <section id="services" className="section-pad section-dark">
        <div className="eyebrow reveal">Listino</div>
        <h2 className="section-title font-serif reveal reveal-d1">
          Menu grooming
        </h2>
        {SERVICE_CATEGORIES.map((cat) => (
          <div key={cat}>
            <p className="fresha-cat reveal" style={{ marginTop: "2rem" }}>
              {SERVICE_CATEGORY_LABEL[cat]}
            </p>
            <div className="services-grid">
              {SERVICES.filter((s) => s.category === cat).map((s, i) => (
                <article
                  key={s.id}
                  className={`service-card reveal${i % 3 === 1 ? " reveal-d1" : i % 3 === 2 ? " reveal-d2" : ""}`}
                >
                  <h3>{s.name}</h3>
                  <p>{s.description}</p>
                  <span className="service-price">
                    {formatPrice(s)} · {s.durationMin} min
                  </span>
                </article>
              ))}
            </div>
          </div>
        ))}
        <p className="booking-open-note" style={{ marginTop: "1.5rem" }}>
          {SITE.pricesIncludeVat} I servizi a prezzo variabile sono confermati
          in salone.
        </p>
      </section>

      <section id="gallery" className="section-pad bg-marble-light">
        <div className="eyebrow reveal">Atmosfera</div>
        <h2 className="section-title font-serif reveal reveal-d1">Il salone</h2>
        <div className="gallery-grid">
          {GALLERY.map((item) => (
            <figure
              key={item.src}
              className={`gallery-item reveal${item.tall ? " gallery-tall" : ""}`}
            >
              <img
                src={item.src}
                alt={item.alt}
                width={1400}
                height={900}
                loading="lazy"
              />
            </figure>
          ))}
        </div>
      </section>

      <section id="prenota" className="section-pad section-dark">
        <div className="eyebrow reveal">Prenotazione</div>
        <h2 className="section-title font-serif reveal reveal-d1">
          Prenota il tuo posto
        </h2>
        <div className="booking-layout reveal">
          <BookingSectionNote />
          <FreshaBookingFlow />
        </div>
      </section>

      <section id="contact" className="section-pad bg-marble-light">
        <div className="eyebrow reveal">Contatti</div>
        <h2 className="section-title font-serif reveal reveal-d1">
          Vieni a trovarci
        </h2>
        <div className="contact-grid">
          <div className="contact-info reveal">
            <p>
              <strong>Indirizzo</strong>
              <br />
              {SITE.addressFull}
            </p>
            <p>
              <strong>Telefono</strong>
              <br />
              <a href={`tel:${SITE.phoneTel}`} className="contact-link">
                {SITE.phone}
              </a>
            </p>
            <p>
              <strong>Orari</strong>
              <br />
              {SITE.hours.weekdays}
              <br />
              {SITE.hours.monday}
              <br />
              {SITE.hours.sunday}
            </p>
            <p>
              <a
                href={SITE.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-link"
              >
                {SITE.instagramHandle}
              </a>
              {" · "}
              <a
                href={getMapsUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-link"
              >
                Maps
              </a>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
