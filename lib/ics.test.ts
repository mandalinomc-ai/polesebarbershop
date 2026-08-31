import { describe, expect, it } from "vitest";
import { buildIcs, formatIcsUtc, googleCalendarUrl, ICS_REMINDER_TRIGGER } from "./ics";
import { REMINDER_LEAD_MINUTES } from "./site-config";

describe("ics", () => {
  const startsAt = new Date("2026-09-01T07:30:00.000Z");
  const endsAt = new Date("2026-09-01T07:55:00.000Z");
  const base = {
    uid: "test-uid@polesebarbershop.it",
    startsAt,
    endsAt,
    summary: "Polese Barbershop — Taglio Pro",
    description: "Taglio Pro con Felice",
    stamp: startsAt,
  };

  it("formats UTC stamps without milliseconds", () => {
    expect(formatIcsUtc(startsAt)).toBe("20260901T073000Z");
  });

  it("includes exactly one VALARM 30 minutes before and the Benevento address", () => {
    expect(REMINDER_LEAD_MINUTES).toBe(30);
    expect(ICS_REMINDER_TRIGGER).toBe("-PT30M");
    const ics = buildIcs(base);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("METHOD:PUBLISH");
    expect(ics).toContain("STATUS:CONFIRMED");
    expect(ics.match(/BEGIN:VALARM/g)).toEqual(["BEGIN:VALARM"]);
    expect(ics.match(/TRIGGER:/g)).toEqual(["TRIGGER:"]);
    expect(ics).toContain("TRIGGER:-PT30M");
    expect(ics).not.toMatch(/TRIGGER:-PT1H/);
    expect(ics).not.toMatch(/TRIGGER:-P1D/);
    expect(ics).not.toMatch(/TRIGGER:-PT1D/);
    expect(ics).not.toMatch(/TRIGGER:-PT60M/);
    expect(ics).toContain("ACTION:DISPLAY");
    expect(ics).toContain("DTSTART:20260901T073000Z");
    expect(ics).toContain("DTEND:20260901T075500Z");
    expect(ics).toContain("Corso Dante Alighieri");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics.endsWith("\r\n")).toBe(true);
  });

  it("includes the manage URL on confirmed events", () => {
    const ics = buildIcs({
      ...base,
      url: "https://polesebarbershop.vercel.app/appuntamento/abc123",
    });
    expect(ics).toContain("https://polesebarbershop.vercel.app/appuntamento/abc123");
    expect(ics).toContain("TRIGGER:-PT30M");
  });

  it("omits VALARM on cancelled events so the 30-min reminder does not fire", () => {
    const ics = buildIcs({ ...base, cancelled: true });
    expect(ics).toContain("METHOD:CANCEL");
    expect(ics).toContain("STATUS:CANCELLED");
    expect(ics).toContain("SEQUENCE:1");
    expect(ics).not.toContain("BEGIN:VALARM");
    expect(ics).not.toContain("TRIGGER:");
    expect(ics).not.toContain("-PT30M");
  });

  it("builds a Google Calendar template URL", () => {
    const url = googleCalendarUrl({
      startsAt,
      endsAt,
      summary: "Polese Barbershop — Taglio Pro",
      description: "Promemoria",
    });
    expect(url).toContain("calendar.google.com");
    expect(url).toContain("20260901T073000Z");
  });
});
