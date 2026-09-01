import type { SiteVideo } from "@/lib/site-videos";

type SalonVideoProps = {
  video: SiteVideo;
  className?: string;
};

/** Autoplay muted loop — real salon mp4 from public/assets/video/. */
export function SalonVideo({ video, className = "salon-video-player" }: SalonVideoProps) {
  return (
    <video
      className={className}
      src={video.src}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-label={video.alt}
    />
  );
}
