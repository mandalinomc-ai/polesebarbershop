import { SITE, getWhatsAppUrl, getMailtoUrl, getMapsUrl } from "@/lib/site-config";
import { formatItalianDate } from "@/lib/availability";
import { GALLERY_IMAGES } from "@/lib/site-images";
import { GALLERY_VIDEOS } from "@/lib/site-videos";
import { FillCoverImage, SiteLogo } from "@/components/site/SiteImage";
import { SocialQrGrid, SocialTextLinks } from "@/components/site/SocialQr";
import {
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABEL,
  SERVICES,
  formatPriceRange,
} from "@/lib/catalog";
import { PRODUCTS, productOrderMessage } from "@/lib/products";
import {
  BookingSectionNote,
  FreshaBookingFlow,
} from "@/components/booking/FreshaBookingFlow";
export function LandingSections() {
  return (
    <>
      <section id="chi-sono" className="section-pad section-white">
        <div className="eyebrow reveal">Chi sono</div>
        <h2 className="section-title font-serif reveal reveal-d1">Felice Polese</h2>
        <div className="about-grid">
          <div className="about-visual reveal">
            <FillCoverImage
              src="/assets/images/gallery/fresha-02.jpg"
              alt="Felice Polese al lavoro in salone"
              sizes="(max-width: 900px) 100vw, 45vw"
            />
            <span className="badge-match">Barber Match 2023</span>
          </div>
          <div className="reveal reveal-d2">
            <p className="prose">
              <strong>Felice Polese</strong> interpreta la barberia come arte sartoriale:
              ogni taglio, ogni barba e ogni colore nasce da ascolto, tecnica e cura del
              dettaglio.
            </p>
            <p className="prose">
              Finalista al <strong>Barber Match 2023</strong>, Felice unisce precisione
              italiana e visione contemporanea. In salone lavorano due poltrone
              indipendenti — <strong>Felice</strong> e <strong>Davide</strong> — in uno
              spazio luminoso e minimal in {SITE.address}, {SITE.city}.
            </p>
            <p className="prose">
              Apriamo ufficialmente il{" "}
              <strong>{formatItalianDate(SITE.openingDate)}</strong>. Il calendario è già
              aperto: prenota online e scegli il tuo barbiere.
            </p>
            <SiteLogo
              alt="Logo Felice Polese"
              className="brand-logo brand-logo--about"
              sizes="180px"
            />
          </div>
        </div>
      </section>

      <section id="trattamenti" className="section-pad section-muted">
        <div className="eyebrow reveal">Trattamenti</div>
        <h2 className="section-title font-serif reveal reveal-d1">Listino</h2>
        <p className="section-lead reveal">
          Taglio, barba e colore con prezzi trasparenti. I servizi a prezzo variabile
          vengono confermati in salone.
        </p>
        {SERVICE_CATEGORIES.map((cat) => (
          <div key={cat}>
            <p className="cat-label reveal" style={{ marginTop: "2rem" }}>
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
        <p className="booking-open-note reveal" style={{ marginTop: "1.5rem" }}>
          {SITE.pricesIncludeVat}
        </p>
      </section>

      <section id="consulenza" className="section-pad section-white">
        <div className="eyebrow reveal">Consulenza</div>
        <h2 className="section-title font-serif reveal reveal-d1">
          Consulenza Tricologica
        </h2>
        <div className="consult-grid reveal reveal-d1">
          <div className="consult-copy">
            <p className="prose">
              Analisi personalizzata del cuoio capelluto e del capello: caduta, diradamento,
              forfora, eccesso di sebo o sensibilità. Felice valuta abitudini, prodotti e
              obiettivi estetici prima di ogni percorso colore o trattamento.
            </p>
            <p className="prose">
              La consulenza in salone è il punto di partenza per un grooming consapevole —
              senza diagnosi mediche, con protocolli mirati e prodotti Felice Polese.
            </p>
            <div className="consult-actions">
              <a
                className="btn btn-dark"
                href={getWhatsAppUrl(
                  "Ciao, vorrei prenotare una consulenza tricologica da Polese Barbershop.",
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                Prenota consulenza
              </a>
              <a className="btn btn-outline" href="/#prenota">
                Prenota online
              </a>
            </div>
          </div>
          <div className="consult-visual">
            <FillCoverImage
              src="/assets/images/gallery/fresha-03.jpg"
              alt="Consulenza e cura del capello in salone"
              sizes="(max-width: 900px) 100vw, 40vw"
            />
          </div>
        </div>
      </section>

      <section id="prodotti" className="section-pad section-muted">
        <div className="eyebrow reveal">Prodotti</div>
        <h2 className="section-title font-serif reveal reveal-d1">
          Linea Felice Polese
        </h2>
        <p className="section-lead reveal">
          Grooming essentials selezionati in salone. Ordina via WhatsApp — ritiro o
          consegna concordata con Felice e Davide.
        </p>
        <div className="products-grid">
          {PRODUCTS.map((p, i) => (
            <article
              key={p.id}
              className={`product-card reveal${i % 3 === 1 ? " reveal-d1" : i % 3 === 2 ? " reveal-d2" : ""}`}
            >
              <div className="product-image">
                <FillCoverImage src={p.image} alt={p.name} sizes="(max-width: 640px) 50vw, 25vw" />
              </div>
              <h3>{p.name}</h3>
              <p>{p.description}</p>
              <span className="product-price">{p.priceLabel}</span>
              <a
                className="btn btn-outline product-order"
                href={getWhatsAppUrl(productOrderMessage(p.name))}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ordina su WhatsApp
              </a>
            </article>
          ))}
        </div>
      </section>

      <section id="galleria" className="section-pad section-white">
        <div className="eyebrow reveal">Galleria</div>
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
        <div className="gallery-video-grid">
          {GALLERY_VIDEOS.map((video, i) => (
            <figure
              key={video.id}
              className={`gallery-video reveal${i === 1 ? " reveal-d1" : i === 2 ? " reveal-d2" : ""}`}
            >
              <video
                src={video.src}
                poster={video.poster}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                aria-label={video.alt}
              />
            </figure>
          ))}
        </div>
      </section>

      <section id="prenota" className="section-pad section-muted">
        <div className="eyebrow reveal">Prenota</div>
        <h2 className="section-title font-serif reveal reveal-d1">Prenota il tuo posto</h2>
        <div className="booking-layout reveal">
          <BookingSectionNote />
          <FreshaBookingFlow />
        </div>
      </section>

      <section id="contatti" className="section-pad section-white">
        <div className="eyebrow reveal">Contatti</div>
        <h2 className="section-title font-serif reveal reveal-d1">Vieni a trovarci</h2>
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
          <div className="contact-qr reveal reveal-d1">
            <p className="qr-intro">Instagram, WhatsApp o prenota online</p>
            <SocialQrGrid variant="contact" />
          </div>
        </div>
      </section>
    </>
  );
}
