"use client";

import { useMemo } from "react";
import { listOpenDayChips } from "@/lib/availability";
import {
  BOOKING_DATE_EVENT,
  BOOKING_DATE_PARAM,
  BOOKING_DATE_STORAGE_KEY,
  bookingWizardHref,
} from "@/lib/site-config";

export function HeroCalendar() {
  const days = useMemo(() => listOpenDayChips(12), []);

  function pick(iso: string) {
    try {
      sessionStorage.setItem(BOOKING_DATE_STORAGE_KEY, iso);
    } catch {
      /* private mode */
    }
    window.dispatchEvent(new CustomEvent(BOOKING_DATE_EVENT, { detail: iso }));
    const url = new URL(window.location.href);
    url.searchParams.set(BOOKING_DATE_PARAM, iso);
    url.hash = "prenota";
    const next = `${url.pathname}?${url.searchParams.toString()}#prenota`;
    window.history.replaceState(null, "", next);
    document.getElementById("prenota")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="hero-calendar">
      <p className="hero-calendar-label">Scegli un giorno</p>
      <div className="day-scroller hero-day-scroller" role="listbox" aria-label="Giorni prenotabili">
        {days.map((d) => (
          <a
            key={d.date}
            className="day-chip"
            href={bookingWizardHref(d.date)}
            onClick={(e) => {
              e.preventDefault();
              pick(d.date);
            }}
          >
            <span className="dow">{d.dow}</span>
            <span className="dom">{d.day}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
