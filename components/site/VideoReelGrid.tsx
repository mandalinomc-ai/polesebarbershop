import { SITE } from "@/lib/site-config";
import { VIDEO_REELS } from "@/lib/site-videos";

export function VideoReelGrid() {
  return (
    <section id="reels" className="section-pad section-white">
      <div className="eyebrow reveal">Social</div>
      <h2 className="section-title font-serif reveal reveal-d1">Reel &amp; storie</h2>
      <p className="section-lead reveal">
        Dal salone al feed — taglio, atmosfera e prodotti Felice Polese.
      </p>
      <div className="video-reel-grid">
        {VIDEO_REELS.map((reel, i) => (
          <article
            key={reel.id}
            className={`video-reel-box reveal${i % 4 === 1 ? " reveal-d1" : i % 4 === 2 ? " reveal-d2" : i % 4 === 3 ? " reveal-d3" : ""}`}
          >
            <div className="video-reel-media">
              <video
                className="video-reel-player"
                src={reel.src}
                poster={reel.poster}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                aria-label={reel.alt}
              />
              <span className="video-reel-label">{reel.label}</span>
            </div>
          </article>
        ))}
      </div>
      <p className="video-reel-cta reveal">
        <a
          href={SITE.instagram}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline btn-magnetic"
        >
          Seguici su Instagram — {SITE.instagramHandle}
        </a>
      </p>
    </section>
  );
}
