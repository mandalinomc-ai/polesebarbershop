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
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-label={video.alt}
    >
      <source src={video.src} type="video/mp4" />
    </video>
  );
}
