import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GMAIL_MISSING_IT,
  customerCancelEmail,
  customerConfirmEmail,
  isGmailConfigured,
  ownerCancelEmail,
  ownerNewBookingEmail,
  sendEmail,
} from "./email";
import { CANCEL_NOTICE_IT } from "./site-config";

describe("sendEmail", () => {
  const origUser = process.env.GMAIL_USER;
  const origPass = process.env.GMAIL_APP_PASSWORD;
  const origAdmin = process.env.ADMIN_EMAIL;

  afterEach(() => {
    if (origUser === undefined) delete process.env.GMAIL_USER;
    else process.env.GMAIL_USER = origUser;
    if (origPass === undefined) delete process.env.GMAIL_APP_PASSWORD;
    else process.env.GMAIL_APP_PASSWORD = origPass;
    if (origAdmin === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = origAdmin;
    vi.restoreAllMocks();
  });

  it("degrades cleanly when GMAIL_USER is missing", async () => {
    delete process.env.GMAIL_USER;
    delete process.env.GMAIL_APP_PASSWORD;
    const result = await sendEmail({
      to: "mario@example.com",
      subject: "test",
      html: "<p>test</p>",
    });
    expect(isGmailConfigured()).toBe(false);
    expect(result.ok).toBe(false);
    expect(result.skipped).toBe(true);
    if (!result.ok) expect(result.error).toBe(GMAIL_MISSING_IT);
  });

  it("treats a short password as missing", async () => {
    process.env.GMAIL_USER = "felicepolese550@gmail.com";
    process.env.GMAIL_APP_PASSWORD = "short";
    expect(isGmailConfigured()).toBe(false);
  });

  it("detects configured Gmail when env vars are set", () => {
    process.env.GMAIL_USER = "felicepolese550@gmail.com";
    process.env.GMAIL_APP_PASSWORD = "abcdefghijklmnop";
    expect(isGmailConfigured()).toBe(true);
  });

  it("reports configured when Gmail env vars are set", () => {
    process.env.GMAIL_USER = "felicepolese550@gmail.com";
    process.env.GMAIL_APP_PASSWORD = "abcdefghijklmnop";
    expect(isGmailConfigured()).toBe(true);
  });
});

describe("booking email copy", () => {
  it("uses the Italian customer confirmation with 30 minuti notice and optional manage link", () => {
    const mail = customerConfirmEmail({
      firstName: "Mario",
      service: "Taglio completo",
      barber: "Felice",
      date: "martedì 1 settembre 2026",
      time: "09:30",
      manageUrl: "https://polesebarbershop.vercel.app/appuntamento/abc",
    });
    expect(mail.text).toContain(
      "Ciao Mario, la tua prenotazione da Felice Polese Barber Shop è confermata! 💈",
    );
    expect(mail.text).toContain("📅 Data e Ora: martedì 1 settembre 2026 alle 09:30");
    expect(mail.text).toContain("✂️ Servizio: Taglio completo");
    expect(mail.text).toContain("👤 Barber: Felice");
    expect(mail.text).toContain("📍 Dove siamo: Corso Dante 45");
    expect(mail.text).toContain(`almeno ${CANCEL_NOTICE_IT} di anticipo`);
    expect(mail.text).toContain("Ti aspettiamo! 🔥");
    expect(mail.text).toContain("Gestisci o disdici: https://polesebarbershop.vercel.app/appuntamento/abc");
    expect(mail.text).not.toMatch(/24h|24 ore|3 ore/);
    expect(mail.html).toContain("Felice Polese Barber Shop");
    expect(mail.html).toContain("Gestisci o disdici");

    const noLink = customerConfirmEmail({
      firstName: "Mario",
      service: "Taglio completo",
      barber: "Felice",
      date: "martedì 1 settembre 2026",
      time: "09:30",
    });
    expect(noLink.text).not.toContain("Gestisci o disdici");
  });

  it("puts every customer field on the owner NUOVA PRENOTAZIONE mail", () => {
    const mail = ownerNewBookingEmail({
      firstName: "Mario",
      lastName: "Rossi",
      phone: "+393331112233",
      email: "mario@example.com",
      service: "Taglio completo + Barba completa",
      durationMin: 45,
      barber: "Felice",
      date: "martedì 1 settembre 2026",
      time: "09:30",
      priceLabel: "65 €",
      notes: "Allergia al nichel",
      manageUrl: "https://polesebarbershop.vercel.app/appuntamento/abc",
    });
    expect(mail.subject).toMatch(/^NUOVA PRENOTAZIONE/);
    expect(mail.text).toContain("Nome: Mario");
    expect(mail.text).toContain("Cognome: Rossi");
    expect(mail.text).toContain("Telefono: +393331112233");
    expect(mail.text).toContain("Email: mario@example.com");
    expect(mail.text).toContain("Servizio/i: Taglio completo + Barba completa");
    expect(mail.text).toContain("Durata: 45 min");
    expect(mail.text).toContain("Prezzo: 65 €");
    expect(mail.text).toContain("Barbiere: Felice");
    expect(mail.text).toContain("Data: martedì 1 settembre 2026");
    expect(mail.text).toContain("Ora: 09:30");
    expect(mail.text).toContain("Note: Allergia al nichel");
    expect(mail.text).toContain("Gestisci: https://polesebarbershop.vercel.app/appuntamento/abc");
  });

  it("mentions 30 minuti on cancel emails", () => {
    const customer = customerCancelEmail({
      firstName: "Mario",
      service: "Taglio completo",
      date: "martedì 1 settembre 2026",
      time: "09:30",
    });
    expect(customer.text).toContain(CANCEL_NOTICE_IT);
    expect(customer.text).not.toMatch(/24h|24 ore|3 ore/);
    const owner = ownerCancelEmail({
      firstName: "Mario",
      lastName: "Rossi",
      email: "mario@example.com",
      service: "Taglio completo",
      date: "martedì 1 settembre 2026",
      time: "09:30",
    });
    expect(owner.text).toContain(CANCEL_NOTICE_IT);
  });

  it("opens the customer confirm with Ciao {nome} and 30 minuti di anticipo", async () => {
    const { customerConfirmEmail } = await import("./email");
    const mail = customerConfirmEmail({
      firstName: "Mario",
      service: "Taglio completo",
      barber: "Felice",
      date: "martedì 1 settembre 2026",
      time: "09:30",
      manageUrl: "https://polesebarbershop.vercel.app/appuntamento/abc",
      priceLabel: "da 25 €",
    });
    expect(mail.text).toMatch(/^Ciao Mario,/);
    expect(mail.text).toMatch(/Felice Polese Barber Shop è confermata/);
    expect(mail.text).toMatch(/Corso Dante 45/);
    expect(mail.text).toMatch(/30 minuti di anticipo/);
    expect(mail.text).toMatch(/Taglio completo/);
    expect(mail.text).toMatch(/Felice/);
    expect(mail.html).toMatch(/Ciao Mario/);
    expect(mail.html).toMatch(/30 minuti/);
    expect(mail.html).toMatch(/Gestisci o disdici/);
  });

  it("sends the barber every client field", async () => {
    const { ownerNewBookingEmail } = await import("./email");
    const mail = ownerNewBookingEmail({
      firstName: "Mario",
      lastName: "Rossi",
      phone: "+393331112233",
      email: "mario@example.com",
      service: "Taglio completo",
      durationMin: 45,
      barber: "Felice",
      date: "martedì 1 settembre 2026",
      time: "09:30",
      priceLabel: "da 25 €",
      notes: "Sponde basse",
      manageUrl: "https://polesebarbershop.vercel.app/appuntamento/abc",
    });
    expect(mail.subject).toMatch(/Mario Rossi/);
    for (const value of [
      "Mario",
      "Rossi",
      "+393331112233",
      "mario@example.com",
      "Taglio completo",
      "45 min",
      "Felice",
      "da 25 €",
      "Sponde basse",
      "martedì 1 settembre 2026",
      "09:30",
    ]) {
      expect(mail.text).toContain(value);
      expect(mail.html).toContain(value);
    }
  });
});
