import { CUTTING_TECHNIQUE_VIDEOS, VIDEO_REELS } from "@/lib/site-videos";
import { SalonVideo } from "@/components/site/SalonVideo";

const GALLERY_REELS = [...CUTTING_TECHNIQUE_VIDEOS, ...VIDEO_REELS];

export function VideoReelGrid() {
  return (
    <section id="gallery" className="section-pad section-marble marble-accent">
      <div className="eyebrow">Sfumature</div>
      <h2 className="section-title font-serif">Le nostre sfumature</h2>
      <p className="prose technique-lead">
        Taglio e colorazione dal salone — sfumature e finiture in azione.
      </p>
      <div className="video-reel-grid">
        {GALLERY_REELS.map((reel) => (
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
