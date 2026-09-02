import { Resend } from "resend";
import {
  isGmailSmtpConfigured,
  isMailgunConfigured,
  isResendAllowedRecipient,
  isResendTestRecipientError,
  isSalonFormRelayEnabled,
  sendViaFormSubmit,
  sendViaGmail,
  sendViaMailgun,
} from "./mail-providers";
import {
  CANCEL_NOTICE_IT,
  SITE,
  getAdminEmail,
  getOwnerNotifyEmails,
  isResendTestFrom,
} from "./site-config";

export type EmailSendResult =
  | { ok: true; skipped?: boolean; id?: string }
  | { ok: false; skipped?: boolean; error: string };

export const RESEND_MISSING_IT =
  `Invio email non configurato. Scarica il file .ics oppure chiama il ${SITE.phone}.`;

export const CUSTOMER_CONFIRM_WHATSAPP_IT =
  "Non siamo riusciti a inviarti l'email di conferma. Ti confermiamo su WhatsApp al numero che hai lasciato.";

export const CUSTOMER_CONFIRM_WHATSAPP_NO_PHONE_IT =
  "Non siamo riusciti a inviarti l'email di conferma. Scrivi al salone su WhatsApp per ricevere la conferma.";

export function publicCustomerMailError(error: string, hasCustomerPhone: boolean): string {
  if (isResendTestRecipientError(error) || /403|forbidden/i.test(error)) {
    return hasCustomerPhone ? CUSTOMER_CONFIRM_WHATSAPP_IT : CUSTOMER_CONFIRM_WHATSAPP_NO_PHONE_IT;
  }
  if (error === RESEND_MISSING_IT) return error;
  return hasCustomerPhone ? CUSTOMER_CONFIRM_WHATSAPP_IT : CUSTOMER_CONFIRM_WHATSAPP_NO_PHONE_IT;
}

const RESEND_TEST_DOMAIN = ["resend", "dev"].join(".");
const DEFAULT_FROM = `Felice Polese Barber Shop <onboarding@${RESEND_TEST_DOMAIN}>`;

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

async function sendViaResend(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  ics?: { filename: string; content: string };
}): Promise<EmailSendResult> {
  const key = getResendApiKey();
  if (!key) {
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
    console.info("[email] inviata via Resend", { to: opts.to, subject: opts.subject, id: data?.id });
    return { ok: true, id: data?.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invio email fallito";
    logEmailError("eccezione durante l'invio Resend", { to: opts.to, subject: opts.subject, error: message });
    return { ok: false, error: message };
  }
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  ics?: { filename: string; content: string };
  /** Salon alerts: Gmail/Mailgun, then Resend, then FormSubmit if Resend test-mode blocks Felice. */
  salonFallback?: boolean;
}): Promise<EmailSendResult> {
  if (isGmailSmtpConfigured()) {
    const gmail = await sendViaGmail({
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      replyTo: getAdminEmail(),
      ics: opts.ics,
    });
    if (gmail.ok) {
      console.info("[email] inviata via Gmail", { to: opts.to, subject: opts.subject, id: gmail.id });
      return { ok: true, id: gmail.id };
    }
    logEmailError("Gmail ha rifiutato l'invio", { to: opts.to, error: gmail.error });
  }

  if (isMailgunConfigured()) {
    const mailgun = await sendViaMailgun({
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      replyTo: getAdminEmail(),
      ics: opts.ics,
    });
    if (mailgun.ok) {
      console.info("[email] inviata via Mailgun", { to: opts.to, subject: opts.subject, id: mailgun.id });
      return { ok: true, id: mailgun.id };
    }
    logEmailError("Mailgun ha rifiutato l'invio", { to: opts.to, error: mailgun.error });
  }

  const key = getResendApiKey();
  const skipResendTestBlock = opts.salonFallback && isResendTestFrom() && !isResendAllowedRecipient(opts.to);
  if (key && !skipResendTestBlock) {
    const resend = await sendViaResend(opts);
    if (resend.ok) return resend;
    if (!opts.salonFallback || !isResendTestRecipientError(resend.error || "")) {
      if (!opts.salonFallback) return resend;
    }
  } else if (!key && !opts.salonFallback) {
    console.warn("[email] RESEND_API_KEY assente: invio saltato", {
      to: opts.to,
      subject: opts.subject,
    });
    return { ok: false, skipped: true, error: RESEND_MISSING_IT };
  }

  if (opts.salonFallback && isSalonFormRelayEnabled()) {
    const relay = await sendViaFormSubmit({
      to: opts.to,
      subject: opts.subject,
      text: opts.text || opts.subject,
    });
    if (relay.ok) {
      console.info("[email] avviso salone via relay", { to: opts.to, subject: opts.subject });
      return { ok: true };
    }
    logEmailError("relay salone non inviato", { to: opts.to, error: relay.error });
    return { ok: false, error: relay.error };
  }

  if (!key) return { ok: false, skipped: true, error: RESEND_MISSING_IT };
  return { ok: false, error: "Invio email al salone non riuscito." };
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

const CUSTOMER_CONFIRM_ADDRESS = SITE.streetAddress;

export function customerConfirmEmail(opts: {
  firstName: string;
  service: string;
  barber: string;
  date: string;
  time: string;
  manageUrl?: string;
  priceLabel?: string;
  durationLabel?: string;
}) {
  const manage = opts.manageUrl?.trim() || "";
  const price = opts.priceLabel?.trim() || "";
  const duration = opts.durationLabel?.trim() || "";
  const textLines = [
    `Ciao ${opts.firstName}, la tua prenotazione da ${SITE.name} è confermata! 💈`,
    "",
    `📅 Data e Ora: ${opts.date} alle ${opts.time}`,
    `✂️ Servizio: ${opts.service}`,
    price ? `💶 Prezzo: ${price}` : "",
    duration ? `⏱ Durata: ${duration}` : "",
    `👤 Barber: ${opts.barber}`,
    `📍 Dove siamo: ${CUSTOMER_CONFIRM_ADDRESS}`,
    `📞 Telefono salone: ${SITE.phone}`,
    "",
    `Per modifiche o disdette ti preghiamo di avvisarci con almeno ${CANCEL_NOTICE_IT} di anticipo.`,
  ].filter((line) => line !== "");
  if (manage) {
    textLines.push("", `Gestisci o disdici: ${manage}`);
  }
  textLines.push("", "Ti aspettiamo! 🔥");
  const text = textLines.join("\n");

  const name = escapeHtml(opts.firstName);
  const service = escapeHtml(opts.service);
  const barber = escapeHtml(opts.barber);
  const date = escapeHtml(opts.date);
  const time = escapeHtml(opts.time);
  const priceHtml = price ? `💶 Prezzo: <strong>${escapeHtml(price)}</strong><br/>` : "";
  const durationHtml = duration ? `⏱ Durata: <strong>${escapeHtml(duration)}</strong><br/>` : "";
  const manageHref = manage ? escapeHtml(manage) : "";
  const manageHtml = manage
    ? `<p style="margin:20px 0 0;"><a href="${manageHref}" style="color:#C9A962;">Gestisci o disdici</a></p>`
    : "";

  return {
    subject: `Prenotazione confermata — ${SITE.name}`,
    text,
    html: wrap(`
      <p style="font-size:18px;line-height:1.55;">Ciao ${name}, la tua prenotazione da ${SITE.name} è confermata! 💈</p>
      <p style="margin:24px 0 8px;letter-spacing:0.18em;text-transform:uppercase;font-size:11px;color:#C9A962;">Dettagli</p>
      <p style="line-height:1.8;margin:0;">📅 Data e Ora: <strong>${date}</strong> alle <strong>${time}</strong><br/>
      ✂️ Servizio: <strong>${service}</strong><br/>
      ${priceHtml}${durationHtml}👤 Barber: <strong>${barber}</strong><br/>
      📍 Dove siamo: ${CUSTOMER_CONFIRM_ADDRESS}<br/>
      📞 Telefono salone: ${SITE.phone}</p>
      <p style="margin-top:24px;">Per modifiche o disdette ti preghiamo di avvisarci con almeno <strong>${CANCEL_NOTICE_IT}</strong> di anticipo.</p>
      ${manageHtml}
      <p style="margin-top:24px;font-size:18px;">Ti aspettiamo! 🔥</p>
      <p style="font-size:13px;color:#B5B5B5;">In allegato il file .ics (promemoria 30 minuti prima).</p>`),
  };
}

export function ownerNewBookingEmail(opts: {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  service: string;
  durationMin: number;
  barber: string;
  date: string;
  time: string;
  priceLabel: string;
  notes?: string;
  manageUrl?: string;
  customerWhatsAppUrl?: string | null;
}) {
  const notes = opts.notes?.trim() || "";
  const manage = opts.manageUrl?.trim() || "";
  const textLines = [
    "NUOVA PRENOTAZIONE",
    "",
    `Nome: ${opts.firstName}`,
    `Cognome: ${opts.lastName}`,
    `Telefono: ${opts.phone}`,
    `Email: ${opts.email}`,
    `Servizio/i: ${opts.service}`,
    `Durata: ${opts.durationMin} min`,
    `Prezzo: ${opts.priceLabel}`,
    `Barbiere: ${opts.barber}`,
    `Data: ${opts.date}`,
    `Ora: ${opts.time}`,
  ];
  if (notes) textLines.push(`Note: ${notes}`);
  if (manage) textLines.push(`Gestisci: ${manage}`);
  const text = textLines.join("\n");

  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#B5B5B5;vertical-align:top;white-space:nowrap;">${label}</td><td style="padding:6px 0;color:#F4F2EF;">${escapeHtml(value)}</td></tr>`;

  return {
    subject: `NUOVA PRENOTAZIONE — ${opts.firstName} ${opts.lastName}`,
    text,
    html: wrap(`
      <p style="letter-spacing:0.2em;text-transform:uppercase;font-size:12px;color:#C9A962;">NUOVA PRENOTAZIONE</p>
      <table style="border-collapse:collapse;font-size:15px;line-height:1.45;">
        ${row("Nome", opts.firstName)}
        ${row("Cognome", opts.lastName)}
        ${row("Telefono", opts.phone)}
        ${row("Email", opts.email)}
        ${row("Servizio/i", opts.service)}
        ${row("Durata", `${opts.durationMin} min`)}
        ${row("Prezzo", opts.priceLabel)}
        ${row("Barbiere", opts.barber)}
        ${row("Data", opts.date)}
        ${row("Ora", opts.time)}
        ${notes ? row("Note", notes) : ""}
      </table>
      ${manage ? `<p style="margin-top:20px;"><a href="${escapeHtml(manage)}" style="color:#C9A962;">Apri / gestisci prenotazione</a></p>` : ""}`),
  };
}

export function customerCancelEmail(opts: { firstName: string; service: string; date: string; time: string }) {
  return {
    subject: `Prenotazione annullata — ${SITE.name}`,
    text: `Ciao ${opts.firstName}, la prenotazione per ${opts.service} del ${opts.date} alle ${opts.time} è stata annullata. Grazie per averci avvisato con almeno ${CANCEL_NOTICE_IT} di anticipo. Lo slot è di nuovo libero. Apri l'allegato .ics di disdetta per togliere l'appuntamento e il promemoria di 30 minuti dal calendario.`,
    html: wrap(`<p>Ciao ${escapeHtml(opts.firstName)},</p><p>la prenotazione per <strong>${escapeHtml(opts.service)}</strong> del ${escapeHtml(opts.date)} alle ${escapeHtml(opts.time)} è stata <strong>annullata</strong>.</p><p>Grazie per averci avvisato con almeno <strong>${CANCEL_NOTICE_IT}</strong> di anticipo. Lo slot è di nuovo libero: non partirà il promemoria di 30 minuti. Apri l'allegato .ics di disdetta per rimuovere l'evento dal calendario.</p>`),
  };
}

export function ownerCancelEmail(opts: {
  firstName: string; lastName: string; email: string; service: string; date: string; time: string;
}) {
  return {
    subject: `Prenotazione annullata — ${opts.firstName} ${opts.lastName}`,
    text: `Disdetta (preavviso ${CANCEL_NOTICE_IT}): ${opts.firstName} ${opts.lastName} (${opts.email}) — ${opts.service} il ${opts.date} alle ${opts.time}. Lo slot è di nuovo libero.`,
    html: wrap(`<p>Prenotazione <strong>annullata</strong> (preavviso ${CANCEL_NOTICE_IT})</p><p>${escapeHtml(opts.firstName)} ${escapeHtml(opts.lastName)}<br/>${escapeHtml(opts.email)}<br/>${escapeHtml(opts.service)}<br/>${escapeHtml(opts.date)} alle ${escapeHtml(opts.time)}</p><p>Lo slot è di nuovo libero. In allegato il file .ics di disdetta.</p>`),
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

export type OwnerNotifyResult = {
  results: { to: string; result: EmailSendResult }[];
  ok: boolean;
};

async function sendOwnerEmails(opts: {
  owner: { subject: string; html: string; text: string };
  ics: { filename: string; content: string };
}): Promise<OwnerNotifyResult> {
  const targets = getOwnerNotifyEmails();
  const results: { to: string; result: EmailSendResult }[] = [];
  const admin = getAdminEmail().trim().toLowerCase();

  for (const to of targets) {
    try {
      const result = await sendEmail({ to, ...opts.owner, ics: opts.ics, salonFallback: true });
      results.push({ to, result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invio email admin fallito";
      logEmailError("avviso salone non inviato", { to, error: message });
      results.push({ to, result: { ok: false, error: message } });
    }
  }

  const adminOk = results.some((row) => row.to === admin && row.result.ok);
  if (!adminOk) {
    logEmailError("avviso a Felice non recapitato", {
      targets,
      adminEmail: admin,
      resendTest: isResendTestFrom(),
      hint: "Mailgun dominio verificato, oppure SALON_FORM_RELAY, oppure verifica polesebarbershop.it su Resend",
    });
  }

  return { results, ok: adminOk };
}

export async function sendBookingEmails(opts: {
  customerEmail: string;
  customer: ReturnType<typeof customerConfirmEmail>;
  owner: ReturnType<typeof ownerNewBookingEmail>;
  ics: { filename: string; content: string };
}) {
  const customer = await sendEmail({ to: opts.customerEmail, ...opts.customer, ics: opts.ics });
  const owner = await sendOwnerEmails({ owner: opts.owner, ics: opts.ics });
  const admin = owner.results[0]?.result ?? { ok: false, error: "Nessun destinatario salone configurato." };
  return { customer, admin, owner };
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
  const owner = await sendOwnerEmails({ owner: opts.owner, ics: opts.ics });
  const admin = owner.results[0]?.result ?? { ok: false, error: "Nessun destinatario salone configurato." };
  return { customer, admin, owner };
}
