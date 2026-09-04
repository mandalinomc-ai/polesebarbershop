"use client";

import { useEffect, useRef } from "react";
import type { SiteVideo } from "@/lib/site-videos";

type SalonVideoProps = {
  video: SiteVideo;
  className?: string;
};

/**
 * Autoplay muted loop for iOS Safari + Android Chrome.
 * Explicit play() on mount/visibility — HTML autoPlay alone is unreliable on iOS.
 */
export function SalonVideo({ video, className = "salon-video-player" }: SalonVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.muted = true;
    el.defaultMuted = true;
    el.setAttribute("muted", "");
    el.setAttribute("playsinline", "");
    el.setAttribute("webkit-playsinline", "");

    const tryPlay = () => {
      const p = el.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };

    tryPlay();

    const onVisibility = () => {
      if (document.visibilityState === "visible") tryPlay();
    };
    document.addEventListener("visibilitychange", onVisibility);

    let observer: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) tryPlay();
            else el.pause();
          }
        },
        { threshold: 0.15 },
      );
      observer.observe(el);
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      observer?.disconnect();
    };
  }, [video.src]);

  return (
    <video
      ref={ref}
      className={className}
      src={video.src}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      disablePictureInPicture
      poster={video.posterSrc}
      aria-label={video.alt}
    >
      <source src={video.src} type="video/mp4" />
    </video>
  );
}
