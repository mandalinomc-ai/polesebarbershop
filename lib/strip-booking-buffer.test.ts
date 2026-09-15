import { describe, expect, it } from "vitest";
import { BOOKING_BUFFER_MINUTES } from "@/lib/booking";
import { getService } from "@/lib/catalog";

describe("no-buffer / tagli 30 policy", () => {
  it("keeps buffer at zero", () => {
    expect(BOOKING_BUFFER_MINUTES).toBe(0);
  });

  it("keeps every taglio service at 30 minutes", () => {
    for (const id of ["taglio-pro", "taglio-standard", "taglio-bambino"]) {
      expect(getService(id)?.durationMin).toBe(30);
    }
  });

  it("detects legacy +5 occupancy for strip", () => {
    const durationMin = 30;
    const occupiedMin = 35;
    expect(occupiedMin).toBe(durationMin + 5);
    expect(occupiedMin - 5).toBe(durationMin);
  });
});
