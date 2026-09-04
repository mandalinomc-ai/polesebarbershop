"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ScissorsIcon } from "@/components/site/ScissorsIcon";
import { OpeningCountdown } from "@/components/site/OpeningCountdown";
import { HERO_SLOT_CTA, SITE, isPreOpeningCountdownVisible } from "@/lib/site-config";

const INTRO_KEY = "felice-polese-scissors-intro-seen";
const TENSION_MS = 420;
const SCISSORS_MS = 1100;
const SNIP_MS = 320;
const CUT_MS = 980;
const REVEAL_HOLD_MS = 3800;

type Phase = "hidden" | "dark" | "tension" | "scissors" | "snip" | "cutting" | "reveal";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Brief full-screen intro: dark → tension → chrome scissors snip → panels cut open → brand. */
export function ScissorsIntro() {
  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState<Phase>("hidden");
  const timersRef = useRef<number[]>([]);
  const finishedRef = useRef(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<Phase>("hidden");
  const cutDoneRef = useRef(false);

  function clearIntroTimers() {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }

  function setIntroPhase(next: Phase) {
    phaseRef.current = next;
    setPhase(next);
    if (next === "reveal") cutDoneRef.current = true;
  }

  function canDismiss(): boolean {
    return phaseRef.current === "reveal";
  }

  function finishIntro() {
    if (finishedRef.current) return;
    if (!canDismiss()) return;
    finishedRef.current = true;
    clearIntroTimers();
    overlayRef.current?.style.setProperty("display", "none");
    document.body.classList.remove("scissors-intro-active");
    try {
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch {
      /* private mode */
    }
    setActive(false);
    phaseRef.current = "hidden";
    setPhase("hidden");
  }

  function requestDismiss() {
    if (canDismiss()) finishIntro();
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    const img = new Image();
    img.src = "/assets/3d/shear-intro.png";

    try {
      if (sessionStorage.getItem(INTRO_KEY) === "1") return;
    } catch {
      /* continue without persistence */
    }

    if (prefersReducedMotion()) {
      try {
        sessionStorage.setItem(INTRO_KEY, "1");
      } catch {
        /* ignore */
      }
      return;
    }

    finishedRef.current = false;
    cutDoneRef.current = false;
    setActive(true);
    setIntroPhase("dark");
    document.body.classList.add("scissors-intro-active");

    const schedule = (fn: () => void, ms: number) => {
      timersRef.current.push(window.setTimeout(fn, ms));
    };

    schedule(() => {
      if (!finishedRef.current) setIntroPhase("tension");
    }, TENSION_MS);
    schedule(() => {
      if (!finishedRef.current) setIntroPhase("scissors");
    }, TENSION_MS + 280);
    schedule(() => {
      if (!finishedRef.current) setIntroPhase("snip");
    }, TENSION_MS + SCISSORS_MS);
    schedule(() => {
      if (!finishedRef.current) setIntroPhase("cutting");
    }, TENSION_MS + SCISSORS_MS + SNIP_MS);
    schedule(() => {
      if (!finishedRef.current) {
        cutDoneRef.current = true;
        setIntroPhase("reveal");
      }
    }, TENSION_MS + SCISSORS_MS + SNIP_MS + CUT_MS);
    schedule(
      () => finishIntro(),
      TENSION_MS + SCISSORS_MS + SNIP_MS + CUT_MS + REVEAL_HOLD_MS,
    );
    schedule(() => finishIntro(), 12000);

    return () => {
      clearIntroTimers();
      document.body.classList.remove("scissors-intro-active");
    };
  }, []);

  useLayoutEffect(() => {
    if (!active || phase === "hidden") {
      document.body.classList.remove("scissors-intro-active");
    }
  }, [active, phase]);

  if (!active || phase === "hidden") return null;

  const showShears =
    phase === "scissors" || phase === "snip" || phase === "cutting";

  return (
    <div
      ref={overlayRef}
      className={`scissors-intro scissors-intro--${phase}`}
      role="dialog"
      aria-label="Felice Polese Barber Shop"
      tabIndex={0}
      onPointerUp={(e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        requestDismiss();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          requestDismiss();
        }
        if (e.key === "Escape" && canDismiss()) finishIntro();
      }}
    >
      <div
        className="scissors-intro-split scissors-intro-split--left"
        onAnimationEnd={() => {
          if (phaseRef.current === "cutting") cutDoneRef.current = true;
        }}
      />
      <div
        className="scissors-intro-split scissors-intro-split--right"
        onAnimationEnd={() => {
          if (phaseRef.current === "cutting") cutDoneRef.current = true;
        }}
      />
      <div className="scissors-intro-cutline" aria-hidden="true" />
      {showShears ? (
        <div className="scissors-intro-shears" aria-hidden="true">
          <div className="scissors-intro-stage">
            <ScissorsIcon variant="intro" />
          </div>
        </div>
      ) : null}
      <div className="scissors-intro-content">
        {phase === "reveal" ? (
          <div className="scissors-intro-brand">
            <p className="scissors-intro-brand-name">{SITE.brand}</p>
            <p className="scissors-intro-brand-tag">{SITE.tagline}</p>
            <p className="scissors-intro-brand-city">{SITE.city} · Italy</p>
            {isPreOpeningCountdownVisible() ? (
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
