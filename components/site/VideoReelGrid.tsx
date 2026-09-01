import { VIDEO_REELS } from "@/lib/site-videos";
import { SalonVideo } from "@/components/site/SalonVideo";

export function VideoReelGrid() {
  return (
    <section id="gallery" className="section-pad section-dark">
      <div className="eyebrow">Dal salone</div>
      <h2 className="section-title font-serif">Taglio &amp; colorazione</h2>
      <div className="video-reel-grid">
        {VIDEO_REELS.map((reel) => (
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
    </section>
  );
}
