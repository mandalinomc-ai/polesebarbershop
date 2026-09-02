import { SITE, getMapsUrl } from "@/lib/site-config";
import {
  BookingSectionNote,
  FreshaBookingFlow,
} from "@/components/booking/FreshaBookingFlow";
import { ServiceListino } from "@/components/booking/ServiceListino";
import { VideoReelGrid } from "@/components/site/VideoReelGrid";

export function LandingSections() {
  return (
    <>
      <VideoReelGrid />

      <section id="prenota" className="section-pad bg-marble-light marble-accent">
        <div className="eyebrow">Servizi &amp; prenotazione</div>
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
