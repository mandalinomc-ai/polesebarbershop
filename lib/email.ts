import { Resend } from "resend";
import { SITE, getAdminEmail } from "./site-config";

export type EmailSendResult =
  | { ok: true; skipped?: boolean; id?: string }
  | { ok: false; error: string };

export const RESEND_MISSING_IT =
  "Invio email non configurato. Scarica il file .ics e aggiungi l'appuntamento al calendario, oppure chiama il +39 327 015 6225.";

function fromAddress(): string {
  return (
    process.env.RESEND_FROM ||
    `${SITE.name} <prenotazioni@polesebarbershop.it>`
  );
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  ics?: { filename: string; content: string };
}): Promise<EmailSendResult> {
  if (!process.env.RESEND_API_KEY) {
    return { ok: true, skipped: true };
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: fromAddress(),
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      attachments: opts.ics
        ? [
            {
              filename: opts.ics.filename,
              content: Buffer.from(opts.ics.content, "utf8"),
              contentType: "text/calendar; charset=utf-8; method=PUBLISH",
            },
          ]
        : undefined,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invio email fallito",
    };
  }
}

function wrap(inner: string): string {
  return `<!DOCTYPE html>
<html lang="it">
<body style="margin:0;background:#0B0B0B;color:#F4F2EF;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <p style="letter-spacing:0.28em;text-transform:uppercase;font-size:11px;color:#C9A962;font-family:system-ui,sans-serif;">${SITE.brand}</p>
    <h1 style="font-weight:500;font-size:28px;margin:8px 0 24px;">${SITE.name}</h1>
    ${inner}
    <p style="margin-top:32px;font-size:13px;color:#B5B5B5;font-family:system-ui,sans-serif;line-height:1.6;">
      ${SITE.addressFull}<br/>
      ${SITE.phone}<br/>
      C.F. ${SITE.fiscalCode} · P.IVA ${SITE.vatNumber}
    </p>
  </div>
</body>
</html>`;
}

export function customerConfirmEmail(opts: {
  firstName: string;
  service: string;
  barber: string;
  date: string;
  time: string;
  manageUrl: string;
  priceLabel: string;
}): { subject: string; html: string; text: string } {
  const subject = `Prenotazione confermata — ${SITE.name}`;
  const text = `Ciao ${opts.firstName}, la tua prenotazione per ${opts.service} con ${opts.barber} il ${opts.date} alle ${opts.time} (${opts.priceLabel}) è confermata. Aggiungi l'evento al calendario con l'allegato .ics (promemoria 30 minuti prima). Gestisci o disdici: ${opts.manageUrl}`;
  const html = wrap(`
    <p style="font-size:18px;line-height:1.6;">Ciao ${opts.firstName},</p>
    <p style="font-size:16px;line-height:1.7;color:#B5B5B5;">la tua prenotazione è <strong style="color:#F4F2EF;">confermata</strong>.</p>
    <p style="font-size:16px;line-height:1.7;">
      <strong>${opts.service}</strong> · ${opts.priceLabel}<br/>
      con ${opts.barber}<br/>
      ${opts.date} alle ${opts.time}
    </p>
    <p style="font-size:14px;color:#B5B5B5;line-height:1.6;">In allegato trovi il file .ics: aprilo per aggiungere l'appuntamento ad Apple Calendar o Google Calendar. Riceverai un promemoria 30 minuti prima.</p>
    <p><a href="${opts.manageUrl}" style="color:#C9A962;">Gestisci o disdici l'appuntamento</a></p>
  `);
  return { subject, html, text };
}

export function ownerNewBookingEmail(opts: {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  service: string;
  barber: string;
  date: string;
  time: string;
  priceLabel: string;
}): { subject: string; html: string; text: string } {
  const subject = `Nuova prenotazione — ${opts.firstName} ${opts.lastName}`;
  const text = `Nuova prenotazione: ${opts.firstName} ${opts.lastName} (${opts.phone}, ${opts.email}) — ${opts.service} (${opts.priceLabel}) con ${opts.barber} il ${opts.date} alle ${opts.time}.`;
  const html = wrap(`
    <p style="font-size:18px;">Nuova prenotazione</p>
    <p style="font-size:16px;line-height:1.7;">
      ${opts.firstName} ${opts.lastName}<br/>
      ${opts.phone} · ${opts.email}<br/>
      ${opts.service} · ${opts.priceLabel}<br/>
      ${opts.date} alle ${opts.time}<br/>
      Barbiere: ${opts.barber}
    </p>
  `);
  return { subject, html, text };
}

export function customerCancelEmail(opts: {
  firstName: string;
  service: string;
  date: string;
  time: string;
}): { subject: string; html: string; text: string } {
  const subject = `Prenotazione annullata — ${SITE.name}`;
  const text = `Ciao ${opts.firstName}, la tua prenotazione per ${opts.service} del ${opts.date} alle ${opts.time} è stata annullata.`;
  const html = wrap(`
    <p style="font-size:18px;">Ciao ${opts.firstName},</p>
    <p style="font-size:16px;line-height:1.7;color:#B5B5B5;">
      la prenotazione per <strong style="color:#F4F2EF;">${opts.service}</strong>
      del ${opts.date} alle ${opts.time} è stata <strong style="color:#F4F2EF;">annullata</strong>.
    </p>
  `);
  return { subject, html, text };
}

export async function sendBookingEmails(opts: {
  customerEmail: string;
  customer: ReturnType<typeof customerConfirmEmail>;
  owner: ReturnType<typeof ownerNewBookingEmail>;
  ics: { filename: string; content: string };
}): Promise<{ customer: EmailSendResult; admin: EmailSendResult }> {
  const customer = await sendEmail({
    to: opts.customerEmail,
    subject: opts.customer.subject,
    html: opts.customer.html,
    text: opts.customer.text,
    ics: opts.ics,
  });
  const admin = await sendEmail({
    to: getAdminEmail(),
    subject: opts.owner.subject,
    html: opts.owner.html,
    text: opts.owner.text,
    ics: opts.ics,
  });
  return { customer, admin };
}
