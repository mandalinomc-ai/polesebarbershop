import {
  isGmailSmtpConfigured,
  sendViaGmail,
} from "./mail-providers";
import {
  CANCEL_NOTICE_IT,
  SITE,
  getAdminEmail,
  getBookingNotificationEmail,
} from "./site-config";

export type EmailSendResult =
  | { ok: true; skipped?: boolean; id?: string }
  | { ok: false; skipped?: boolean; error: string };

export const GMAIL_MISSING_IT =
  `Invio email non configurato. Scarica il file .ics oppure chiama il ${SITE.phone}.`;

/**
 * EMERGENCY OFF (2026-09-04) — booking confirmation emails disabled on production.
 *
 * ROOT CAUSE: Vercel env `GMAIL_APP_PASSWORD` is empty (secret present but no value).
 * Gmail SMTP auth therefore fails for every outbound message. Customer confirmation
 * and salon alert to felicepolese550@gmail.com never leave the server.
 *
 * Re-enable after setting a 16-char Google App Password on Vercel Production + Preview.
 * Until then: WhatsApp (wa.me/393270156225) + .ics calendar replace email on success.
 */
export const BOOKING_EMAIL_DISABLED = true;

/** @deprecated kept as alias for compatibility */
export const RESEND_MISSING_IT = GMAIL_MISSING_IT;

function getGmailUser(): string | null {
  const u = process.env.GMAIL_USER?.trim();
  return u && u.includes("@") ? u : null;
}

function getGmailAppPassword(): string | null {
  const p = process.env.GMAIL_APP_PASSWORD?.trim();
  return p && p.length >= 8 ? p : null;
}

/** True when Gmail SMTP credentials are configured. */
export function isGmailConfigured() {
  return Boolean(getGmailUser() && getGmailAppPassword());
}

/** @deprecated alias — use isGmailConfigured */
export const isResendConfigured = isGmailConfigured;

function logEmailError(message: string, extra: Record<string, unknown>) {
  console.error(`[email] ${message}`, extra);
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  ics?: { filename: string; content: string };
  /** Ignored — Gmail SMTP is the only transport. */
  salonFallback?: boolean;
}): Promise<EmailSendResult> {
  if (!isGmailSmtpConfigured() && !isGmailConfigured()) {
    console.warn("[email] GMAIL_USER / GMAIL_APP_PASSWORD assente: invio saltato", {
      to: opts.to,
      subject: opts.subject,
    });
    return { ok: false, skipped: true, error: GMAIL_MISSING_IT };
  }

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
  return { ok: false, error: gmail.error };
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

/** Client notice when staff cancels from the gestionale (not a self-cancel). */
export function staffCancelCustomerEmail(opts: {
  firstName: string;
  service: string;
  date: string;
  time: string;
  barber?: string;
  bodyText: string;
}) {
  const barber = opts.barber?.trim()
    ? `<br/>👤 Barber: <strong>${escapeHtml(opts.barber)}</strong>`
    : "";
  return {
    subject: `Appuntamento annullato dal salone — ${SITE.name}`,
    text: opts.bodyText,
    html: wrap(`
      <p>Ciao ${escapeHtml(opts.firstName)},</p>
      <p>il tuo appuntamento per <strong>${escapeHtml(opts.service)}</strong> del
      <strong>${escapeHtml(opts.date)}</strong> alle <strong>${escapeHtml(opts.time)}</strong>
      è stato <strong>annullato dal salone</strong>.${barber}</p>
      <p>Lo slot è di nuovo libero. Puoi riprenotare online o su WhatsApp al ${SITE.phone}.</p>
      <p style="font-size:13px;color:#B5B5B5;">Apri l'allegato .ics di disdetta per rimuovere l'evento dal calendario.</p>`),
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
  const target = getBookingNotificationEmail();
  const results: { to: string; result: EmailSendResult }[] = [];

  try {
    const result = await sendEmail({ to: target, ...opts.owner, ics: opts.ics });
    results.push({ to: target, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invio email admin fallito";
    logEmailError("avviso salone non inviato", { to: target, error: message });
    results.push({ to: target, result: { ok: false, error: message } });
  }

  return { results, ok: results.some((r) => r.result.ok) };
}

export async function sendBookingEmails(opts: {
  customerEmail: string;
  customer: ReturnType<typeof customerConfirmEmail>;
  owner: ReturnType<typeof ownerNewBookingEmail>;
  ics: { filename: string; content: string };
}) {
  if (BOOKING_EMAIL_DISABLED) {
    console.info("[email] prenotazione: invio disattivato (BOOKING_EMAIL_DISABLED)", {
      customer: opts.customerEmail,
      salon: getBookingNotificationEmail(),
    });
    const skipped = { ok: true as const, skipped: true };
    return { customer: skipped, admin: skipped, owner: { results: [], ok: true } };
  }
  const customer = await sendEmail({ to: opts.customerEmail, ...opts.customer, ics: opts.ics });
  const owner = await sendOwnerEmails({ owner: opts.owner, ics: opts.ics });
  const admin = owner.results[0]?.result ?? { ok: false, error: "Nessun destinatario salone configurato." };
  return { customer, admin, owner };
}

export function publicCustomerMailError(error: string | undefined, hasPhone: boolean): string {
  void error;
  return hasPhone
    ? "L'email di conferma non è partita in automatico — usa i pulsanti calendario o WhatsApp."
    : "L'email di conferma non è partita in automatico — usa i pulsanti calendario qui sotto.";
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
