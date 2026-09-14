import { describe, expect, it } from "vitest";
import { CONFIG_CALENDAR_BLOCKS, busyMinutesFromBlocks } from "@/lib/booking/calendar-blocks";
import { BOOKING_BUFFER_MINUTES, chairBlockMinutes } from "@/lib/booking";
import {
  SERVICES,
  WHATSAPP_ONLY_SERVICE_IDS,
  OFFICIAL_DURATION_MIN,
  getService,
  isWhatsAppOnlyService,
  onlineBookingBlockReason,
  servicesAreOnlineBookable,
} from "@/lib/catalog";
import { getWhatsAppConsulenzaUrl } from "@/lib/site-config";
import { DEFAULT_ADMIN_PASSWORD, verifyAdminCredentials } from "@/lib/admin-auth";
import { countsTowardStats } from "@/lib/crm";

describe("master update self-check", () => {
  it("hardcodes lunch 13:00–14:00 on open weekdays", () => {
    expect(CONFIG_CALENDAR_BLOCKS.some((b) => b.kind === "lunch" && b.start === "13:00" && b.end === "14:00")).toBe(
      true,
    );
    const tue = busyMinutesFromBlocks("2026-09-08"); // Tuesday
    expect(tue.some((w) => w.startMin === 13 * 60 && w.endMin === 14 * 60)).toBe(true);
  });

  it("keeps Taglio Standard at exactly 30 minutes (client-facing; no public rounding)", () => {
    expect(getService("taglio-standard")?.durationMin).toBe(30);
    expect(OFFICIAL_DURATION_MIN["taglio-standard"]).toBe(30);
    // Client-facing end = service only; operational buffer stays internal/hidden.
    expect(chairBlockMinutes(30)).toBe(30 + BOOKING_BUFFER_MINUTES);
  });

  it("marks barba/standard as WhatsApp-only with dynamic consulenza link", () => {
    for (const id of ["taglio-standard", "barba-pro", "barba-standard"]) {
      expect(isWhatsAppOnlyService(id)).toBe(true);
      expect(WHATSAPP_ONLY_SERVICE_IDS).toContain(id);
    }
    const svc = getService("barba-pro")!;
    expect(servicesAreOnlineBookable([svc])).toBe(false);
    expect(onlineBookingBlockReason([svc])).toMatch(/WhatsApp/i);
    const url = getWhatsAppConsulenzaUrl(svc.name);
    expect(url).toContain("wa.me/");
    expect(url).toContain(encodeURIComponent("Salve vorrei una consulenza per Barba Pro"));
  });

  it("requires gestionale password smda2026 by default", () => {
    expect(DEFAULT_ADMIN_PASSWORD).toBe("smda2026");
    expect(verifyAdminCredentials("admin", "smda2026")).toBe(true);
    expect(verifyAdminCredentials("admin", "admin")).toBe(false);
  });

  it("soft-excludes revenue when excludeFromStats is set", () => {
    expect(countsTowardStats({ status: "confirmed", excludeFromStats: false })).toBe(true);
    expect(countsTowardStats({ status: "confirmed", excludeFromStats: true })).toBe(false);
    expect(countsTowardStats({ status: "pending" })).toBe(false);
  });

  it("keeps other catalog services online-bookable", () => {
    const online = SERVICES.filter((s) => !s.whatsAppOnly && s.active);
    expect(online.length).toBeGreaterThan(0);
    expect(servicesAreOnlineBookable([online[0]!])).toBe(true);
  });
});
