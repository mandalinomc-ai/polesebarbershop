import {
  isGmailSmtpConfigured,
  isSmtpConfigured,
  sendViaGmail,
  sendViaResend,
  sendViaSmtp,
} from "./mail-providers";
import {
  CANCEL_NOTICE_IT,
  SITE,
  getAdminEmail,
  getBookingNotificationEmail,
  getSiteUrl,
} from "./site-config";

export type EmailSendResult =
  | { ok: true; skipped?: boolean; id?: string }
  | { ok: false; skipped?: boolean; error: string };

export const GMAIL_MISSING_IT =
  `Invio email non configurato. Scarica il file .ics oppure chiama il ${SITE.phone}.`;

/**
 * Booking confirmation emails ON for production (Aruba SMTP on VPS).
 * Set true only for emergency WhatsApp-only fallback.
 */
export const BOOKING_EMAIL_DISABLED = false;

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

export function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function mailReplyTo(): string {
  return process.env.MAIL_REPLY_TO?.trim() || getAdminEmail();
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
  /** Ignored — kept for call-site compatibility. */
  salonFallback?: boolean;
}): Promise<EmailSendResult> {
  const replyTo = mailReplyTo();

  // 1) SMTP Aruba / generico (produzione VPS)
  if (isSmtpConfigured()) {
    const smtp = await sendViaSmtp({
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      replyTo,
      ics: opts.ics,
    });
    if (smtp.ok) {
      console.info("[email] inviata via SMTP", {
        to: opts.to,
        subject: opts.subject,
        replyTo,
        id: smtp.id,
      });
      return { ok: true, id: smtp.id };
    }
    logEmailError("SMTP ha rifiutato l'invio", { to: opts.to, error: smtp.error });
  }

  // 2) Resend (opzionale)
  if (isResendConfigured()) {
    const resend = await sendViaResend({
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      replyTo,
    });
    if (resend.ok) {
      console.info("[email] inviata via Resend", { to: opts.to, subject: opts.subject, id: resend.id });
      return { ok: true, id: resend.id };
    }
    logEmailError("Resend ha rifiutato l'invio", { to: opts.to, error: resend.error });
  }

  // 3) Gmail app password (fallback)
  if (!isGmailSmtpConfigured() && !isGmailConfigured()) {
    console.warn("[email] nessun provider email configurato: invio saltato", {
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
    replyTo,
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
    `Ciao ${opts.firstName}, abbiamo ricevuto la tua richiesta di prenotazione da ${SITE.name}.`,
    "",
    "Il salone ti contatterà su WhatsApp per confermare l'appuntamento.",
    "Attendi la conferma su WhatsApp prima di considerare l'appuntamento definitivo.",
    "",
    `📅 Data e ora richieste: ${opts.date} alle ${opts.time}`,
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
  textLines.push(
    "",
    "In caso di sovrapposizioni o necessità organizzative, il salone potrà confermare l'orario oppure proporti una modifica.",
  );
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
    subject: `Richiesta di prenotazione ricevuta — ${SITE.name}`,
    text,
    html: wrap(`
      <p style="font-size:18px;line-height:1.55;">Ciao ${name}, abbiamo ricevuto la tua richiesta di prenotazione da ${SITE.name}.</p>
      <p style="line-height:1.55;">Il salone ti contatterà su WhatsApp per confermare l&apos;appuntamento.</p>
      <p style="line-height:1.55;"><strong>Attendi la conferma su WhatsApp prima di considerare l&apos;appuntamento definitivo.</strong></p>
      <p style="margin:24px 0 8px;letter-spacing:0.18em;text-transform:uppercase;font-size:11px;color:#C9A962;">Riepilogo richiesta</p>
      <p style="line-height:1.8;margin:0;">📅 Data e ora richieste: <strong>${date}</strong> alle <strong>${time}</strong><br/>
      ✂️ Servizio: <strong>${service}</strong><br/>
      ${priceHtml}${durationHtml}👤 Barber: <strong>${barber}</strong><br/>
      📍 Dove siamo: ${CUSTOMER_CONFIRM_ADDRESS}<br/>
      📞 Telefono salone: ${SITE.phone}</p>
      <p style="margin-top:24px;">Per modifiche o disdette ti preghiamo di avvisarci con almeno <strong>${CANCEL_NOTICE_IT}</strong> di anticipo.</p>
      ${manageHtml}
      <p style="margin-top:24px;font-size:14px;line-height:1.55;">In caso di sovrapposizioni o necessità organizzative, il salone potrà confermare l&apos;orario oppure proporti una modifica.</p>
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
  /** Optional override; if omitted, a standard body is generated. */
  bodyText?: string;
  bookUrl?: string;
}) {
  const nome = (opts.firstName || "").trim() || "Ciao";
  const bookUrl = (opts.bookUrl || getSiteUrl()).replace(/\/$/, "");
  const bookHref = escapeHtml(bookUrl);
  const barberLine = opts.barber?.trim()
    ? `\n👤 Barber: ${opts.barber.trim()}`
    : "";
  const barberHtml = opts.barber?.trim()
    ? `<br/>👤 Barber: <strong>${escapeHtml(opts.barber.trim())}</strong>`
    : "";

  const text =
    opts.bodyText?.trim() ||
    [
      `Ciao ${nome},`,
      "",
      `ti informiamo che l'appuntamento del ${opts.date} alle ${opts.time} per ${opts.service} presso ${SITE.name} è stato annullato.${barberLine}`,
      "",
      "Ci scusiamo per l'inconveniente. Per scegliere un nuovo orario puoi prenotare direttamente dal nostro sito web:",
      bookUrl,
      "",
      `Oppure WhatsApp ${SITE.phone}.`,
      "",
      SITE.name,
      SITE.addressFull,
    ].join("\n");

  return {
    subject: `Appuntamento annullato — ${SITE.name}`,
    text,
    html: wrap(`
      <p style="font-size:18px;line-height:1.55;">Ciao ${escapeHtml(nome)},</p>
      <p style="line-height:1.55;">
        ti informiamo che l&apos;appuntamento del
        <strong>${escapeHtml(opts.date)}</strong> alle
        <strong>${escapeHtml(opts.time)}</strong> per
        <strong>${escapeHtml(opts.service)}</strong>
        è stato <strong>annullato</strong>.${barberHtml}
      </p>
      <p style="line-height:1.55;">
        Ci scusiamo per l&apos;inconveniente. Per scegliere un nuovo orario puoi prenotare
        direttamente dal nostro sito web.
      </p>
      <p style="margin:28px 0 8px;">
        <a href="${bookHref}"
           style="display:inline-block;padding:12px 22px;border:1px solid #C9A962;color:#C9A962;text-decoration:none;letter-spacing:0.12em;text-transform:uppercase;font-size:12px;">
          Prenota di nuovo
        </a>
      </p>
      <p style="font-size:13px;color:#B5B5B5;line-height:1.5;">
        <a href="${bookHref}" style="color:#C9A962;">${bookHref}</a><br/>
        WhatsApp / Tel. ${SITE.phone}
      </p>`),
  };
}

/** Client notice when staff moves / retimes from the gestionale. */
export function staffRescheduleCustomerEmail(opts: {
  firstName: string;
  service: string;
  newDate: string;
  newTime: string;
  oldDate: string;
  oldTime: string;
  barber?: string;
  bodyText: string;
  manageUrl?: string;
}) {
  const barber = opts.barber?.trim()
    ? `<br/>👤 Barber: <strong>${escapeHtml(opts.barber)}</strong>`
    : "";
  const manage = opts.manageUrl
    ? `<p style="margin-top:20px;"><a href="${escapeHtml(opts.manageUrl)}" style="color:#C9A962;">Apri / gestisci prenotazione</a></p>`
    : "";
  return {
    subject: `Orario aggiornato — ${SITE.name}`,
    text: opts.bodyText,
    html: wrap(`
      <p>Ciao ${escapeHtml(opts.firstName)},</p>
      <p>il salone ha aggiornato il tuo appuntamento per <strong>${escapeHtml(opts.service)}</strong>.</p>
      <p>Nuovo orario: <strong>${escapeHtml(opts.newDate)}</strong> alle <strong>${escapeHtml(opts.newTime)}</strong>
      (prima: ${escapeHtml(opts.oldDate)} ${escapeHtml(opts.oldTime)}).${barber}</p>
      <p>Apri l'allegato .ics aggiornato per il calendario.</p>
      ${manage}`),
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
    console.warn(
      "[email] booking confirmation emails skipped (BOOKING_EMAIL_DISABLED) — WhatsApp + .ics only",
    );
    const skipped = { ok: true as const, skipped: true };
    return { customer: skipped, admin: skipped, owner: { results: [], ok: true } };
  }
  console.info("[email] booking confirm — Reply-To", mailReplyTo());
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
