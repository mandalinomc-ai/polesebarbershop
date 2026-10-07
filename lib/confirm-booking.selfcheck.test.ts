import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("conferma prenotazione wizard", () => {
  const src = readFileSync(
    join(process.cwd(), "components/booking/FreshaBookingFlow.tsx"),
    "utf8",
  );

  it("locks chosen start time so Conferma cannot silently no-op", () => {
    expect(src).toMatch(/lockedStartTime/);
    expect(src).toMatch(/setLockedStartTime\(s\.label\)/);
    expect(src).toMatch(/Seleziona di nuovo l'orario e riprova/);
    expect(src).toMatch(/if \(step === 6\)/);
    expect(src).toMatch(/Boolean\(lockedStartTime \|\| slot\?\.label\)/);
  });

  it("does not send autofill-prone website honeypot from the UI", () => {
    expect(src).not.toMatch(/name=\"website\"/);
    expect(src).not.toMatch(/booking-website/);
    expect(src).toMatch(/Never send honeypot from the UI/);
    expect(src).toMatch(/json\.honeypot/);
  });
});
