"use client";

import { useEffect, useState } from "react";
import { ScissorsIcon } from "@/components/site/ScissorsIcon";
import { OpeningCountdown } from "@/components/site/OpeningCountdown";

const INTRO_KEY = "polese-scissors-intro-seen";

/** Full-screen intro: countdown + SVG scissors, split reveal on click or when countdown ends. */
export function ScissorsIntro() {
  const [phase, setPhase] = useState<"hidden" | "playing" | "cutting">("hidden");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(INTRO_KEY) === "1") return;

    setPhase("playing");
    document.body.classList.add("scissors-intro-active");
  }, []);

  function finishIntro() {
    if (phase === "hidden" || phase === "cutting") return;
    setPhase("cutting");
    sessionStorage.setItem(INTRO_KEY, "1");
    window.setTimeout(() => {
      setPhase("hidden");
      document.body.classList.remove("scissors-intro-active");
    }, 900);
  }

  useEffect(() => {
    if (phase !== "playing") return;
    return () => document.body.classList.remove("scissors-intro-active");
  }, [phase]);

  if (phase === "hidden") return null;

  return (
    <div
      className={`scissors-intro${phase === "cutting" ? " scissors-intro--cutting" : ""}`}
      role="dialog"
      aria-label="Apertura Polese Barbershop"
      tabIndex={0}
      onClick={() => finishIntro()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") finishIntro();
      }}
    >
      <div className="scissors-intro-split scissors-intro-split--left" />
      <div className="scissors-intro-split scissors-intro-split--right" />
      <div className="scissors-intro-content">
        <div className="scissors-intro-stage">
          <ScissorsIcon variant="intro" />
        </div>
        <OpeningCountdown variant="intro" onComplete={finishIntro} />
        <p className="scissors-intro-hint">Clicca per entrare</p>
      </div>
    </div>
  );
}
