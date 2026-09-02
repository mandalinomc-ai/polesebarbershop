import { existsSync } from "node:fs";
import { join } from "node:path";
import { CUTTING_TECHNIQUE_VIDEOS, TECHNIQUE_VIDEO_FILES } from "@/lib/site-videos";
import { SalonVideo } from "@/components/site/SalonVideo";

const VIDEO_DIR = join(process.cwd(), "public", "assets", "video");

function existingTechniqueVideos() {
  return CUTTING_TECHNIQUE_VIDEOS.filter((video, index) => {
    const filename = TECHNIQUE_VIDEO_FILES[index];
    return filename ? existsSync(join(VIDEO_DIR, filename)) : false;
  });
}

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
  const techniques = existingTechniqueVideos();
  if (!techniques.length) return null;

  return (
    <section id="gallery" className="section-pad section-marble marble-accent">
      <div className="eyebrow">Tecniche</div>
      <h2 className="section-title font-serif">Tecniche di taglio</h2>
      <p className="prose technique-lead">
        Scopri alcune delle tecniche che utilizziamo nei nostri tagli.
      </p>
      <div className="video-reel-grid technique-grid">
        {techniques.map((reel) => (
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
