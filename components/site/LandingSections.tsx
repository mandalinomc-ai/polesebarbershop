import { SITE, getMailtoUrl, getMapsUrl, getWhatsAppUrl } from "@/lib/site-config";
import {
  BookingSectionNote,
  FreshaBookingFlow,
} from "@/components/booking/FreshaBookingFlow";
import { ServiceListino } from "@/components/booking/ServiceListino";
import { VideoReelGrid } from "@/components/site/VideoReelGrid";
import { SalonVideo } from "@/components/site/SalonVideo";
import { FELICE_WORKING_VIDEO } from "@/lib/site-videos";

export function LandingSections() {
  return (
    <>
      <section id="about" className="section-pad bg-marble-light marble-accent">
        <div className="eyebrow reveal">Felice Polese</div>
        <h2 className="section-title font-serif reveal reveal-d1">
          Felice Polese giovane talento
        </h2>
        <div className="about-grid">
          <div className="about-copy reveal">
            <p className="prose">
              <span className="badge-match badge-match-inline">
                Barber Match 2023 · Giovane Talento
              </span>
            </p>
            <p className="prose">
              Felice Polese, giovane talento della barberia italiana, porta la
              tecnica del fade e il taglio sartoriale nel nuovo salone in{" "}
              <strong>Corso Dante 45</strong>, {SITE.city}.
            </p>
            <p className="prose">
              In salone lavorano <strong>Felice</strong> e <strong>Davide</strong>{" "}
              su due poltrone indipendenti: taglio, barba e colore.
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
            <SalonVideo
              video={FELICE_WORKING_VIDEO}
              className="felice-video-hero"
            />
          </div>
        </div>
      </section>

      <VideoReelGrid />

      <section id="prenota" className="section-pad bg-marble-light marble-accent">
        <div className="eyebrow">Listino &amp; prenotazione</div>
        <h2 className="section-title font-serif">I nostri servizi</h2>
        <div className="booking-layout-grid">
          <ServiceListino />
          <div className="booking-flow-wrap glass-card">
            <BookingSectionNote />
            <FreshaBookingFlow listinoBeside />
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
              <br />
              <a
                href={getWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-link"
              >
                Consulenza su WhatsApp
              </a>
            </p>
            <p>
              <strong>Email</strong>
              <br />
              <a href={getMailtoUrl()} className="contact-link">
                {SITE.email}
              </a>
            </p>
            <p>
              <strong>Orari</strong>
              <br />
              {SITE.hours.monday}
              <br />
              {SITE.hours.tuesday}
              <br />
              {SITE.hours.wednesday}
              <br />
              {SITE.hours.thursday}
              <br />
              {SITE.hours.friday}
              <br />
              {SITE.hours.saturday}
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
