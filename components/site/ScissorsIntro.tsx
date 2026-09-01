"use client";

import { useEffect, useState } from "react";
import { ScissorsIcon } from "@/components/site/ScissorsIcon";

const INTRO_KEY = "polese-scissors-intro-seen";

/** Full-screen intro: SVG scissors open, then vertical split reveals the site. */
export function ScissorsIntro() {
  const [phase, setPhase] = useState<"hidden" | "playing" | "cutting">("hidden");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(INTRO_KEY) === "1") return;

    setPhase("playing");
    document.body.classList.add("scissors-intro-active");

    const cutTimer = window.setTimeout(() => setPhase("cutting"), 1500);
    const hideTimer = window.setTimeout(() => {
      sessionStorage.setItem(INTRO_KEY, "1");
      setPhase("hidden");
      document.body.classList.remove("scissors-intro-active");
    }, 2400);

    return () => {
      window.clearTimeout(cutTimer);
      window.clearTimeout(hideTimer);
      document.body.classList.remove("scissors-intro-active");
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div
      className={`scissors-intro${phase === "cutting" ? " scissors-intro--cutting" : ""}`}
      aria-hidden="true"
    >
      <div className="scissors-intro-split scissors-intro-split--left" />
      <div className="scissors-intro-split scissors-intro-split--right" />
      <div className="scissors-intro-content">
        <div className="scissors-intro-stage">
          <ScissorsIcon variant="intro" />
        </div>
      </div>
    </div>
  );
}
