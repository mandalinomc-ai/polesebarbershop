import { describe, expect, it } from "vitest";
import { getService, resolveServices, totalsForServices, servicesAreOnlineBookable } from "@/lib/catalog";
import {
  BOOKING_BUFFER_MINUTES,
  SLOT_INTERVAL_MINUTES,
  TIME_SLOT_INTERVAL_MINUTES,
  blockEndFromStart,
  candidateStartLabels,
  chairBlockMinutes,
  clientEndFromStart,
  effectiveServiceDurationMin,
  freeWindowStarts,
  isIntervalFree,
  overlaps,
  subtractBusyFromWindows,
  wallTimeToUtc,
  workingWindowsFromHours,
} from "@/lib/booking";
import {
  findFirstAvailability,
  getAvailableSlots,
  getScheduleSlots,
  getSmartAvailableSlots,
  isClosedDay,
} from "@/lib/availability";
import { occupiesSlot } from "@/lib/appointments";

const TUESDAY = "2026-09-08";
const SUNDAY = "2026-09-06";
const nowBefore = wallTimeToUtc("2026-08-31", "09:00");

describe("booking constants", () => {
  it("distinguishes buffer vs time-slot interval", () => {
    expect(BOOKING_BUFFER_MINUTES).toBe(5);
    expect(SLOT_INTERVAL_MINUTES).toBe(5);
    expect(TIME_SLOT_INTERVAL_MINUTES).toBe(5);
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
    expect(totals.durationMin).toBe(70);
    expect(totals.durationLabel).toBe("70 min");
    expect(chairBlockMinutes(totals.durationMin)).toBe(75);
  });

  it("durationOverride changes occupancy without mutating catalog", () => {
    const catalog = getService("taglio-pro")!;
    expect(catalog.durationMin).toBe(50);
    expect(effectiveServiceDurationMin(catalog.durationMin, 40)).toBe(40);
    expect(effectiveServiceDurationMin(catalog.durationMin, null)).toBe(50);
    expect(getService("taglio-pro")!.durationMin).toBe(50);
    expect(chairBlockMinutes(effectiveServiceDurationMin(50, 40))).toBe(45);
  });
});

describe("free windows", () => {
  it("builds working windows from shop hours", () => {
    const w = workingWindowsFromHours("08:30", "19:00");
    expect(w).toEqual([{ startMin: 8 * 60 + 30, endMin: 19 * 60 }]);
  });

  it("subtracts busy continuously (no grid snap)", () => {
    const free = subtractBusyFromWindows(
      [{ startMin: 8 * 60 + 30, endMin: 19 * 60 }],
      [{ startMin: 9 * 60, endMin: 9 * 60 + 42 }],
    );
    expect(free).toEqual([
      { startMin: 8 * 60 + 30, endMin: 9 * 60 },
      { startMin: 9 * 60 + 42, endMin: 19 * 60 },
    ]);
  });

  it("NO 5-MINUTE BUG: next start after occupancy end is continuous, not forced +5 grid", () => {
    // Service visually ends 09:37; ends_at already includes +5 buffer → free at 09:42.
    const starts = freeWindowStarts({
      open: "08:30",
      close: "19:00",
      busyLabels: [{ start: "09:00", end: "09:42" }],
      serviceDurationMin: 50,
      displayIntervalMinutes: null,
      mode: "REGULAR",
    });
    const labels = starts.map((s) => s.label);
    expect(labels).toContain("09:42");
    // Old grid bug would skip 09:42 and only offer 09:45 (snap to 5 from open).
    const afterBusy = labels.filter((l) => l >= "09:42");
    expect(afterBusy[0]).toBe("09:42");
    expect(afterBusy[0]).not.toBe("09:45");
  });

  it("fits block into free windows only", () => {
    const starts = freeWindowStarts({
      open: "08:30",
      close: "10:00",
      busyLabels: [{ start: "08:30", end: "09:00" }],
      serviceDurationMin: 50, // 50+5=55 — cannot fit in remaining 60 min window? 09:00-10:00 = 60 >= 55
      displayIntervalMinutes: null,
      mode: "REGULAR",
    });
    expect(starts[0]?.label).toBe("09:00");
    expect(starts.map((s) => s.label)).not.toContain("08:30");
  });

  it("ELIMINATE_GAPS skips windows that leave an unusable leftover", () => {
    // Window 60 min, block 55 → leftover 5 < block → skip under ELIMINATE_GAPS
    const starts = freeWindowStarts({
      open: "09:00",
      close: "10:00",
      serviceDurationMin: 50,
      displayIntervalMinutes: null,
      mode: "ELIMINATE_GAPS",
    });
    expect(starts).toEqual([]);
  });

  it("REDUCE_GAPS ranks window-start as OPTIMAL when leftover usable or zero", () => {
    const starts = freeWindowStarts({
      open: "08:30",
      close: "19:00",
      serviceDurationMin: 50,
      displayIntervalMinutes: null,
      mode: "REDUCE_GAPS",
    });
    expect(starts[0]?.label).toBe("08:30");
    expect(starts[0]?.rank).toBe("OPTIMAL");
  });
});

describe("candidate starts", () => {
  it("fits block (service+buffer) inside open hours every 5 min (empty day)", () => {
    const labels = candidateStartLabels("08:30", "19:00", 50);
    expect(labels[0]).toBe("08:30");
    expect(labels.at(-1)).toBe("18:05");
    expect(labels).toContain("10:00");
    expect(labels).not.toContain("18:10");
  });
});

describe("online bookable services", () => {
  it("blocks services without known duration", () => {
    expect(servicesAreOnlineBookable([getService("taglio-pro")!])).toBe(true);
    expect(servicesAreOnlineBookable([getService("acconciatura")!])).toBe(false);
    expect(servicesAreOnlineBookable(resolveServices(["taglio-pro", "barba-standard"])!)).toBe(false);
  });
});

describe("smart engine integration", () => {
  it("blocks next starts inside the operational buffer after a booking", () => {
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

  it("NO 5-MINUTE BUG via getAvailableSlots", () => {
    const busyStart = wallTimeToUtc(TUESDAY, "09:00");
    const busyEnd = wallTimeToUtc(TUESDAY, "09:42");
    const labels = getAvailableSlots({
      date: TUESDAY,
      barberId: "felice",
      durationMinutes: 25,
      now: nowBefore,
      appointments: [{ barberId: "felice", startsAt: busyStart, endsAt: busyEnd }],
      fullSearch: true,
    }).map((s) => s.label);
    expect(labels).toContain("09:42");
    expect(labels).toContain("08:30");
    const afterBusy = labels.filter((l) => l >= "09:42");
    expect(afterBusy[0]).toBe("09:42");
  });

  it("duration override shortens occupancy so earlier next start opens", () => {
    // Catalog 50+5=55 would block until 10:55; override 30+5=35 → free at 10:35
    const start = wallTimeToUtc(TUESDAY, "10:00");
    const overrideBlockEnd = blockEndFromStart(start, effectiveServiceDurationMin(50, 30));
    expect(overrideBlockEnd.toISOString()).toBe(wallTimeToUtc(TUESDAY, "10:35").toISOString());
    const labels = getAvailableSlots({
      date: TUESDAY,
      barberId: "felice",
      durationMinutes: 50,
      now: nowBefore,
      appointments: [{ barberId: "felice", startsAt: start, endsAt: overrideBlockEnd }],
    }).map((s) => s.label);
    expect(labels).toContain("10:35");
    expect(labels).not.toContain("10:00");
  });

  it("move frees old occupies new — excluding id leaves old start free", () => {
    const start = wallTimeToUtc(TUESDAY, "14:00");
    const blockEnd = blockEndFromStart(start, 50);
    const withSelf = getAvailableSlots({
      date: TUESDAY,
      barberId: "felice",
      durationMinutes: 50,
      now: nowBefore,
      appointments: [{ barberId: "felice", startsAt: start, endsAt: blockEnd }],
    });
    expect(withSelf.map((s) => s.label)).not.toContain("14:00");
    // After move away: empty day again
    const afterMove = getAvailableSlots({
      date: TUESDAY,
      barberId: "felice",
      durationMinutes: 50,
      now: nowBefore,
      appointments: [],
    });
    expect(afterMove.map((s) => s.label)).toContain("14:00");
    // New slot occupied
    const newStart = wallTimeToUtc(TUESDAY, "16:00");
    const newEnd = blockEndFromStart(newStart, 50);
    const atNew = getAvailableSlots({
      date: TUESDAY,
      barberId: "felice",
      durationMinutes: 50,
      now: nowBefore,
      appointments: [{ barberId: "felice", startsAt: newStart, endsAt: newEnd }],
    });
    expect(atNew.map((s) => s.label)).not.toContain("16:00");
    expect(atNew.map((s) => s.label)).toContain("14:00");
  });

  it("client-facing endIso is service-only; blockEndIso includes buffer", () => {
    const slots = getScheduleSlots({
      date: TUESDAY,
      barberId: "felice",
      durationMinutes: 50,
      now: nowBefore,
      fullSearch: true,
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
    expect(slots[0]?.label).toBe("08:30");
    expect(slots.at(-1)?.label).toBe("17:45");
    expect(slots.at(-1)?.blockEndIso).toBe(
      wallTimeToUtc(TUESDAY, "19:00").toISOString(),
    );
  });

  it("smart online slots are thinned vs full search", () => {
    const full = getAvailableSlots({
      date: TUESDAY,
      barberId: "felice",
      durationMinutes: 50,
      now: nowBefore,
      fullSearch: true,
    });
    const smart = getSmartAvailableSlots({
      date: TUESDAY,
      barberId: "felice",
      durationMinutes: 50,
      now: nowBefore,
    });
    expect(smart.length).toBeLessThan(full.length);
    expect(smart[0]?.label).toBe("08:30");
  });

  it("findFirstAvailability returns earliest free start", () => {
    const slot = findFirstAvailability({
      barberId: "felice",
      durationMinutes: 50,
      appointments: [],
      now: nowBefore,
      fromDate: TUESDAY,
      minNoticeMinutes: 0,
    });
    expect(slot?.label).toBe("08:30");
  });
});
