import { SITE, getMapsUrl } from "@/lib/site-config";
import {
  BookingSectionNote,
  FreshaBookingFlow,
} from "@/components/booking/FreshaBookingFlow";
import { ServiceListino } from "@/components/booking/ServiceListino";
import { VideoReelGrid } from "@/components/site/VideoReelGrid";
import { FELICE_WORKING_VIDEO } from "@/lib/site-videos";

export function LandingSections() {
  return (
    <>
      <section id="about" className="section-pad bg-marble-light marble-accent">
        <div className="eyebrow reveal">Felice Polese</div>
        <h2 className="section-title font-serif reveal reveal-d1">
          Tradizione &amp; precisione
        </h2>
        <div className="about-grid">
          <div className="about-copy reveal">
            <p className="prose">
              Da <strong>Santa Maria degli Angeli</strong> al nuovo salone in{" "}
              <strong>Corso Dante 45</strong>, {SITE.city}: Felice Polese porta la
              barberia sartoriale in uno spazio luminoso e riservato.
            </p>
            <p className="prose">
              <span className="badge-match">Barber Match 2023 · Giovane Talento</span>
            </p>
            <p className="prose">
              Taglio uomo, barba e rasatura con precisione artigianale. In salone
              lavorano <strong>Felice</strong> e <strong>Davide</strong> su due
              poltrone indipendenti.
            </p>
            <p className="prose">
              <a
                className="map-link"
                href={getMapsUrl()}
                target="_blank"
                rel="noopener noreferrer"
              >
                📍 Raggiungimi ora su Google Maps
              </a>
            </p>
          </div>
          <div className="about-video glass-card">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="felice-video-hero"
              aria-label={FELICE_WORKING_VIDEO.alt}
            >
              <source src={FELICE_WORKING_VIDEO.src} type="video/mp4" />
            </video>
          </div>
        </div>
      </section>

      <VideoReelGrid />

      <section id="prenota" className="section-pad bg-marble-light marble-accent">
        <div className="eyebrow reveal">Servizi &amp; prenotazione</div>
        <h2 className="section-title font-serif reveal reveal-d1">I nostri servizi</h2>
        <div className="booking-layout-grid reveal">
          <ServiceListino />
          <div className="booking-flow-wrap glass-card">
            <BookingSectionNote />
            <FreshaBookingFlow />
          </div>
        </div>
        <p className="booking-open-note reveal" style={{ marginTop: "1.5rem" }}>
          {SITE.pricesIncludeVat}
        </p>
      </section>

      <section id="contact" className="section-pad bg-marble-light marble-accent">
        <div className="eyebrow reveal">Contatti</div>
        <h2 className="section-title font-serif reveal reveal-d1">
          Prenota o scrivici
        </h2>
        <div className="contact-grid">
          <div className="contact-info reveal glass-card" style={{ padding: "1.25rem" }}>
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
                📍 Raggiungimi ora su Google Maps
              </a>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
