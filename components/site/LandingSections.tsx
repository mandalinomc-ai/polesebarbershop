import { SITE, SALON_CONTACT, getMapsUrl, getWhatsAppUrl, getMailtoUrl } from "@/lib/site-config";
import { formatItalianDate } from "@/lib/availability";
import { GALLERY_IMAGES } from "@/lib/site-images";
import { FillCoverImage, SiteLogo } from "@/components/site/SiteImage";
import { SocialQrGrid, SocialTextLinks } from "@/components/site/SocialQr";
import {
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABEL,
  SERVICES,
  formatPriceRange,
} from "@/lib/catalog";
import {
  BookingSectionNote,
  FreshaBookingFlow,
} from "@/components/booking/FreshaBookingFlow";

export function LandingSections() {
  return (
    <>
      <section id="about" className="section-pad bg-marble-light">
        <div className="eyebrow reveal">Chi siamo</div>
        <h2 className="section-title font-serif reveal reveal-d1">
          Felice Polese &amp; il salone
        </h2>
        <div className="about-grid">
          <div className="about-visual reveal">
            <SiteLogo
              alt="Logo Felice Polese"
              className="brand-logo brand-logo--about"
              sizes="(max-width: 900px) 70vw, 240px"
            />
          </div>
          <div className="reveal reveal-d2">
            <p className="prose">
              <strong>Felice Polese</strong> interpreta la barberia come rituale di
              cura e stile: taglio, barba e colore con la precisione di chi ha fatto
              della grooming d&apos;élite la propria firma.
            </p>
            <p className="prose">
              In salone lavorano due poltrone indipendenti — <strong>Felice</strong> e{" "}
              <strong>Davide</strong> — in un ambiente dark luxury con finiture in
              marmo, oro e navy, in {SITE.address}, {SITE.city}.
            </p>
            <p className="prose">
              Apriamo ufficialmente il{" "}
              <strong>{formatItalianDate(SITE.openingDate)}</strong>.
              Il calendario è già aperto: prenota online e scegli il tuo barbiere.
            </p>
          </div>
        </div>
      </section>

      <section id="services" className="section-pad section-dark">
        <div className="eyebrow reveal">Listino</div>
        <h2 className="section-title font-serif reveal reveal-d1">
          I nostri servizi
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
                    {formatPriceRange(s)} · {s.durationMin} min
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
          {GALLERY_IMAGES.map((item) => (
            <figure
              key={item.src}
              className={`gallery-item reveal${item.tall ? " gallery-tall" : ""}`}
            >
              <FillCoverImage
                src={item.src}
                alt={item.alt}
                sizes="(max-width: 768px) 50vw, 25vw"
                className="gallery-photo"
              />
            </figure>
          ))}
        </div>
      </section>

      <section id="prenota" className="section-pad section-dark">
        <div className="eyebrow reveal">Prenota già ora</div>
        <h2 className="section-title font-serif reveal reveal-d1">
          Prima dell&apos;apertura ufficiale
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
            <p className="contact-hours">
              <strong>Orari</strong>
              <br />
              {SITE.hours.weekdays}
              <br />
              {SITE.hours.monday}
              <br />
              {SITE.hours.sunday}
            </p>
            <p>
              <strong>Email</strong>
              <br />
              <a href={getMailtoUrl()} className="contact-link">
                {SITE.email}
              </a>
            </p>
            <SocialTextLinks />
            <p>
              <a
                href={getMapsUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-link"
              >
                Raggiungici ora
              </a>
            </p>
          </div>
          <aside id={SALON_CONTACT.id} className="consult-card reveal reveal-d1">
            <p className="eyebrow">{SALON_CONTACT.eyebrow}</p>
            <h3 className="font-serif">{SALON_CONTACT.title}</h3>
            <p>{SALON_CONTACT.body}</p>
            <div className="consult-actions">
              <a
                className="btn btn-gold btn-magnetic"
                href={getWhatsAppUrl(SALON_CONTACT.prefill)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {SALON_CONTACT.cta}
              </a>
              <a className="btn btn-outline btn-magnetic" href={getMailtoUrl()}>
                Email
              </a>
              <a className="btn btn-outline btn-magnetic" href={`tel:${SITE.phoneTel}`}>
                Chiama
              </a>
            </div>
          </aside>
        </div>
        <div className="contact-qr reveal">
          <p className="qr-intro">Inquadra per Instagram, WhatsApp o prenota online</p>
          <SocialQrGrid variant="contact" />
        </div>
      </section>
    </>
  );
}
