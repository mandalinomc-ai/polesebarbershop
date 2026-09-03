import { describe, expect, it } from "vitest";
import { getService, resolveServices, totalsForServices } from "@/lib/catalog";
import {
  BOOKING_BUFFER_MINUTES,
  SLOT_INTERVAL_MINUTES,
  blockEndFromStart,
  candidateStartLabels,
  chairBlockMinutes,
  clientEndFromStart,
  isIntervalFree,
  overlaps,
  wallTimeToUtc,
} from "@/lib/booking";
import {
  getAvailableSlots,
  getScheduleSlots,
  isClosedDay,
} from "@/lib/availability";
import { occupiesSlot } from "@/lib/appointments";

const TUESDAY = "2026-09-08";
const SUNDAY = "2026-09-06";
const nowBefore = wallTimeToUtc("2026-08-31", "09:00");

describe("booking constants", () => {
  it("uses 5 min operational buffer and 5 min slot interval", () => {
    expect(BOOKING_BUFFER_MINUTES).toBe(5);
    expect(SLOT_INTERVAL_MINUTES).toBe(5);
  });
});

describe("overlaps — semi-open [start, end)", () => {
  it("treats touching endpoints as free (no overlap)", () => {
    const a0 = wallTimeToUtc(TUESDAY, "10:00");
    const a1 = wallTimeToUtc(TUESDAY, "10:55");
    const b0 = wallTimeToUtc(TUESDAY, "10:55");
    const b1 = wallTimeToUtc(TUESDAY, "11:50");
    expect(overlaps(a0, a1, b0, b1)).toBe(false);
  });

  it("detects interior overlap", () => {
    const a0 = wallTimeToUtc(TUESDAY, "10:00");
    const a1 = wallTimeToUtc(TUESDAY, "10:55");
    const b0 = wallTimeToUtc(TUESDAY, "10:50");
    const b1 = wallTimeToUtc(TUESDAY, "11:40");
    expect(overlaps(a0, a1, b0, b1)).toBe(true);
  });
});

describe("buffer math", () => {
  it("Taglio Pro 50 min → client 50, chair block 55", () => {
    const taglioPro = getService("taglio-pro");
    expect(taglioPro).toMatchObject({ priceEuro: 25, durationMin: 50 });
    expect(chairBlockMinutes(taglioPro!.durationMin)).toBe(55);
    const start = wallTimeToUtc(TUESDAY, "10:00");
    expect(clientEndFromStart(start, 50).toISOString()).toBe(
      wallTimeToUtc(TUESDAY, "10:50").toISOString(),
    );
    expect(blockEndFromStart(start, 50).toISOString()).toBe(
      wallTimeToUtc(TUESDAY, "10:55").toISOString(),
    );
  });

  it("multi-service sums catalog durations then adds one buffer", () => {
    const services = resolveServices(["taglio-pro", "barba-pro"]);
    expect(services).not.toBeNull();
    const totals = totalsForServices(services!);
    // 50 + 20 = 70 client; chair = 75
    expect(totals.durationMin).toBe(70);
    expect(totals.durationLabel).toBe("70 min");
    expect(chairBlockMinutes(totals.durationMin)).toBe(75);
  });
});

describe("candidate starts", () => {
  it("fits block (service+buffer) inside open hours every 5 min", () => {
    // Tue 08:30–19:00, Taglio Pro 50+5=55 → last start 18:05
    const labels = candidateStartLabels("08:30", "19:00", 50);
    expect(labels[0]).toBe("08:30");
    expect(labels.at(-1)).toBe("18:05");
    expect(labels).toContain("10:00");
    expect(labels).not.toContain("18:10");
  });
});

describe("smart engine integration", () => {
  it("blocks next starts inside the operational buffer after a booking", () => {
    // Stored ends_at includes buffer (10:00 Taglio Pro → block until 10:55)
    const busyStart = wallTimeToUtc(TUESDAY, "10:00");
    const busyEnd = wallTimeToUtc(TUESDAY, "10:55");
    const slots = getAvailableSlots({
      date: TUESDAY,
      barberId: "felice",
      durationMinutes: 50,
      now: nowBefore,
      appointments: [{ barberId: "felice", startsAt: busyStart, endsAt: busyEnd }],
    });
    const labels = slots.map((s) => s.label);
    expect(labels).not.toContain("10:00");
    expect(labels).not.toContain("10:50");
    expect(labels).toContain("10:55");
  });

  it("client-facing endIso is service-only; blockEndIso includes buffer", () => {
    const slots = getScheduleSlots({
      date: TUESDAY,
      barberId: "felice",
      durationMinutes: 50,
      now: nowBefore,
    });
    const ten = slots.find((s) => s.label === "10:00");
    expect(ten?.endIso).toBe(wallTimeToUtc(TUESDAY, "10:50").toISOString());
    expect(ten?.blockEndIso).toBe(wallTimeToUtc(TUESDAY, "10:55").toISOString());
  });

  it("assigns the free chair when anyone is selected", () => {
    const busyStart = wallTimeToUtc(TUESDAY, "11:00");
    const busyEnd = wallTimeToUtc(TUESDAY, "11:55");
    const slot = getAvailableSlots({
      date: TUESDAY,
      barberId: "anyone",
      durationMinutes: 50,
      now: nowBefore,
      appointments: [{ barberId: "felice", startsAt: busyStart, endsAt: busyEnd }],
    }).find((s) => s.label === "11:00");
    expect(slot?.barberId).toBe("davide");
  });

  it("returns no slots on closed Sunday", () => {
    expect(isClosedDay(SUNDAY)).toBe(true);
    expect(
      getAvailableSlots({
        date: SUNDAY,
        barberId: "felice",
        durationMinutes: 50,
        now: nowBefore,
      }),
    ).toEqual([]);
  });

  it("cancelled status does not occupy a slot", () => {
    expect(occupiesSlot("cancelled")).toBe(false);
    expect(occupiesSlot("confirmed")).toBe(true);
  });

  it("filters past starts for today via min notice", () => {
    const lateMorning = wallTimeToUtc(TUESDAY, "11:00");
    const slots = getAvailableSlots({
      date: TUESDAY,
      barberId: "felice",
      durationMinutes: 50,
      now: lateMorning,
      minNoticeMinutes: 15,
    });
    expect(slots.every((s) => s.start >= wallTimeToUtc(TUESDAY, "11:15"))).toBe(
      true,
    );
    expect(slots.map((s) => s.label)).not.toContain("11:00");
  });

  it("double-book: second identical start is not free once first occupies the chair", () => {
    const start = wallTimeToUtc(TUESDAY, "14:00");
    const blockEnd = blockEndFromStart(start, 50);
    expect(
      isIntervalFree(start, blockEnd, [{ start, end: blockEnd }]),
    ).toBe(false);
    const after = getAvailableSlots({
      date: TUESDAY,
      barberId: "felice",
      durationMinutes: 50,
      now: nowBefore,
      appointments: [{ barberId: "felice", startsAt: start, endsAt: blockEnd }],
    });
    expect(after.map((s) => s.label)).not.toContain("14:00");
  });

  it("multi-service block fits only when 75 min remain before close", () => {
    const services = resolveServices(["taglio-pro", "barba-pro"])!;
    const duration = totalsForServices(services).durationMin;
    const slots = getAvailableSlots({
      date: TUESDAY,
      barberId: "felice",
      durationMinutes: duration,
      now: nowBefore,
    });
    // 70+5=75; last start 19:00-75 = 17:45
    expect(slots[0]?.label).toBe("08:30");
    expect(slots.at(-1)?.label).toBe("17:45");
    expect(slots.at(-1)?.blockEndIso).toBe(
      wallTimeToUtc(TUESDAY, "19:00").toISOString(),
    );
  });
});
