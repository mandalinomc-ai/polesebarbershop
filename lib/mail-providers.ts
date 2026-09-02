import { getAdminEmail, isResendTestFrom } from "./site-config";

const FORMSUBMIT_HOST = ["formsubmit", "co"].join(".");

export function isMailgunConfigured(): boolean {
  const key = process.env.MAILGUN_API_KEY?.trim() || "";
  const domain = process.env.MAILGUN_DOMAIN?.trim() || "";
  return Boolean(key && domain && !domain.includes("example.com"));
}

/** Salon HTML form relay (FormSubmit) — last resort when Resend test-mode 403s Felice. */
export function isSalonFormRelayEnabled(): boolean {
  const raw = (process.env.SALON_FORM_RELAY || "").trim().toLowerCase();
  if (raw === "off" || raw === "false" || raw === "0") return false;
  if (raw === "formsubmit" || raw === "on" || raw === "true") return true;
  // Production default: Felice still gets salon alerts without a verified domain.
  return process.env.NODE_ENV === "production";
}

export function mailgunFromAddress(): string {
  const from = process.env.MAILGUN_FROM?.trim() || "";
  if (from && from.includes("@")) return from;
  const domain = process.env.MAILGUN_DOMAIN?.trim() || "mg.localhost";
  return `Felice Polese Barber Shop <noreply@${domain}>`;
}

export function isResendTestRecipientError(error: string): boolean {
  return /testing emails|only send testing|invalid_access|resend\.dev/i.test(error);
}

export function isResendAllowedRecipient(to: string): boolean {
  if (!isResendTestFrom()) return true;
  const notify = process.env.NOTIFY_EMAIL?.trim().toLowerCase() || "";
  if (notify && to.trim().toLowerCase() === notify) return true;
  return false;
}

export type ProviderSendResult =
  | { ok: true; id?: string; provider: "mailgun" | "formsubmit" }
  | { ok: false; error: string; provider: "mailgun" | "formsubmit" };

export async function sendViaMailgun(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  ics?: { filename: string; content: string };
}): Promise<ProviderSendResult> {
  const key = process.env.MAILGUN_API_KEY?.trim() || "";
  const domain = process.env.MAILGUN_DOMAIN?.trim() || "";
  if (!key || !domain) {
    return { ok: false, provider: "mailgun", error: "Mailgun non configurato." };
  }
  const region = (process.env.MAILGUN_REGION || "").trim().toLowerCase();
  const host = region === "eu" ? "api.eu.mailgun.net" : "api.mailgun.net";
  const body = new FormData();
  body.append("from", mailgunFromAddress());
  body.append("to", opts.to);
  body.append("subject", opts.subject);
  body.append("html", opts.html);
  if (opts.text) body.append("text", opts.text);
  body.append("h:Reply-To", opts.replyTo || getAdminEmail());
  if (opts.ics) {
    body.append(
      "attachment",
      new Blob([opts.ics.content], { type: "text/calendar; charset=utf-8" }),
      opts.ics.filename,
    );
  }
  try {
    const res = await fetch(`https://${host}/v3/${domain}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${key}`).toString("base64")}`,
      },
      body,
    });
    const raw = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        provider: "mailgun",
        error: mailgunErrorMessage(res.status, raw),
      };
    }
    let id: string | undefined;
    try {
      id = (JSON.parse(raw) as { id?: string }).id;
    } catch {
      /* ignore */
    }
    return { ok: true, provider: "mailgun", id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invio Mailgun fallito";
    return { ok: false, provider: "mailgun", error: message };
  }
}

function mailgunErrorMessage(status: number, raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { message?: string };
    if (parsed.message) return parsed.message;
  } catch {
    /* ignore */
  }
  return raw?.slice(0, 240) || `Mailgun HTTP ${status}`;
}

export function salonFormSubmitUrl(to: string): string {
  return `https://${FORMSUBMIT_HOST}/ajax/${encodeURIComponent(to.trim().toLowerCase())}`;
}

export async function sendViaFormSubmit(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<ProviderSendResult> {
  if (!isSalonFormRelayEnabled()) {
    return { ok: false, provider: "formsubmit", error: "Relay salone disattivato." };
  }
  try {
    const res = await fetch(salonFormSubmitUrl(opts.to), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        _subject: opts.subject,
        _template: "box",
        _captcha: "false",
        message: opts.text,
      }),
    });
    const raw = await res.text();
    let parsed: { success?: string; message?: string; error?: string } = {};
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch {
      /* ignore */
    }
    if (!res.ok) {
      return {
        ok: false,
        provider: "formsubmit",
        error: parsed.message || parsed.error || `Relay HTTP ${res.status}`,
      };
    }
    const note = `${parsed.success || ""} ${parsed.message || ""}`.toLowerCase();
    if (/activat|confirm your email|check your email/.test(note)) {
      console.warn("[email] relay salone: prima attivazione, Felice deve cliccare il link nella mail", {
        to: opts.to,
      });
    }
    return { ok: true, provider: "formsubmit" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Relay salone fallito";
    return { ok: false, provider: "formsubmit", error: message };
  }
}
