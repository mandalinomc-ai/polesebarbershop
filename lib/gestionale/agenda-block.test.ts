import { describe, expect, it } from "vitest";
import { wallTimeToUtc } from "@/lib/booking/time-utils";
import { BOOKING_BUFFER_MINUTES } from "@/lib/booking";
import {
  formatAgendaBlockLabel,
  formatFreeSlotLabel,
  freeMinutesFromStart,
  newBookingBlockMinutes,
  resolveAppointmentBlock,
  resolveBufferMinutes,
  serviceFitsInFreeMinutes,
} from "./agenda-block";

const DAY = "2026-09-08"; // Tuesday

describe("resolveBufferMinutes", () => {
  it("defaults missing buffer_time to 0", () => {
    expect(resolveBufferMinutes(undefined)).toBe(0);
    expect(resolveBufferMinutes(null)).toBe(0);
    expect(resolveBufferMinutes(0)).toBe(0);
    expect(resolveBufferMinutes(-5)).toBe(0);
    expect(resolveBufferMinutes(10)).toBe(10);
  });
});

describe("resolveAppointmentBlock", () => {
  it("uses endsAt when present (legacy rows stay intact)", () => {
    const start = wallTimeToUtc(DAY, "08:30");
    const end = wallTimeToUtc(DAY, "09:25");
    const block = resolveAppointmentBlock({
      startsAt: start,
      endsAt: end,
      durationMin: 50,
      bufferTime: undefined,
    });
    expect(block.end.getTime()).toBe(end.getTime());
    expect(block.bufferMinutes).toBe(0);
  });

  it("without endsAt and without buffer_time uses duration only", () => {
    const start = wallTimeToUtc(DAY, "08:30");
    const block = resolveAppointmentBlock({
      startsAt: start,
      durationMin: 50,
    });
    expect(block.end.getTime()).toBe(wallTimeToUtc(DAY, "09:20").getTime());
    expect(block.bufferMinutes).toBe(0);
  });

  it("without endsAt applies explicit buffer_time", () => {
    const start = wallTimeToUtc(DAY, "08:30");
    const block = resolveAppointmentBlock({
      startsAt: start,
      durationMin: 50,
      bufferTime: 10,
    });
    expect(block.end.getTime()).toBe(wallTimeToUtc(DAY, "09:30").getTime());
  });
});

describe("labels", () => {
  it("formats occupied and free ranges", () => {
    const start = wallTimeToUtc(DAY, "08:30");
    const end = wallTimeToUtc(DAY, "09:30");
    expect(formatAgendaBlockLabel(start, end, "Giuseppe Coppola - Taglio Pro")).toBe(
      "08:30 – 09:30 | Giuseppe Coppola - Taglio Pro",
    );
    expect(formatFreeSlotLabel("08:30")).toBe("08:30 – 09:00 | LIBERO");
  });
});

describe("freeMinutesFromStart + Fresha fit", () => {
  it("computes gap until next appointment and shop close", () => {
    const free = freeMinutesFromStart({
      date: DAY,
      startTime: "08:30",
      barberId: "felice",
      appointments: [
        {
          barberId: "felice",
          startsAt: wallTimeToUtc(DAY, "09:30"),
          endsAt: wallTimeToUtc(DAY, "10:00"),
          durationMin: 25,
        },
      ],
    });
    expect(free).toBe(60);
  });

  it("returns 0 when start overlaps an existing block", () => {
    const free = freeMinutesFromStart({
      date: DAY,
      startTime: "09:00",
      barberId: "felice",
      appointments: [
        {
          barberId: "felice",
          startsAt: wallTimeToUtc(DAY, "08:30"),
          endsAt: wallTimeToUtc(DAY, "09:30"),
          durationMin: 55,
        },
      ],
    });
    expect(free).toBe(0);
  });

  it("treats service duration as total block when buffer is zero", () => {
    expect(newBookingBlockMinutes(50)).toBe(50 + BOOKING_BUFFER_MINUTES);
    expect(serviceFitsInFreeMinutes(50, 60)).toBe(true);
    expect(serviceFitsInFreeMinutes(50, 50)).toBe(true);
    expect(serviceFitsInFreeMinutes(50, 49)).toBe(false);
  });
});
