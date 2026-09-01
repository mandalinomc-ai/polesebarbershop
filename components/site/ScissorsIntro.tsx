"use client";

import { useEffect, useState } from "react";
import { ScissorsIcon } from "@/components/site/ScissorsIcon";

const INTRO_KEY = "polese-scissors-intro-seen";

/** Full-screen intro: 3D scissors open once when the homepage loads. */
export function ScissorsIntro() {
  const [phase, setPhase] = useState<"hidden" | "playing" | "exit">("hidden");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(INTRO_KEY) === "1") return;

    setPhase("playing");
    document.body.classList.add("scissors-intro-active");

    const exitTimer = window.setTimeout(() => setPhase("exit"), 1800);
    const hideTimer = window.setTimeout(() => {
      sessionStorage.setItem(INTRO_KEY, "1");
      setPhase("hidden");
      document.body.classList.remove("scissors-intro-active");
    }, 2400);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
      document.body.classList.remove("scissors-intro-active");
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div
      className={`scissors-intro${phase === "exit" ? " scissors-intro--exit" : ""}`}
      aria-hidden="true"
    >
      <div className="scissors-intro-stage">
        <ScissorsIcon variant="intro" />
      </div>
    </div>
  );
}
