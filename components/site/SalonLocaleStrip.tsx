import { FillCoverImage } from "@/components/site/SiteImage";
import { SalonPhotoCarousel } from "@/components/site/SalonPhotoCarousel";
import { SALON_BRAND_PHOTOS, SALON_UTENSILI_PHOTOS } from "@/lib/salon-photos";
import { SITE, getWhatsAppUrl } from "@/lib/site-config";

const CONSULENZA_GRATUITA_WA =
  "Ciao, vorrei una consulenza gratuita e sapere come raggiungervi in salone.";

/** Dedicated locale section: utensil carousel + logo / opening plaque. */
export function SalonLocaleStrip() {
  const logo = SALON_BRAND_PHOTOS.find((p) => p.id === "logo-muro");
  const plaque = SALON_BRAND_PHOTOS.find((p) => p.id === "targhetta");

  return (
    <section id="salone" className="section-pad bg-marble-light marble-accent" aria-label="Il nuovo salone">
      <div className="salone-head reveal">
        <div className="salone-head-copy">
          <div className="eyebrow">Il locale</div>
          <h2 className="section-title font-serif">Il nuovo salone</h2>
          <p className="prose technique-lead">
            Attrezzatura e dettagli del nuovo locale — scorri le foto.
          </p>
        </div>

        <aside className="salone-head-cta" aria-label="Indirizzo e consulenza">
          <p className="salone-address">
            <span className="salone-address-label">Via</span>
            <strong>{SITE.address}</strong>
            <span>
              {SITE.postalCode} {SITE.city} ({SITE.province})
            </span>
          </p>
          <a
            className="btn btn-whatsapp salone-wa-cta"
            href={getWhatsAppUrl(CONSULENZA_GRATUITA_WA)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Raggiungici ora
          </a>
          <p className="salone-wa-note">Consulenza gratuita su WhatsApp</p>
        </aside>
      </div>

      <div className="salone-carousel-wrap reveal reveal-d2">
        <SalonPhotoCarousel photos={SALON_UTENSILI_PHOTOS} />
      </div>

      {logo && plaque ? (
        <div className="salone-brand-pair reveal reveal-d3">
          <div className="salone-brand-photo salone-brand-photo--logo">
            <div className="salone-brand-media">
              <FillCoverImage
                src={logo.src}
                alt={logo.alt}
                sizes="(max-width: 800px) 100vw, 55vw"
                quality={80}
              />
            </div>
          </div>
          <div className="salone-brand-photo salone-brand-photo--plaque">
            <div className="salone-brand-media">
              <FillCoverImage
                src={plaque.src}
                alt={plaque.alt}
                sizes="(max-width: 800px) 100vw, 35vw"
                quality={80}
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
