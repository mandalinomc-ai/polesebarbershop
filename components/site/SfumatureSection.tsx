import { existsSync } from "node:fs";
import { join } from "node:path";
import { CUTTING_TECHNIQUE_VIDEOS, TECHNIQUE_VIDEO_FILES } from "@/lib/site-videos";
import { SalonVideo } from "@/components/site/SalonVideo";

const VIDEO_DIR = join(process.cwd(), "public", "assets", "video");

/** Display order: Taper Fade, Burst Fade, Razor Fade. */
const SFUMATURA_ORDER = ["taper-fade-technique", "burst-fade-technique", "razor-fade-technique"] as const;

function existingSfumaturaVideos() {
  const byId = new Map(
    CUTTING_TECHNIQUE_VIDEOS.map((video, index) => {
      const filename = TECHNIQUE_VIDEO_FILES[index];
      const exists = filename ? existsSync(join(VIDEO_DIR, filename)) : false;
      return [video.id, exists ? video : null] as const;
    }),
  );

  return SFUMATURA_ORDER.map((id) => byId.get(id)).filter(
    (video): video is (typeof CUTTING_TECHNIQUE_VIDEOS)[number] => video != null,
  );
}

function SfumaturaCard({
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

/** Non-bookable fade techniques — after trattamenti, before gallery. */
export function SfumatureSection() {
  const techniques = existingSfumaturaVideos();
  if (!techniques.length) return null;

  return (
    <section id="sfumature" className="section-pad section-marble marble-accent">
      <div className="eyebrow">Sfumature</div>
      <h2 className="section-title font-serif">Tecniche di sfumatura</h2>
      <p className="prose technique-lead">
        Taper Fade, Burst Fade e Razor Fade — tecniche dimostrate in salone, senza prezzo
        separato nel listino.
      </p>
      <div className="video-reel-grid technique-grid">
        {techniques.map((reel) => (
          <SfumaturaCard key={reel.id} video={reel} />
        ))}
      </div>
    </section>
  );
}
