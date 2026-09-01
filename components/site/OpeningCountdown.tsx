"use client";

import { useEffect, useState } from "react";
import { SITE } from "@/lib/site-config";
import { formatItalianDate } from "@/lib/availability";
import { ScissorsIcon } from "@/components/site/ScissorsIcon";

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

function openingTargetMs(): number {
  return Date.parse(`${SITE.openingDate}T10:00:00+02:00`);
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
      <div className="scissors-anim" aria-hidden="true">
        <ScissorsIcon variant="countdown" />
      </div>
      <p className="opening-countdown-label">
        Apertura ufficiale · {formatItalianDate(SITE.openingDate)}
      </p>
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
        {remain.done ? <p className="countdown-done">Apertura imminente.</p> : null}
      </div>
    </div>
  );
}
