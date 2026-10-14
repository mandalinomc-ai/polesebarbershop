import { FillCoverImage } from "@/components/site/SiteImage";
import { SALON_LOCALE_PHOTOS } from "@/lib/salon-photos";

/** Light photo strip of the new locale — does not replace existing sections. */
export function SalonLocaleStrip() {
  return (
    <section id="salone" className="section-pad bg-marble-light marble-accent" aria-label="Il nuovo salone">
      <div className="eyebrow reveal">Il locale</div>
      <h2 className="section-title font-serif reveal reveal-d1">Il nuovo salone</h2>
      <p className="prose technique-lead reveal reveal-d2">
        Uno sguardo al nuovo locale: logo, targhetta d&apos;apertura e attrezzatura.
      </p>
      <div className="salone-photo-grid">
        {SALON_LOCALE_PHOTOS.map((photo) => (
          <figure
            key={photo.id}
            className={`salone-photo${photo.wide ? " salone-photo--wide" : ""}`}
          >
            <div className="salone-photo-media">
              <FillCoverImage
                src={photo.src}
                alt={photo.alt}
                sizes={
                  photo.wide
                    ? "(max-width: 768px) 100vw, 42vw"
                    : "(max-width: 768px) 50vw, 20vw"
                }
                quality={80}
              />
            </div>
            <figcaption className="salone-photo-caption">{photo.caption}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
