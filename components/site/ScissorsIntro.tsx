"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ScissorsIcon } from "@/components/site/ScissorsIcon";
import { OpeningCountdown } from "@/components/site/OpeningCountdown";

const INTRO_KEY = "polese-scissors-intro-seen";

/** Full-screen COMING SOON gate — scissors click or countdown end triggers vertical split reveal. */
export function ScissorsIntro() {
  const [show, setShow] = useState(false);
  const [cutting, setCutting] = useState(false);
  const dismissedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(INTRO_KEY) === "1") return;
    setShow(true);
    document.body.classList.add("scissors-intro-active");
  }, []);

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setCutting(true);
    sessionStorage.setItem(INTRO_KEY, "1");
    window.setTimeout(() => {
      setShow(false);
      document.body.classList.remove("scissors-intro-active");
    }, 900);
  }, []);

  if (!show) return null;

  return (
    <div
      className={`scissors-intro${cutting ? " scissors-intro--cutting" : ""}`}
      aria-hidden={cutting}
    >
      <div className="scissors-intro-split scissors-intro-split--left" />
      <div className="scissors-intro-split scissors-intro-split--right" />
      <div className="scissors-intro-content">
        <button
          type="button"
          className="scissors-intro-trigger"
          onClick={dismiss}
          aria-label="Entra nel sito"
        >
          <div className="scissors-intro-stage">
            <ScissorsIcon variant="intro" />
          </div>
        </button>
        <p className="scissors-intro-soon">COMING SOON</p>
        <OpeningCountdown variant="intro" onComplete={dismiss} />
      </div>
    </div>
  );
}
