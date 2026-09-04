"use client";

import { useEffect, useState } from "react";
import { SITE } from "@/lib/site-config";
import { formatItalianDate } from "@/lib/availability";

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

function openingTargetMs(): number {
  // Official opening 7 Sept 2026, 10:00 Europe/Rome (CEST = UTC+2)
  return Date.parse(`${SITE.openingDate}T10:00:00+02:00`);
}

/** Stable two-digit slots — keys are positions only so digits don't remount crookedly. */
function DigitPair({ value }: { value: string }) {
  const chars = value.padStart(2, "0").slice(-2).split("");
  return (
    <span className="countdown-value" aria-hidden={false}>
      <span className="countdown-digit" data-pos="0">
        {chars[0]}
      </span>
      <span className="countdown-digit" data-pos="1">
        {chars[1]}
      </span>
    </span>
  );
}

export function OpeningCountdown() {
  const [remain, setRemain] = useState({ d: "00", h: "00", m: "00", s: "00", done: false });

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

  return (
    <div className="opening-countdown-block">
      <p className="opening-countdown-label">
        Apertura ufficiale · {formatItalianDate(SITE.openingDate)}
      </p>
      <div id="countdown" className="countdown" aria-live="polite">
        <div className="countdown-item">
          <DigitPair value={remain.d} />
          <span className="countdown-label">Giorni</span>
        </div>
        <div className="countdown-item">
          <DigitPair value={remain.h} />
          <span className="countdown-label">Ore</span>
        </div>
        <div className="countdown-item">
          <DigitPair value={remain.m} />
          <span className="countdown-label">Min</span>
        </div>
        <div className="countdown-item">
          <DigitPair value={remain.s} />
          <span className="countdown-label">Sec</span>
        </div>
        {remain.done ? <p className="countdown-done">Apertura imminente.</p> : null}
      </div>
    </div>
  );
}
