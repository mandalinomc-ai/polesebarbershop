import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isGmailSmtpConfigured,
  isMailgunConfigured,
  isResendAllowedRecipient,
  isSalonFormRelayEnabled,
  salonFormSubmitUrl,
  sendViaFormSubmit,
  sendViaMailgun,
} from "./mail-providers";

describe("mail providers", () => {
  const orig = {
    MAILGUN_API_KEY: process.env.MAILGUN_API_KEY,
    MAILGUN_DOMAIN: process.env.MAILGUN_DOMAIN,
    SALON_FORM_RELAY: process.env.SALON_FORM_RELAY,
    RESEND_FROM: process.env.RESEND_FROM,
    NOTIFY_EMAIL: process.env.NOTIFY_EMAIL,
    NODE_ENV: process.env.NODE_ENV,
  };

  afterEach(() => {
    for (const [key, value] of Object.entries(orig)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("requires Gmail app password to send as the salon inbox", () => {
    delete process.env.GMAIL_APP_PASSWORD;
    expect(isGmailSmtpConfigured()).toBe(false);
    process.env.GMAIL_USER = "felicepolese550@gmail.com";
    process.env.GMAIL_APP_PASSWORD = "abcd efgh ijkl mnop";
    expect(isGmailSmtpConfigured()).toBe(true);
    delete process.env.GMAIL_APP_PASSWORD;
    delete process.env.GMAIL_USER;
  });

  it("requires Mailgun key and domain", () => {
    delete process.env.MAILGUN_API_KEY;
    delete process.env.MAILGUN_DOMAIN;
    expect(isMailgunConfigured()).toBe(false);
    process.env.MAILGUN_API_KEY = "key-test";
    process.env.MAILGUN_DOMAIN = "mg.example-salon.test";
    expect(isMailgunConfigured()).toBe(true);
  });

  it("defaults the salon form relay off in tests and on in production", () => {
    delete process.env.SALON_FORM_RELAY;
    (process.env as { NODE_ENV?: string }).NODE_ENV = "test";
    expect(isSalonFormRelayEnabled()).toBe(false);
    (process.env as { NODE_ENV?: string }).NODE_ENV = "production";
    expect(isSalonFormRelayEnabled()).toBe(true);
    process.env.SALON_FORM_RELAY = "off";
    expect(isSalonFormRelayEnabled()).toBe(false);
    process.env.SALON_FORM_RELAY = "formsubmit";
    expect(isSalonFormRelayEnabled()).toBe(true);
  });

  it("treats only NOTIFY_EMAIL as a Resend test-mode recipient", () => {
    process.env.RESEND_FROM = "Felice Polese Barber Shop <onboarding@resend.dev>";
    process.env.NOTIFY_EMAIL = "notify@example.com";
    expect(isResendAllowedRecipient("notify@example.com")).toBe(true);
    expect(isResendAllowedRecipient("felicepolese550@gmail.com")).toBe(false);
  });

  it("posts salon alerts to FormSubmit for Felice", async () => {
    process.env.SALON_FORM_RELAY = "formsubmit";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ success: "true" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await sendViaFormSubmit({
      to: "felicepolese550@gmail.com",
      subject: "NUOVA PRENOTAZIONE — Eugenio Test",
      text: "Nome: Eugenio",
    });
    expect(result.ok).toBe(true);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      salonFormSubmitUrl("felicepolese550@gmail.com"),
    );
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("formsubmit");
  });

  it("sends Mailgun messages when configured", async () => {
    process.env.MAILGUN_API_KEY = "key-test";
    process.env.MAILGUN_DOMAIN = "mg.example-salon.test";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ id: "<mailgun-id>" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await sendViaMailgun({
      to: "felicepolese550@gmail.com",
      subject: "test",
      html: "<p>ciao</p>",
      text: "ciao",
    });
    expect(result).toEqual({ ok: true, provider: "mailgun", id: "<mailgun-id>" });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("mg.example-salon.test/messages");
  });
});
