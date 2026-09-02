import { CUTTING_TECHNIQUE_VIDEOS, SALON_WORK_VIDEOS } from "@/lib/site-videos";
import { SalonVideo } from "@/components/site/SalonVideo";

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
    <section id="gallery" className="section-pad section-marble marble-accent">
      <div className="eyebrow">Tecniche</div>
      <h2 className="section-title font-serif">Tecniche di taglio</h2>
      <p className="prose technique-lead">
        Scopri alcune delle tecniche che utilizziamo nei nostri tagli.
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
      {SALON_WORK_VIDEOS.length ? (
        <div className="video-reel-grid salon-work-grid">
          {SALON_WORK_VIDEOS.map((reel) => (
            <article key={reel.id} className="video-reel-box">
              <div className="video-reel-media">
                <SalonVideo video={reel} className="video-reel-player" />
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
