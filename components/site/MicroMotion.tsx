"use client";

import { useEffect } from "react";

/**
 * Premium micro-motion: viewport parallax, inner video clip parallax,
 * desktop tilt. Skips reduced-motion / narrow viewports where noted.
 */
export function MicroMotion() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const desktop = window.matchMedia("(min-width: 900px)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    const parallaxEls = Array.from(
      document.querySelectorAll<HTMLElement>("[data-parallax]"),
    );
    const mediaShells = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".video-reel-media, .about-video, .hero-media-cell",
      ),
    );

    let raf = 0;
    let activeWillChange = new Set<HTMLElement>();

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const vh = window.innerHeight || 1;
        const nextWill = new Set<HTMLElement>();

        if (desktop) {
          parallaxEls.forEach((el) => {
            const speed = Number(el.dataset.parallax || "0.08");
            const rect = el.getBoundingClientRect();
            if (rect.bottom < -40 || rect.top > vh + 40) {
              el.style.transform = "";
              return;
            }
            const mid = rect.top + rect.height / 2;
            const progress = (mid - vh / 2) / vh;
            const range = Math.min(10, 10 * Math.max(0.04, speed) * 12.5);
            const offset = Math.max(-range, Math.min(range, progress * -range * 2));
            el.style.willChange = "transform";
            el.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
            nextWill.add(el);
          });
        }

        mediaShells.forEach((shell) => {
          const rect = shell.getBoundingClientRect();
          if (rect.bottom < 0 || rect.top > vh) return;
          const player = shell.querySelector<HTMLElement>(
            ".video-reel-player, .felice-video-hero, .salon-video-player, video",
          );
          if (!player || shell.matches(":hover")) return;

          const mid = rect.top + rect.height / 2;
          const progress = (mid - vh / 2) / vh;
          const y = desktop
            ? Math.max(-8, Math.min(8, progress * -14))
            : Math.max(-4, Math.min(4, progress * -7));
          const scale = desktop
            ? (1.035 - Math.abs(progress) * 0.03).toFixed(4)
            : (1.02 - Math.abs(progress) * 0.015).toFixed(4);

          player.style.willChange = "transform";
          player.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0) scale(${scale})`;
          nextWill.add(player);
        });

        activeWillChange.forEach((el) => {
          if (!nextWill.has(el)) el.style.willChange = "auto";
        });
        activeWillChange = nextWill;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    const cleanups: Array<() => void> = [];
    if (finePointer && desktop) {
      const tilts = Array.from(document.querySelectorAll<HTMLElement>(".tilt-3d"));
      tilts.forEach((el) => {
        const onMove = (e: MouseEvent) => {
          const rect = el.getBoundingClientRect();
          const px = (e.clientX - rect.left) / rect.width - 0.5;
          const py = (e.clientY - rect.top) / rect.height - 0.5;
          el.style.willChange = "transform";
          el.style.transform = `perspective(900px) rotateX(${(-py * 3.5).toFixed(2)}deg) rotateY(${(px * 4.5).toFixed(2)}deg) translateZ(0)`;
        };
        const onLeave = () => {
          el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0)";
          el.style.willChange = "auto";
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
      activeWillChange.forEach((el) => {
        el.style.willChange = "auto";
      });
      parallaxEls.forEach((el) => {
        el.style.transform = "";
      });
      mediaShells.forEach((shell) => {
        const player = shell.querySelector<HTMLElement>(
          ".video-reel-player, .felice-video-hero, .salon-video-player, video",
        );
        if (player) player.style.transform = "";
      });
    };
  }, []);

  return null;
}
