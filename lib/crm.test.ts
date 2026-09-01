import { describe, expect, it } from "vitest";
import { aggregateClients, aggregateStats, type CrmAppointment } from "./crm";

function appt(overrides: Partial<CrmAppointment> & Pick<CrmAppointment, "id" | "startsAt" | "status">): CrmAppointment {
  return {
    barberId: "felice",
    barberName: "Felice",
    serviceIds: ["taglio-standard"],
    serviceNames: "Taglio classico",
    firstName: "Mario",
    lastName: "Rossi",
    phone: "+393331112233",
    email: "mario@example.com",
    endsAt: overrides.startsAt,
    durationMin: 30,
    priceCents: 1500,
    isWalkIn: false,
    notes: null,
    dateLabel: overrides.startsAt.slice(0, 10),
    ...overrides,
  };
}

describe("CRM stats aggregation", () => {
  const rows: CrmAppointment[] = [
    appt({ id: "1", startsAt: "2026-09-01T08:00:00.000Z", status: "completed", priceCents: 1500, dateLabel: "2026-09-01" }),
    appt({
      id: "2",
      startsAt: "2026-09-02T08:00:00.000Z",
      status: "cancelled",
      priceCents: 5000,
      serviceIds: ["taglio-pro"],
      serviceNames: "Taglio completo",
      dateLabel: "2026-09-02",
    }),
    appt({
      id: "3",
      startsAt: "2026-09-02T10:00:00.000Z",
      status: "walk_in",
      priceCents: 500,
      firstName: "Luca",
      lastName: "Bianchi",
      phone: "+393339998877",
      email: "luca@example.com",
      barberId: "davide",
      barberName: "Davide",
      serviceIds: ["barba-standard"],
      serviceNames: "Rifinitura barba",
      isWalkIn: true,
      dateLabel: "2026-09-02",
    }),
  ];

  it("counts cancelled visits in history and visit totals, not in spend", () => {
    const clients = aggregateClients(rows);
    const mario = clients.find((c) => c.email === "mario@example.com");
    expect(mario).toBeTruthy();
    expect(mario!.visitCount).toBe(2);
    expect(mario!.cancelledCount).toBe(1);
    expect(mario!.spendCents).toBe(1500);
    expect(mario!.history.some((h) => h.cancelled)).toBe(true);
    expect(mario!.services.map((s) => s.name).sort()).toEqual(["Taglio classico", "Taglio completo"]);
    expect(mario!.lastVisitStatus).toBe("cancelled");
  });

  it("computes cancel rate, visits per client, frequent services and takings", () => {
    const stats = aggregateStats(rows, { date: "2026-09-02" });
    expect(stats.totalClients).toBe(2);
    expect(stats.totalVisits).toBe(3);
    expect(stats.cancelledCount).toBe(1);
    expect(stats.cancelRate).toBeCloseTo(1 / 3);
    expect(stats.visitsPerClient).toBeCloseTo(1.5);
    expect(stats.mostFrequentServices[0]?.count).toBe(1);
    expect(stats.takings.dayCents).toBe(500);
    expect(stats.takings.weekCents).toBe(2000);
    expect(stats.takingsByBarber.find((b) => b.barberId === "davide")?.cents).toBe(500);
    expect(stats.takingsByBarber.find((b) => b.barberId === "felice")?.cents).toBe(1500);
  });

  it("returns empty-state zeros with no appointments", () => {
    const stats = aggregateStats([], { date: "2026-09-01" });
    expect(stats.totalClients).toBe(0);
    expect(stats.totalVisits).toBe(0);
    expect(stats.cancelRate).toBe(0);
    expect(stats.takings.dayCents).toBe(0);
    expect(aggregateClients([])).toEqual([]);
  });

  it("does not merge anonymous walk-ins without contact into one client", () => {
    const walkins = [
      appt({
        id: "w1",
        startsAt: "2026-09-03T08:00:00.000Z",
        status: "walk_in",
        firstName: "Walk-in",
        lastName: "",
        phone: "",
        email: "",
        isWalkIn: true,
        dateLabel: "2026-09-03",
      }),
      appt({
        id: "w2",
        startsAt: "2026-09-03T09:00:00.000Z",
        status: "walk_in",
        firstName: "Walk-in",
        lastName: "",
        phone: "",
        email: "",
        isWalkIn: true,
        dateLabel: "2026-09-03",
      }),
    ];
    expect(aggregateClients(walkins)).toHaveLength(2);
  });
});
