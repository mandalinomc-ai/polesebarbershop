import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RESEND_MISSING_IT,
  customerCancelEmail,
  customerConfirmEmail,
  isResendConfigured,
  ownerCancelEmail,
  ownerNewBookingEmail,
  sendBookingEmails,
  sendEmail,
} from "./email";
import { CANCEL_NOTICE_IT } from "./site-config";

describe("sendEmail", () => {
  const origKey = process.env.RESEND_API_KEY;
  const origFrom = process.env.RESEND_FROM;

  afterEach(() => {
    if (origKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = origKey;
    if (origFrom === undefined) delete process.env.RESEND_FROM;
    else process.env.RESEND_FROM = origFrom;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("degrades cleanly when RESEND_API_KEY is missing", async () => {
    delete process.env.RESEND_API_KEY;
    const result = await sendEmail({
      to: "mario@example.com",
      subject: "test",
      html: "<p>test</p>",
    });
    expect(isResendConfigured()).toBe(false);
    expect(result.ok).toBe(false);
    expect(result.skipped).toBe(true);
    if (!result.ok) expect(result.error).toBe(RESEND_MISSING_IT);
  });

  it("treats a placeholder key as missing", async () => {
    process.env.RESEND_API_KEY = "not-a-resend-key";
    expect(isResendConfigured()).toBe(false);
    const result = await sendEmail({
      to: "felicepolese550@gmail.com",
      subject: "test",
      html: "<p>test</p>",
    });
    expect(result.ok).toBe(false);
    expect(result.skipped).toBe(true);
  });

  it("sends via Resend when a re_ key is present, with base64 ICS", async () => {
    process.env.RESEND_API_KEY = "re_test_fake_key";
    process.env.RESEND_FROM = "Polese Barbershop <onboarding@resend.dev>";
    expect(isResendConfigured()).toBe(true);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "email_test_id" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const ics = "BEGIN:VCALENDAR\r\nMETHOD:PUBLISH\r\nEND:VCALENDAR\r\n";
    const result = await sendEmail({
      to: "felicepolese550@gmail.com",
      subject: "Prenotazione confermata — Polese Barbershop",
      html: "<p>ciao</p>",
      text: "ciao",
      ics: { filename: "polese-barbershop-2026-09-01-0930.ics", content: ics },
    });

    expect(result).toEqual({ ok: true, id: "email_test_id" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    const auth = new Headers(init.headers as HeadersInit).get("Authorization") || "";
    expect(auth.startsWith("Bearer re_")).toBe(true);
    const body = JSON.parse(String(init.body)) as {
      from: string;
      to: string | string[];
      reply_to?: string;
      attachments?: { content: unknown; filename: string; content_type?: string }[];
    };
    expect(body.from).toContain(["resend", "dev"].join("."));
    expect(body.from).not.toContain("example.com");
    expect(body.to).toBe("felicepolese550@gmail.com");
    expect(body.attachments).toHaveLength(1);
    expect(typeof body.attachments?.[0].content).toBe("string");
    expect(body.attachments?.[0].content).toBe(Buffer.from(ics, "utf8").toString("base64"));
    expect(body.attachments?.[0].filename).toMatch(/\.ics$/);
    expect(JSON.stringify(body.attachments?.[0].content)).not.toMatch(/"type":"Buffer"/);
  });

  it("logs and returns Resend API errors without throwing", async () => {
    process.env.RESEND_API_KEY = "re_test_fake_key";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      text: async () =>
        JSON.stringify({
          name: "invalid_access",
          message: "You can only send testing emails to your own email address.",
        }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const err = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await sendEmail({
      to: "mario@example.com",
      subject: "test",
      html: "<p>test</p>",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/testing emails/i);
      expect(result.skipped).not.toBe(true);
    }
    expect(err).toHaveBeenCalled();
    const logged = JSON.stringify(err.mock.calls);
    expect(logged).not.toMatch(/re_test_fake_key/);
  });
});

describe("booking email copy", () => {
  const origKey = process.env.RESEND_API_KEY;
  const origFrom = process.env.RESEND_FROM;

  afterEach(() => {
    if (origKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = origKey;
    if (origFrom === undefined) delete process.env.RESEND_FROM;
    else process.env.RESEND_FROM = origFrom;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses the Italian customer confirmation with 1 ora notice and optional manage link", () => {
    const mail = customerConfirmEmail({
      firstName: "Mario",
      service: "Taglio Pro",
      barber: "Felice",
      date: "martedì 1 settembre 2026",
      time: "09:30",
      manageUrl: "https://polesebarbershop.vercel.app/appuntamento/abc",
    });
    expect(mail.text).toContain(
      "Ciao Mario, la tua prenotazione da Barbershop Polese è confermata! 💈",
    );
    expect(mail.text).toContain("📅 Data e Ora: martedì 1 settembre 2026 alle 09:30");
    expect(mail.text).toContain("✂️ Servizio: Taglio Pro");
    expect(mail.text).toContain("👤 Barber: Felice");
    expect(mail.text).toContain("📍 Dove siamo: Corso Dante Alighieri 44");
    expect(mail.text).toContain(`almeno ${CANCEL_NOTICE_IT} di anticipo`);
    expect(mail.text).toContain("Ti aspettiamo! 🔥");
    expect(mail.text).toContain("Gestisci o disdici: https://polesebarbershop.vercel.app/appuntamento/abc");
    expect(mail.text).not.toMatch(/24h|24 ore|3 ore/);
    expect(mail.html).toContain("Barbershop Polese");
    expect(mail.html).toContain("Gestisci o disdici");

    const noLink = customerConfirmEmail({
      firstName: "Mario",
      service: "Taglio Pro",
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
      service: "Taglio Pro + Barba Pro",
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
    expect(mail.text).toContain("Servizio/i: Taglio Pro + Barba Pro");
    expect(mail.text).toContain("Durata: 45 min");
    expect(mail.text).toContain("Prezzo: 65 €");
    expect(mail.text).toContain("Barbiere: Felice");
    expect(mail.text).toContain("Data: martedì 1 settembre 2026");
    expect(mail.text).toContain("Ora: 09:30");
    expect(mail.text).toContain("Note: Allergia al nichel");
    expect(mail.text).toContain("Gestisci: https://polesebarbershop.vercel.app/appuntamento/abc");
  });

  it("mentions 1 ora on cancel emails", () => {
    const customer = customerCancelEmail({
      firstName: "Mario",
      service: "Taglio Pro",
      date: "martedì 1 settembre 2026",
      time: "09:30",
    });
    expect(customer.text).toContain(CANCEL_NOTICE_IT);
    expect(customer.text).not.toMatch(/24h|24 ore|3 ore/);
    const owner = ownerCancelEmail({
      firstName: "Mario",
      lastName: "Rossi",
      email: "mario@example.com",
      service: "Taglio Pro",
      date: "martedì 1 settembre 2026",
      time: "09:30",
    });
    expect(owner.text).toContain(CANCEL_NOTICE_IT);
  });

  it("still confirms the booking when the admin send is rejected", async () => {
    process.env.RESEND_API_KEY = "re_test_fake_key";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "cust_ok" }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        text: async () =>
          JSON.stringify({
            name: "invalid_access",
            message: "You can only send testing emails to your own email address.",
          }),
      });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});

    const result = await sendBookingEmails({
      customerEmail: "mario@example.com",
      customer: customerConfirmEmail({
        firstName: "Mario",
        service: "Taglio Pro",
        barber: "Felice",
        date: "martedì 1 settembre 2026",
        time: "09:30",
        manageUrl: "https://example.com/appuntamento/x",
      }),
      owner: ownerNewBookingEmail({
        firstName: "Mario",
        lastName: "Rossi",
        phone: "+393331112233",
        email: "mario@example.com",
        service: "Taglio Pro",
        durationMin: 25,
        barber: "Felice",
        date: "martedì 1 settembre 2026",
        time: "09:30",
        priceLabel: "50 €",
        manageUrl: "https://example.com/appuntamento/x",
      }),
      ics: { filename: "x.ics", content: "BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n" },
    });

    expect(result.customer.ok).toBe(true);
    expect(result.admin.ok).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("booking email copy", () => {
  it("opens the customer confirm with Ciao {nome} and 1 ora di anticipo", async () => {
    const { customerConfirmEmail } = await import("./email");
    const mail = customerConfirmEmail({
      firstName: "Mario",
      service: "Taglio Pro",
      barber: "Felice",
      date: "martedì 1 settembre 2026",
      time: "09:30",
      manageUrl: "https://polesebarbershop.vercel.app/appuntamento/abc",
      priceLabel: "da 25 €",
    });
    expect(mail.text).toMatch(/^Ciao Mario,/);
    expect(mail.text).toMatch(/Barbershop Polese è confermata/);
    expect(mail.text).toMatch(/Corso Dante Alighieri 44/);
    expect(mail.text).toMatch(/1 ora di anticipo/);
    expect(mail.text).toMatch(/Taglio Pro/);
    expect(mail.text).toMatch(/Felice/);
    expect(mail.html).toMatch(/Ciao Mario/);
    expect(mail.html).toMatch(/1 ora/);
    expect(mail.html).toMatch(/Gestisci o disdici/);
  });

  it("sends the barber every client field", async () => {
    const { ownerNewBookingEmail } = await import("./email");
    const mail = ownerNewBookingEmail({
      firstName: "Mario",
      lastName: "Rossi",
      phone: "+393331112233",
      email: "mario@example.com",
      service: "Taglio Pro",
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
      "Taglio Pro",
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
