import { describe, expect, it } from "vitest";
import { buildIcs, formatIcsUtc, googleCalendarUrl } from "./ics";

describe("ics", () => {
  const startsAt = new Date("2026-09-01T07:30:00.000Z");
  const endsAt = new Date("2026-09-01T07:55:00.000Z");

  it("formats UTC stamps without milliseconds", () => {
    expect(formatIcsUtc(startsAt)).toBe("20260901T073000Z");
  });

  it("includes VALARM 30 minutes before and the Benevento address", () => {
    const ics = buildIcs({
      uid: "test-uid@polesebarbershop.it",
      startsAt,
      endsAt,
      summary: "Polese Barbershop — Taglio Pro",
      description: "Taglio Pro con Felice",
      stamp: startsAt,
    });
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VALARM");
    expect(ics).toContain("TRIGGER:-PT30M");
    expect(ics).toContain("ACTION:DISPLAY");
    expect(ics).toContain("DTSTART:20260901T073000Z");
    expect(ics).toContain("DTEND:20260901T075500Z");
    expect(ics).toContain("Corso Dante Alighieri");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics.endsWith("\r\n")).toBe(true);
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
