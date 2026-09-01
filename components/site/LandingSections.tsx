import { SITE, getMapsUrl } from "@/lib/site-config";
import {
  BookingSectionNote,
  FreshaBookingFlow,
} from "@/components/booking/FreshaBookingFlow";
import { SalonVideo } from "@/components/site/SalonVideo";
import { VideoReelGrid } from "@/components/site/VideoReelGrid";
import { SALONE_GENERALE_VIDEO } from "@/lib/site-videos";

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
    alt: "Prodotti cura capelli Felice Polese",
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
          <div className="about-copy reveal">
            <p className="prose">
              <strong>{SITE.brand}</strong> interpreta la barberia come rituale di cura e
              stile. Taglio uomo, barba e rasatura con precisione artigianale.
            </p>
            <p className="prose">
              Il nuovo salone in {SITE.address}, {SITE.city} — ambiente dark, elegante e
              riservato.
            </p>
          </div>
          <div className="about-video reveal reveal-d2">
            <SalonVideo video={SALONE_GENERALE_VIDEO} className="about-video-player" />
          </div>
        </div>
      </section>

      <VideoReelGrid />

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
        <div className="eyebrow reveal">Servizi &amp; prenotazione</div>
        <h2 className="section-title font-serif reveal reveal-d1">I nostri servizi</h2>
        <div className="booking-layout reveal">
          <BookingSectionNote />
          <FreshaBookingFlow />
        </div>
        <p className="booking-open-note reveal" style={{ marginTop: "1.5rem" }}>
          {SITE.pricesIncludeVat}
        </p>
      </section>

      <section id="contact" className="section-pad bg-marble-light">
        <div className="eyebrow reveal">Contatti</div>
        <h2 className="section-title font-serif reveal reveal-d1">
          Prenota o scrivici
        </h2>
        <div className="contact-grid">
          <div className="contact-info reveal">
            <p>
              <strong>Indirizzo</strong>
              <br />
              {SITE.addressFull}
            </p>
            <p>
              <strong>Telefono / WhatsApp</strong>
              <br />
              <a href={`tel:${SITE.phoneTel}`} className="contact-link">
                {SITE.phoneDisplay}
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
