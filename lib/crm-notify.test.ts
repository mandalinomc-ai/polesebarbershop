import { describe, expect, it } from "vitest";
import { buildNotifyCopy, waMeDigits, waMeUrl } from "./crm-notify";
import { SITE } from "./site-config";

describe("free WhatsApp notify (wa.me, no Twilio)", () => {
  it("builds wa.me links with Italian prefill", () => {
    expect(waMeDigits("+39 333 111 2233")).toBe("393331112233");
    const url = waMeUrl("3331112233", `Ciao Mario, ti aspettiamo da ${SITE.name}.`);
    expect(url).toMatch(/^https:\/\/wa\.me\/393331112233\?text=/);
    expect(url).toContain(encodeURIComponent("Ciao Mario"));
    expect(url).not.toMatch(/twilio/i);
  });

  it("returns null without a usable number", () => {
    expect(waMeUrl("", "ciao")).toBeNull();
    expect(waMeUrl("12", "ciao")).toBeNull();
  });

  it("prepares reminder, promo and follow-up copy in Italian", () => {
    const reminder = buildNotifyCopy("reminder", {
      firstName: "Mario",
      dateLabel: "martedì 1 settembre 2026",
      timeLabel: "09:30",
      serviceNames: "Taglio classico",
      barberName: "Felice",
    });
    expect(reminder.subject).toMatch(/Promemoria/);
    expect(reminder.text).toMatch(/Ciao Mario/);
    expect(reminder.text).toMatch(/Felice Polese Barber Shop/);
    expect(buildNotifyCopy("promo", { firstName: "Mario" }).text).toMatch(/taglio/);
    expect(buildNotifyCopy("followup", { firstName: "Mario" }).text).toMatch(/piacere/);
  });
});
