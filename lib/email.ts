import { Resend } from "resend";
import { SITE, getAdminEmail } from "./site-config";

export type EmailSendResult =
  | { ok: true; skipped?: boolean; id?: string }
  | { ok: false; error: string };

export const RESEND_MISSING_IT =
  "Invio email non configurato. Scarica il file .ics oppure chiama il +39 327 015 6225.";

function fromAddress() {
  return process.env.RESEND_FROM || `${SITE.name} <prenotazioni@polesebarbershop.it>`;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  ics?: { filename: string; content: string };
}): Promise<EmailSendResult> {
  if (!process.env.RESEND_API_KEY) return { ok: false, error: RESEND_MISSING_IT };
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: fromAddress(),
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      attachments: opts.ics
        ? [{
            filename: opts.ics.filename,
            content: Buffer.from(opts.ics.content, "utf8"),
            contentType: /METHOD:CANCEL/.test(opts.ics.content)
              ? "text/calendar; charset=utf-8; method=CANCEL"
              : "text/calendar; charset=utf-8; method=PUBLISH",
          }]
        : undefined,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Invio email fallito" };
  }
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

export async function sendBookingEmails(opts: {
  customerEmail: string;
  customer: ReturnType<typeof customerConfirmEmail>;
  owner: ReturnType<typeof ownerNewBookingEmail>;
  ics: { filename: string; content: string };
}) {
  const customer = await sendEmail({ to: opts.customerEmail, ...opts.customer, ics: opts.ics });
  const admin = await sendEmail({ to: getAdminEmail(), ...opts.owner, ics: opts.ics });
  return { customer, admin };
}
