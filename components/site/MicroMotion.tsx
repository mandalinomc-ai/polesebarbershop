"use client";

import { useEffect } from "react";

/** Lightweight scroll parallax + desktop 3D tilt. Respects reduced motion and touch. */
export function MicroMotion() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    const parallaxEls = Array.from(
      document.querySelectorAll<HTMLElement>("[data-parallax]"),
    );
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        parallaxEls.forEach((el) => {
          const speed = Number(el.dataset.parallax || "0.12");
          const offset = Math.min(48, y * speed);
          el.style.transform = `translate3d(0, ${offset}px, 0)`;
        });
      });
    };
    if (parallaxEls.length) {
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    const cleanups: Array<() => void> = [];
    if (finePointer) {
      const tilts = Array.from(document.querySelectorAll<HTMLElement>(".tilt-3d"));
      tilts.forEach((el) => {
        const onMove = (e: MouseEvent) => {
          const rect = el.getBoundingClientRect();
          const px = (e.clientX - rect.left) / rect.width - 0.5;
          const py = (e.clientY - rect.top) / rect.height - 0.5;
          el.style.transform = `perspective(900px) rotateX(${(-py * 6).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg) translateZ(0)`;
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
      cleanups.forEach((fn) => fn());
      parallaxEls.forEach((el) => {
        el.style.transform = "";
      });
    };
  }, []);

  return null;
}
