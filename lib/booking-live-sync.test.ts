import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("booking live sync (mobile / gestionale)", () => {
  it("exports notify + subscribe helpers", async () => {
    const mod = await import("./booking-live-sync");
    expect(typeof mod.notifyAgendaChanged).toBe("function");
    expect(typeof mod.subscribeAgendaLiveReload).toBe("function");
    expect(mod.BOOKING_AGENDA_SYNC_KEY).toMatch(/agenda/);
  });

  it("booking flow fetches availability with no-store and live reload", () => {
    const src = readFileSync(
      join(process.cwd(), "components/booking/FreshaBookingFlow.tsx"),
      "utf8",
    );
    expect(src).toMatch(/cache:\s*[\"']no-store[\"']/);
    expect(src).toMatch(/subscribeAgendaLiveReload/);
    expect(src).toMatch(/_ts/);
  });

  it("gestionale notifies agenda changes after mutations", () => {
    const src = readFileSync(
      join(process.cwd(), "components/gestionale/GestionalePanel.tsx"),
      "utf8",
    );
    expect(src).toMatch(/notifyAgendaChanged/);
    expect(src).toMatch(/notifyAgendaChanged\("walk-in"\)/);
    expect(src).toMatch(/notifyAgendaChanged\("block"\)/);
  });
});
