import { CUTTING_TECHNIQUE_VIDEOS } from "@/lib/site-videos";
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
  );
}
