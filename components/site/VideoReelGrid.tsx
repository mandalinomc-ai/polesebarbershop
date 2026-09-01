import { VIDEO_REELS } from "@/lib/site-videos";
import { SalonVideo } from "@/components/site/SalonVideo";

export function VideoReelGrid() {
  return (
    <section id="reels" className="section-pad section-dark">
      <div className="eyebrow reveal">Dal salone</div>
      <h2 className="section-title font-serif reveal reveal-d1">Taglio &amp; colorazione</h2>
      <div className="video-reel-grid">
        {VIDEO_REELS.map((reel, i) => (
          <article
            key={reel.id}
            className={`video-reel-box reveal${i % 3 === 1 ? " reveal-d1" : i % 3 === 2 ? " reveal-d2" : ""}`}
          >
            <div className="video-reel-media">
              <SalonVideo video={reel} className="video-reel-player" />
              {reel.label ? (
                <span className="video-reel-label">{reel.label}</span>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
