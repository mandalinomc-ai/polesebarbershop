import { Resend } from "resend";
import { SITE, getAdminEmail } from "./site-config";

export type EmailSendResult =
  | { ok: true; skipped?: boolean; id?: string }
  | { ok: false; skipped?: boolean; error: string };

export const RESEND_MISSING_IT =
  "Invio email non configurato. Scarica il file .ics oppure chiama il +39 327 015 6225.";

const RESEND_TEST_DOMAIN = ["resend", "dev"].join(".");
const DEFAULT_FROM = `Polese Barbershop <onboarding@${RESEND_TEST_DOMAIN}>`;

function fromAddress() {
  const from = process.env.RESEND_FROM?.trim() || "";
  const domain = from.match(/@([^>\s]+)/)?.[1]?.toLowerCase() || "";
  if (!from || domain === "example.com" || domain.endsWith(".example.com") || domain === "localhost") {
    if (from && domain && domain !== RESEND_TEST_DOMAIN) {
      console.warn("[email] RESEND_FROM dominio non inviabile; uso il From di test Resend", { domain });
    }
    return DEFAULT_FROM;
  }
  return from;
}

/** True only when a real Resend key (`re_…`) is set. Placeholders do not count. */
export function isResendConfigured() {
  return Boolean(getResendApiKey());
}

function getResendApiKey(): string | null {
  const key = process.env.RESEND_API_KEY?.trim() || "";
  if (!key || !key.startsWith("re_")) return null;
  return key;
}

function logEmailError(message: string, extra: Record<string, unknown>) {
  console.error(`[email] ${message}`, extra);
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  ics?: { filename: string; content: string };
}): Promise<EmailSendResult> {
  const key = getResendApiKey();
  if (!key) {
    console.warn("[email] RESEND_API_KEY assente: invio saltato", {
      to: opts.to,
      subject: opts.subject,
    });
    return { ok: false, skipped: true, error: RESEND_MISSING_IT };
  }
  try {
    const resend = new Resend(key);
    const cancelled = Boolean(opts.ics && /METHOD:CANCEL/.test(opts.ics.content));
    const { data, error } = await resend.emails.send({
      from: fromAddress(),
      to: opts.to,
      replyTo: getAdminEmail(),
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      attachments: opts.ics
        ? [{
            filename: opts.ics.filename,
            // Base64 string: JSON.stringify(Buffer) is not valid for the Resend API.
            content: Buffer.from(opts.ics.content, "utf8").toString("base64"),
            contentType: cancelled
              ? "text/calendar; charset=utf-8; method=CANCEL"
              : "text/calendar; charset=utf-8; method=PUBLISH",
          }]
        : undefined,
    });
    if (error) {
      logEmailError("Resend ha rifiutato l'invio", {
        to: opts.to,
        subject: opts.subject,
        name: error.name,
        error: error.message,
      });
      return { ok: false, error: error.message };
    }
    console.info("[email] inviata", { to: opts.to, subject: opts.subject, id: data?.id });
    return { ok: true, id: data?.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invio email fallito";
    logEmailError("eccezione durante l'invio", { to: opts.to, subject: opts.subject, error: message });
    return { ok: false, error: message };
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] || ch,
  );
}

function wrap(inner: string) {
  return `<!DOCTYPE html><html lang="it"><body style="margin:0;background:#0B0B0B;color:#F4F2EF;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <p style="letter-spacing:0.28em;text-transform:uppercase;font-size:11px;color:#C9A962;">${SITE.brand}</p>
    <h1 style="font-weight:500;font-size:28px;">${SITE.name}</h1>
    ${inner}
    <p style="margin-top:32px;font-size:13px;color:#B5B5B5;">${SITE.addressFull}<br/>${SITE.phone}<br/>C.F. ${SITE.fiscalCode} · P.IVA ${SITE.vatNumber}</p>
  </div></body></html>`;
}

export function customerConfirmEmail(opts: {
  firstName: string; service: string; barber: string; date: string; time: string; manageUrl: string; priceLabel: string;
}) {
  return {
    subject: `Prenotazione confermata — ${SITE.name}`,
    text: `Ciao ${opts.firstName}, prenotazione ${opts.service} con ${opts.barber} il ${opts.date} alle ${opts.time} (${opts.priceLabel}). ICS in allegato (promemoria 30 min). ${opts.manageUrl}`,
    html: wrap(`<p>Ciao ${opts.firstName},</p><p>prenotazione <strong>confermata</strong>.</p><p><strong>${opts.service}</strong> · ${opts.priceLabel}<br/>con ${opts.barber}<br/>${opts.date} alle ${opts.time}</p><p>In allegato il file .ics: un solo promemoria, 30 minuti prima.</p><p><a href="${opts.manageUrl}" style="color:#C9A962;">Gestisci o disdici</a> (fino a 3 ore prima). Se disdici, lo slot si libera e il promemoria non parte.</p>`),
  };
}

export function ownerNewBookingEmail(opts: {
  firstName: string; lastName: string; phone: string; email: string; service: string; barber: string; date: string; time: string; priceLabel: string;
}) {
  return {
    subject: `Nuova prenotazione — ${opts.firstName} ${opts.lastName}`,
    text: `Nuova prenotazione: ${opts.firstName} ${opts.lastName} (${opts.phone}, ${opts.email}) — ${opts.service} (${opts.priceLabel}) con ${opts.barber} il ${opts.date} alle ${opts.time}.`,
    html: wrap(`<p>Nuova prenotazione</p><p>${opts.firstName} ${opts.lastName}<br/>${opts.phone} · ${opts.email}<br/>${opts.service} · ${opts.priceLabel}<br/>${opts.date} alle ${opts.time}<br/>Barbiere: ${opts.barber}</p>`),
  };
}

export function customerCancelEmail(opts: { firstName: string; service: string; date: string; time: string }) {
  return {
    subject: `Prenotazione annullata — ${SITE.name}`,
    text: `Ciao ${opts.firstName}, la prenotazione per ${opts.service} del ${opts.date} alle ${opts.time} è stata annullata. Lo slot è di nuovo libero. Apri l'allegato .ics di disdetta per togliere l'appuntamento e il promemoria di 30 minuti dal calendario.`,
    html: wrap(`<p>Ciao ${opts.firstName},</p><p>la prenotazione per <strong>${opts.service}</strong> del ${opts.date} alle ${opts.time} è stata <strong>annullata</strong>.</p><p>Lo slot è di nuovo libero: non partirà il promemoria di 30 minuti. Apri l'allegato .ics di disdetta per rimuovere l'evento dal calendario.</p>`),
  };
}

export function ownerCancelEmail(opts: {
  firstName: string; lastName: string; email: string; service: string; date: string; time: string;
}) {
  return {
    subject: `Prenotazione annullata — ${opts.firstName} ${opts.lastName}`,
    text: `Disdetta: ${opts.firstName} ${opts.lastName} (${opts.email}) — ${opts.service} il ${opts.date} alle ${opts.time}. Lo slot è di nuovo libero.`,
    html: wrap(`<p>Prenotazione <strong>annullata</strong></p><p>${opts.firstName} ${opts.lastName}<br/>${opts.email}<br/>${opts.service}<br/>${opts.date} alle ${opts.time}</p><p>Lo slot è di nuovo libero. In allegato il file .ics di disdetta.</p>`),
  };
}

export function staffCrmEmail(opts: { firstName: string; subject: string; body: string }) {
  const name = escapeHtml(opts.firstName || "ciao");
  const body = escapeHtml(opts.body).replace(/\n/g, "<br/>");
  return {
    subject: opts.subject,
    text: opts.body,
    html: wrap(`<p>Ciao ${name},</p><p>${body}</p>`),
  };
}

export async function sendBookingEmails(opts: {
  customerEmail: string;
  customer: ReturnType<typeof customerConfirmEmail>;
  owner: ReturnType<typeof ownerNewBookingEmail>;
  ics: { filename: string; content: string };
}) {
  const customer = await sendEmail({ to: opts.customerEmail, ...opts.customer, ics: opts.ics });
  // Admin/owner: ADMIN_EMAIL → OWNER_EMAIL → felicepolese550@gmail.com
  const admin = await sendEmail({ to: getAdminEmail(), ...opts.owner, ics: opts.ics });
  return { customer, admin };
}

export async function sendCancelEmails(opts: {
  customerEmail: string;
  customer: ReturnType<typeof customerCancelEmail>;
  owner: ReturnType<typeof ownerCancelEmail>;
  ics: { filename: string; content: string };
}) {
  const customer = opts.customerEmail
    ? await sendEmail({ to: opts.customerEmail, ...opts.customer, ics: opts.ics })
    : { ok: false as const, skipped: true, error: "Cliente senza email." };
  const admin = await sendEmail({ to: getAdminEmail(), ...opts.owner, ics: opts.ics });
  return { customer, admin };
}
