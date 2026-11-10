"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FillCoverImage } from "@/components/site/SiteImage";
import type { SalonPhoto } from "@/lib/salon-photos";

/** Swipeable photo carousel — used only in the locale section. */
export function SalonPhotoCarousel({ photos }: { photos: SalonPhoto[] }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  const count = photos.length;

  const goTo = useCallback(
    (next: number) => {
      const el = scrollerRef.current;
      if (!el || count === 0) return;
      const clamped = ((next % count) + count) % count;
      const slide = el.children[clamped] as HTMLElement | undefined;
      slide?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      setIndex(clamped);
    },
    [count],
  );

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const slides = Array.from(el.children) as HTMLElement[];
      if (!slides.length) return;
      const mid = el.scrollLeft + el.clientWidth / 2;
      let best = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      slides.forEach((slide, i) => {
        const center = slide.offsetLeft + slide.clientWidth / 2;
        const dist = Math.abs(center - mid);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      setIndex(best);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  if (!count) return null;

  return (
    <div className="salone-carousel" aria-roledescription="carousel" aria-label="Foto attrezzatura">
      <div ref={scrollerRef} className="salone-carousel-track">
        {photos.map((photo, i) => (
          <div
            key={photo.id}
            className="salone-carousel-slide"
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} di ${count}`}
          >
            <div className="salone-carousel-media">
              <FillCoverImage
                src={photo.src}
                alt={photo.alt}
                sizes="(max-width: 900px) 92vw, 720px"
                quality={80}
                priority={i === 0}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="salone-carousel-controls">
        <button
          type="button"
          className="salone-carousel-nav"
          aria-label="Foto precedente"
          onClick={() => goTo(index - 1)}
        >
          <ChevronLeft size={20} aria-hidden />
        </button>
        <div className="salone-carousel-dots" role="tablist" aria-label="Seleziona foto">
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Vai alla foto ${i + 1}`}
              className={`salone-carousel-dot${i === index ? " is-active" : ""}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
        <button
          type="button"
          className="salone-carousel-nav"
          aria-label="Foto successiva"
          onClick={() => goTo(index + 1)}
        >
          <ChevronRight size={20} aria-hidden />
        </button>
      </div>
      <p className="salone-carousel-count" aria-live="polite">
        {index + 1} / {count}
      </p>
    </div>
  );
}
