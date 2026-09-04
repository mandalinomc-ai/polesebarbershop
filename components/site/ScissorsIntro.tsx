"use client";

import { useEffect, useState } from "react";
import { ScissorsIcon } from "@/components/site/ScissorsIcon";
import { OpeningCountdown } from "@/components/site/OpeningCountdown";
import { HERO_SLOT_CTA, SITE, isBeforeOfficialOpening } from "@/lib/site-config";

const INTRO_KEY = "felice-polese-scissors-intro-seen";
const TENSION_MS = 500;
const SCISSORS_MS = 1300;
const CUT_MS = 750;
const REVEAL_HOLD_MS = 4200;

type Phase = "hidden" | "dark" | "tension" | "scissors" | "cutting" | "reveal";

/** Brief full-screen intro: dark → tension → chrome scissors → cut → brand + CTA. */
export function ScissorsIntro() {
  const [phase, setPhase] = useState<Phase>("hidden");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(INTRO_KEY) === "1") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      sessionStorage.setItem(INTRO_KEY, "1");
      return;
    }

    setPhase("dark");
    document.body.classList.add("scissors-intro-active");

    const timers = [
      window.setTimeout(() => setPhase("tension"), TENSION_MS),
      window.setTimeout(() => setPhase("scissors"), TENSION_MS + 300),
      window.setTimeout(() => setPhase("cutting"), TENSION_MS + SCISSORS_MS),
      window.setTimeout(() => setPhase("reveal"), TENSION_MS + SCISSORS_MS + CUT_MS),
      window.setTimeout(
        () => finishIntro(),
        TENSION_MS + SCISSORS_MS + CUT_MS + REVEAL_HOLD_MS,
      ),
      /* Hard failsafe — never leave the intro blocking the site */
      window.setTimeout(() => finishIntro(), 9000),
    ];

    return () => {
      timers.forEach(clearTimeout);
      document.body.classList.remove("scissors-intro-active");
    };
  }, []);

  function finishIntro() {
    sessionStorage.setItem(INTRO_KEY, "1");
    setPhase("hidden");
    document.body.classList.remove("scissors-intro-active");
  }

  if (phase === "hidden") return null;

  return (
    <div
      className={`scissors-intro scissors-intro--${phase}`}
      role="dialog"
      aria-label="Felice Polese Barber Shop"
      tabIndex={0}
      onClick={() => finishIntro()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") finishIntro();
      }}
    >
      <div className="scissors-intro-split scissors-intro-split--left" />
      <div className="scissors-intro-split scissors-intro-split--right" />
      <div className="scissors-intro-content">
        {phase === "reveal" ? (
          <div className="scissors-intro-brand">
            <p className="scissors-intro-brand-name">{SITE.brand}</p>
            <p className="scissors-intro-brand-tag">{SITE.tagline}</p>
            <p className="scissors-intro-brand-city">{SITE.city} · Italy</p>
            {isBeforeOfficialOpening() ? (
              <div
                className="scissors-intro-countdown"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <OpeningCountdown />
              </div>
            ) : null}
            <a
              href="/#prenota"
              className="btn btn-ink scissors-intro-cta"
              onClick={(e) => {
                e.stopPropagation();
                finishIntro();
              }}
            >
              {HERO_SLOT_CTA}
            </a>
          </div>
        ) : null}
        {phase === "scissors" || phase === "cutting" ? (
          <>
            <div className="scissors-intro-stage">
              <ScissorsIcon variant="intro" />
            </div>
            <p className="scissors-intro-skip">Tocca per entrare</p>
          </>
        ) : null}
        {phase === "reveal" ? (
          <p className="scissors-intro-skip">Tocca per entrare</p>
        ) : null}
        {phase === "tension" ? (
          <div className="scissors-intro-tension" aria-hidden="true" />
        ) : null}
      </div>
    </div>
  );
}
