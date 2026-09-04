import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BOOKING_EMAIL_DISABLED, sendBookingEmails } from "./email";
import {
  getBookingConfirmWhatsAppUrl,
  getBookingWhatsAppSummaryMessage,
  isPreOpeningCountdownVisible,
  openingTargetMs,
  SITE,
} from "./site-config";

const FLOW = readFileSync(
  resolve(__dirname, "../components/booking/FreshaBookingFlow.tsx"),
  "utf8",
);

describe("emergency WhatsApp-only booking success", () => {
  it("disables booking confirmation email sends", () => {
    expect(BOOKING_EMAIL_DISABLED).toBe(true);
  });

  it("skips SMTP when booking emails are disabled", async () => {
    const result = await sendBookingEmails({
      customerEmail: "mario@example.com",
      customer: {
        subject: "test",
        text: "test",
        html: "<p>test</p>",
      },
      owner: {
        subject: "NUOVA PRENOTAZIONE",
        text: "NUOVA PRENOTAZIONE",
        html: "<p>NUOVA PRENOTAZIONE</p>",
      },
      ics: { filename: "test.ics", content: "BEGIN:VCALENDAR" },
    });
    expect(result.customer.ok).toBe(true);
    expect(result.customer.skipped).toBe(true);
    expect(result.owner.ok).toBe(true);
  });

  it("counts down to 19:00 Europe/Rome on opening day", () => {
    expect(openingTargetMs()).toBe(Date.parse("2026-09-07T19:00:00+02:00"));
  });

  it("hides pre-opening countdown from 7 Sept 2026 (Rome)", () => {
    expect(isPreOpeningCountdownVisible(new Date("2026-09-06T23:59:00+02:00"))).toBe(true);
    expect(isPreOpeningCountdownVisible(new Date("2026-09-07T00:00:00+02:00"))).toBe(false);
  });

  it("builds wa.me URL with owner-email summary fields", () => {
    const summary = getBookingWhatsAppSummaryMessage({
      firstName: "Mario",
      lastName: "Rossi",
      phone: "+393331112233",
      email: "mario@example.com",
      service: "Taglio Pro + Barba Pro",
      dateLabel: "martedì 8 settembre 2026",
      timeLabel: "09:30",
      barberName: "Felice",
      priceLabel: "65 €",
      durationMin: 70,
      notes: "Sponde basse",
      manageUrl: "https://felicepolesebarbershop.vercel.app/appuntamento/abc",
    });
    expect(summary).toContain("NUOVA PRENOTAZIONE");
    expect(summary).toContain("Nome: Mario");
    expect(summary).toContain("Cognome: Rossi");
    expect(summary).toContain("Telefono: +393331112233");
    expect(summary).toContain("Email: mario@example.com");
    expect(summary).toContain("Servizio/i: Taglio Pro + Barba Pro");
    expect(summary).toContain("Durata: 70 min");
    expect(summary).toContain("Prezzo: 65 €");
    expect(summary).toContain("Barbiere: Felice");
    expect(summary).toContain("Data: martedì 8 settembre 2026");
    expect(summary).toContain("Ora: 09:30");
    expect(summary).toContain("Note: Sponde basse");
    expect(summary).not.toContain("Gestisci:");

    const url = getBookingConfirmWhatsAppUrl({
      firstName: "Mario",
      lastName: "Rossi",
      phone: "+393331112233",
      email: "mario@example.com",
      service: "Taglio Pro",
      dateLabel: "martedì 8 settembre 2026",
      timeLabel: "09:30",
      barberName: "Felice",
      durationMin: 50,
      priceLabel: "25 €",
    });
    expect(url).toMatch(/^https:\/\/wa\.me\/393270156225\?text=/);
    expect(url).toContain(encodeURIComponent("Nome: Mario"));
    expect(url).toContain(encodeURIComponent("Cognome: Rossi"));
    expect(url).toContain(encodeURIComponent("Servizio/i: Taglio Pro"));
    expect(SITE.whatsapp).toBe("393270156225");
  });

  it("FreshaBookingFlow success UI has no red email warning strings", () => {
    const start = FLOW.indexOf("if (success) {");
    const end = FLOW.indexOf('className="fresha-layout"', start);
    const successBlock = FLOW.slice(start, end > start ? end : undefined);
    expect(successBlock).not.toMatch(/email di conferma non/i);
    expect(successBlock).not.toMatch(/Avviso email al salone/i);
    expect(successBlock).not.toMatch(/non recapitato/i);
    expect(successBlock).not.toMatch(/field-error/);
    expect(successBlock).toContain("btn btn-whatsapp");
    expect(successBlock).toContain("INVIA ORA IL PROMEMORIA APPUNTAMENTO");
    expect(successBlock).toContain("Aggiungi al tuo calendario");
    expect(successBlock.indexOf("success-whatsapp-row")).toBeLessThan(
      successBlock.indexOf("success-actions"),
    );
    expect(successBlock).toContain("Apple Calendar (.ics)");
    expect(successBlock).toContain("Google Calendar");
    expect(successBlock).toContain("success.whatsappUrl");
    expect(FLOW).toContain("getBookingConfirmWhatsAppUrl");
    expect(successBlock).not.toMatch(
      /getWhatsAppUrl\(\)/,
    );
  });
});
