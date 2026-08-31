import { afterEach, describe, expect, it, vi } from "vitest";
import { RESEND_MISSING_IT, isResendConfigured, sendEmail } from "./email";

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
