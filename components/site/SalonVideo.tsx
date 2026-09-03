import type { SiteVideo } from "@/lib/site-videos";

type SalonVideoProps = {
  video: SiteVideo;
  className?: string;
};

/** Autoplay muted loop — real salon mp4, src on the element so boxes actually play. */
export function SalonVideo({ video, className = "salon-video-player" }: SalonVideoProps) {
  return (
    <video
      className={className}
      src={video.src}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      disablePictureInPicture
      poster={video.posterSrc}
      aria-label={video.alt}
    >
      <source src={video.src} type="video/mp4" />
    </video>
  );
}
