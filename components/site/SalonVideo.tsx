"use client";

import { useEffect, useRef, useState } from "react";
import type { SiteVideo } from "@/lib/site-videos";

type SalonVideoProps = {
  video: SiteVideo;
  className?: string;
  /** When true, attach src immediately (above-the-fold / hero). */
  eager?: boolean;
};

/**
 * Autoplay muted loop for iOS Safari + Android Chrome.
 * Below-fold clips attach `src` only when intersecting — cuts Fast Data Transfer.
 */
export function SalonVideo({
  video,
  className = "salon-video-player",
  eager = false,
}: SalonVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [activeSrc, setActiveSrc] = useState<string | undefined>(
    eager ? video.src : undefined,
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.muted = true;
    el.defaultMuted = true;
    el.setAttribute("muted", "");
    el.setAttribute("playsinline", "");
    el.setAttribute("webkit-playsinline", "");

    const tryPlay = () => {
      if (!el.getAttribute("src") && !el.currentSrc) return;
      const p = el.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };

    if (eager) {
      setActiveSrc(video.src);
      tryPlay();
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible") tryPlay();
    };
    document.addEventListener("visibilitychange", onVisibility);

    let observer: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setActiveSrc((prev) => prev || video.src);
              // Defer play to next frame so src is applied.
              requestAnimationFrame(tryPlay);
            } else {
              el.pause();
            }
          }
        },
        { rootMargin: eager ? "0px" : "120px 0px", threshold: 0.12 },
      );
      observer.observe(el);
    } else if (!eager) {
      setActiveSrc(video.src);
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      observer?.disconnect();
    };
  }, [video.src, eager]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !activeSrc) return;
    if (el.getAttribute("src") !== activeSrc) {
      el.setAttribute("src", activeSrc);
      el.load();
    }
    const p = el.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }, [activeSrc]);

  return (
    <video
      ref={ref}
      className={className}
      autoPlay
      muted
      loop
      playsInline
      preload={eager ? "metadata" : "none"}
      disablePictureInPicture
      poster={video.posterSrc}
      aria-label={video.alt}
    />
  );
}
