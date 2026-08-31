import { normalizeWhatsAppNumber } from "./phone";

export { normalizeWhatsAppNumber };

export type WhatsAppSendResult =
  | { ok: true; skipped?: boolean; sid?: string }
  | { ok: false; error: string };

function twilioConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_WHATSAPP_FROM,
  );
}

function fromAddress(): string {
  const from = process.env.TWILIO_WHATSAPP_FROM || "";
  return from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;
}

export async function sendWhatsAppMessage(
  to: string,
  body: string,
): Promise<WhatsAppSendResult> {
  if (!twilioConfigured()) {
    return { ok: true, skipped: true };
  }
  const normalised = normalizeWhatsAppNumber(to);
  if (!normalised) {
    return { ok: false, error: "Numero WhatsApp non valido" };
  }
  const sid = process.env.TWILIO_ACCOUNT_SID as string;
  const token = process.env.TWILIO_AUTH_TOKEN as string;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const params = new URLSearchParams({
    From: fromAddress(),
    To: `whatsapp:${normalised}`,
    Body: body,
  });
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const json = (await res.json()) as { sid?: string; message?: string };
    if (!res.ok) {
      return { ok: false, error: json.message || `Twilio HTTP ${res.status}` };
    }
    return { ok: true, sid: json.sid };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invio WhatsApp fallito",
    };
  }
}

export function customerConfirmMessage(opts: {
  firstName: string;
  service: string;
  barber: string;
  date: string;
  time: string;
  manageUrl: string;
}): string {
  return `Ciao ${opts.firstName}, la tua prenotazione per ${opts.service} con ${opts.barber} per il ${opts.date} alle ${opts.time} è CONFERMATA! Per gestire o disdire l'appuntamento clicca qui: ${opts.manageUrl}`;
}

export function ownerNewBookingMessage(opts: {
  firstName: string;
  lastName: string;
  phone: string;
  service: string;
  date: string;
  time: string;
  barber: string;
}): string {
  return `NUOVA PRENOTAZIONE! Cliente: ${opts.firstName} ${opts.lastName} (${opts.phone}). Servizio: ${opts.service}. Data: ${opts.date} alle ${opts.time}. Barbiere: ${opts.barber}.`;
}

export function reminderMessage(opts: {
  firstName: string;
  service: string;
  time: string;
}): string {
  return `Ciao ${opts.firstName}! Ti ricordiamo che il tuo appuntamento per ${opts.service} da Polese Barbershop è tra 30 MINUTI (ore ${opts.time}). Ti aspettiamo!`;
}

export function customerCancelMessage(opts: {
  firstName: string;
  service: string;
  date: string;
  time: string;
}): string {
  return `Ciao ${opts.firstName}, la tua prenotazione per ${opts.service} del ${opts.date} alle ${opts.time} è stata ANNULLATA. Se vuoi, puoi prenotare di nuovo su ${process.env.NEXT_PUBLIC_SITE_URL || "https://polesebarbershop.vercel.app"}/#prenota`;
}
