"use client";

import { useEffect, useState } from "react";
import {
  formatOpeningCountdownLabel,
  openingTargetMs,
} from "@/lib/site-config";
import { ScissorsIcon } from "@/components/site/ScissorsIcon";

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

type OpeningCountdownProps = {
  variant?: "default" | "intro";
  onComplete?: () => void;
};

export function OpeningCountdown({
  variant = "default",
  onComplete,
}: OpeningCountdownProps) {
  const [remain, setRemain] = useState({
    d: "00",
    h: "00",
    m: "00",
    s: "00",
    done: false,
  });

  useEffect(() => {
    const target = openingTargetMs();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setRemain({ d: "00", h: "00", m: "00", s: "00", done: true });
        return;
      }
      setRemain({
        d: pad(Math.floor(diff / 86400000)),
        h: pad(Math.floor((diff % 86400000) / 3600000)),
        m: pad(Math.floor((diff % 3600000) / 60000)),
        s: pad(Math.floor((diff % 60000) / 1000)),
        done: false,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (remain.done && onComplete) onComplete();
  }, [remain.done, onComplete]);

  if (remain.done) return null;

  const showScissors = variant === "default";
  const label = formatOpeningCountdownLabel();

  return (
    <div
      className={`opening-countdown-block${variant === "intro" ? " opening-countdown-block--intro" : ""}`}
    >
      {showScissors ? (
        <div className="scissors-anim" aria-hidden="true">
          <ScissorsIcon variant="countdown" />
        </div>
      ) : null}
      <p className="opening-countdown-label">{label}</p>
      <div id="countdown" className="countdown" aria-live="polite">
        <div className="countdown-item">
          <span className="countdown-value">{remain.d}</span>
          <span className="countdown-label">Giorni</span>
        </div>
        <div className="countdown-item">
          <span className="countdown-value">{remain.h}</span>
          <span className="countdown-label">Ore</span>
        </div>
        <div className="countdown-item">
          <span className="countdown-value">{remain.m}</span>
          <span className="countdown-label">Min</span>
        </div>
        <div className="countdown-item">
          <span className="countdown-value">{remain.s}</span>
          <span className="countdown-label">Sec</span>
        </div>
      </div>
    </div>
  );
}
