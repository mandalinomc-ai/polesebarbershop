import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("GET /api/admin/recent-bookings", () => {
  const route = readFileSync(join(process.cwd(), "app/api/admin/recent-bookings/route.ts"), "utf8");
  const hook = readFileSync(join(process.cwd(), "components/gestionale/useBookingNotifications.ts"), "utf8");

  it("requires admin auth and filters online bookings since timestamp", () => {
    expect(route).toMatch(/isAdminRequest/);
    expect(route).toMatch(/\.eq\("source", "online"\)/);
    expect(route).toMatch(/\.gt\("created_at", since\)/);
    expect(route).toMatch(/\.neq\("status", "cancelled"\)/);
  });

  it("polls recent-bookings endpoint on an interval and window focus", () => {
    expect(hook).toMatch(/\/api\/admin\/recent-bookings/);
    expect(hook).toMatch(/setInterval/);
    expect(hook).toMatch(/addEventListener\("focus"/);
    expect(hook).toMatch(/BOOKING_POLL_MS/);
  });
});
