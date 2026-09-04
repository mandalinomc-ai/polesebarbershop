"use client";

import { useEffect } from "react";

/**
 * Lightweight viewport parallax (±10px) + desktop 3D tilt.
 * Skips on reduced motion, touch, and narrow viewports.
 */
export function MicroMotion() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const desktop = window.matchMedia("(min-width: 900px)").matches;
    if (!desktop) return;

    const parallaxEls = Array.from(
      document.querySelectorAll<HTMLElement>("[data-parallax]"),
    );
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const vh = window.innerHeight || 1;
        parallaxEls.forEach((el) => {
          const speed = Number(el.dataset.parallax || "0.08");
          const rect = el.getBoundingClientRect();
          const mid = rect.top + rect.height / 2;
          const progress = (mid - vh / 2) / vh;
          const range = Math.min(10, 10 * Math.max(0.04, speed) * 12.5);
          const offset = Math.max(-range, Math.min(range, progress * -range * 2));
          el.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
        });
      });
    };
    if (parallaxEls.length) {
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll, { passive: true });
    }

    const cleanups: Array<() => void> = [];
    if (finePointer) {
      const tilts = Array.from(document.querySelectorAll<HTMLElement>(".tilt-3d"));
      tilts.forEach((el) => {
        const onMove = (e: MouseEvent) => {
          const rect = el.getBoundingClientRect();
          const px = (e.clientX - rect.left) / rect.width - 0.5;
          const py = (e.clientY - rect.top) / rect.height - 0.5;
          el.style.transform = `perspective(900px) rotateX(${(-py * 3.5).toFixed(2)}deg) rotateY(${(px * 4.5).toFixed(2)}deg) translateZ(0)`;
        };
        const onLeave = () => {
          el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0)";
        };
        el.addEventListener("mousemove", onMove);
        el.addEventListener("mouseleave", onLeave);
        cleanups.push(() => {
          el.removeEventListener("mousemove", onMove);
          el.removeEventListener("mouseleave", onLeave);
        });
      });
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cleanups.forEach((fn) => fn());
      parallaxEls.forEach((el) => {
        el.style.transform = "";
      });
    };
  }, []);

  return null;
}
