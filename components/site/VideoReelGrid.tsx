import { formatDuration, formatPriceRange, SERVICES } from "@/lib/catalog";
import { serviceBookingHref } from "@/lib/site-config";
import { SalonVideo } from "@/components/site/SalonVideo";
import { CUTTING_TECHNIQUE_VIDEOS, SERVICE_SHOWCASE_VIDEOS } from "@/lib/site-videos";

export function VideoReelGrid() {
  return (
    <section id="gallery" className="section-pad section-marble marble-accent">
      <div className="eyebrow">Servizi reali</div>
      <h2 className="section-title font-serif">Ogni trattamento con il suo media</h2>
      <p className="prose technique-lead">
        Clip reali dal salone per taglio, barba e trattamenti colore. Dove il
        Drive condivide solo una foto beard, usiamo quella come poster e
        manteniamo in riproduzione solo footage reale del salone.
      </p>
      <div className="video-reel-grid">
        {SERVICES.map((service) => {
          const media = SERVICE_SHOWCASE_VIDEOS.find(
            (entry) => entry.serviceId === service.id,
          );
          if (!media) return null;
          return (
            <article key={service.id} className="video-reel-box service-reel-box">
              <div className="video-reel-media">
                <SalonVideo video={media} className="video-reel-player" />
                {media.label ? (
                  <span className="video-reel-label">{media.label}</span>
                ) : null}
              </div>
              <div className="service-reel-copy">
                <div className="service-reel-head">
                  <h3>{service.name}</h3>
                  <span className="service-price">{formatPriceRange(service)}</span>
                </div>
                <p>{service.description}</p>
                <div className="service-reel-foot">
                  <span className="service-reel-duration">
                    {formatDuration(service)}
                  </span>
                  <a className="btn btn-listino-prenota" href={serviceBookingHref(service.id)}>
                    Prenota
                  </a>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <h3 className="section-title font-serif technique-subtitle">Sfumature</h3>
      <p className="prose technique-lead">
        Razor fade, taper fade e burst fade restano tecniche di salone, non listino.
      </p>
      <div className="video-reel-grid technique-grid">
        {CUTTING_TECHNIQUE_VIDEOS.map((reel) => (
          <article key={reel.id} className="video-reel-box">
            <div className="video-reel-media">
              <SalonVideo video={reel} className="video-reel-player" />
              {reel.label ? (
                <span className="video-reel-label">{reel.label}</span>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      <p className="technique-cta-wrap">
        <a className="btn btn-ink" href="/#prenota">
          Prenota il tuo taglio
        </a>
      </p>
    </section>
  );
}
