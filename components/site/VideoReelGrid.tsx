import { formatDuration, formatPriceRange, SERVICES } from "@/lib/catalog";
import { serviceBookingHref } from "@/lib/site-config";
import { SalonVideo } from "@/components/site/SalonVideo";
import {
  CUTTING_TECHNIQUE_VIDEOS,
  SERVICE_SHOWCASE_VIDEOS,
} from "@/lib/site-videos";

function TechniqueCard({
  video,
}: {
  video: (typeof CUTTING_TECHNIQUE_VIDEOS)[number];
}) {
  return (
    <article className="video-reel-box technique-card">
      <div className="video-reel-media">
        <SalonVideo video={video} className="video-reel-player" />
      </div>
      {video.label ? <p className="technique-caption">{video.label}</p> : null}
    </article>
  );
}

export function VideoReelGrid() {
  return (
    <>
      <section id="gallery" className="section-pad section-marble marble-accent">
        <div className="eyebrow">Sfumature</div>
        <h2 className="section-title font-serif">Le nostre sfumature</h2>
        <p className="prose technique-lead">
          Scopri alcune delle sfumature e tecniche che utilizziamo nei nostri tagli.
        </p>
        <div className="video-reel-grid technique-grid">
          {CUTTING_TECHNIQUE_VIDEOS.map((reel) => (
            <TechniqueCard key={reel.id} video={reel} />
          ))}
        </div>
        <p className="technique-cta-wrap">
          <a className="btn btn-ink" href="/#prenota">
            Prenota il tuo taglio
          </a>
        </p>
      </section>

      <section id="trattamenti" className="section-pad bg-marble-light marble-accent">
        <div className="eyebrow">Servizi reali</div>
        <h2 className="section-title font-serif">Ogni trattamento con il suo media</h2>
        <p className="prose technique-lead">
          Clip reali dal Drive del salone, una per trattamento. Le foto beard
          restano solo poster; in riproduzione c&apos;è solo footage video.
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
      </section>
    </>
  );
}
