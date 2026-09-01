import { describe, expect, it } from "vitest";
import { canCancelAppointment, CANCEL_MINUTES_BEFORE } from "./site-config";

describe("canCancelAppointment", () => {
  const now = new Date("2026-09-08T07:00:00.000Z"); // 09:00 Europe/Rome (CEST)

  it("allows cancellation when more than 30 minutes remain", () => {
    const startsAt = new Date("2026-09-08T08:00:00.000Z"); // 10:00 Rome — 60 min left
    expect(canCancelAppointment(startsAt, now)).toBe(true);
  });

  it("allows cancellation exactly at the 30-minute boundary", () => {
    const startsAt = new Date("2026-09-08T07:30:00.000Z"); // 09:30 Rome — exactly 30 min
    expect(canCancelAppointment(startsAt, now)).toBe(true);
  });

  it("blocks cancellation when less than 30 minutes remain", () => {
    const startsAt = new Date("2026-09-08T07:20:00.000Z"); // 09:20 Rome — 20 min left
    expect(canCancelAppointment(startsAt, now)).toBe(false);
  });

  it("blocks cancellation after the appointment has started", () => {
    const startsAt = new Date("2026-09-08T06:30:00.000Z"); // 08:30 Rome — in the past
    expect(canCancelAppointment(startsAt, now)).toBe(false);
  });

  it("uses CANCEL_MINUTES_BEFORE = 30", () => {
    expect(CANCEL_MINUTES_BEFORE).toBe(30);
  });
});
