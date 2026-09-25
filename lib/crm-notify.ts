import { SITE } from "@/lib/site-config";
import { sanitizeWhatsAppPhone } from "@/lib/phone";

export const NOTIFY_TEMPLATES = ["reminder", "promo", "followup"] as const;
export type NotifyTemplate = (typeof NOTIFY_TEMPLATES)[number];

export const NOTIFY_TEMPLATE_LABEL: Record<NotifyTemplate, string> = {
  reminder: "Promemoria",
  promo: "Promo",
  followup: "Follow-up",
};

export type NotifyCopyInput = {
  firstName: string;
  dateLabel?: string;
  timeLabel?: string;
  serviceNames?: string;
  barberName?: string;
};

export function buildNotifyCopy(template: NotifyTemplate, opts: NotifyCopyInput) {
  const nome = (opts.firstName || "").trim() || "ciao";
  const when = [opts.dateLabel, opts.timeLabel ? `alle ${opts.timeLabel}` : ""]
    .filter(Boolean)
    .join(" ");
  const service = opts.serviceNames ? ` (${opts.serviceNames})` : "";
  const barber = opts.barberName ? ` con ${opts.barberName}` : "";

  if (template === "reminder") {
    const slot = when ? ` ${when}${service}${barber}` : service || "";
    return {
      subject: `Promemoria appuntamento — ${SITE.name}`,
      text: `Ciao ${nome}, ti ricordiamo il tuo appuntamento da ${SITE.name}${slot}. Ti aspettiamo in ${SITE.addressFull}. Per info: ${SITE.phone}.`,
    };
  }
  if (template === "promo") {
    return {
      subject: `Un invito da ${SITE.name}`,
      text: `Ciao ${nome}, da ${SITE.name} ti aspettiamo per un taglio o un trattamento. Prenota quando vuoi su ${SITE.siteUrl.replace(/\/$/, "")}/#prenota oppure scrivici al ${SITE.phone}. Felice.`,
    };
  }
  return {
    subject: `Grazie da ${SITE.name}`,
    text: `Ciao ${nome}, è stato un piacere vederti da ${SITE.name}. Se vuoi, prenota il prossimo appuntamento online o scrivici su WhatsApp. A presto, Felice.`,
  };
}

/** Digits only, with country code, for https://wa.me/<digits> */
export function waMeDigits(phone: string): string | null {
  const e164 = sanitizeWhatsAppPhone(phone);
  if (!e164) return null;
  const digits = e164.replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}

/** Free WhatsApp: opens the barber's own app. No Twilio. */
export function waMeUrl(phone: string, text: string): string | null {
  const digits = waMeDigits(phone);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export const GMAIL_CRM_MISSING_IT =
  "Invio email non configurato: manca GMAIL_USER / GMAIL_APP_PASSWORD. Imposta le credenziali Gmail SMTP per mandare email dal gestionale.";

/** @deprecated alias */
export const RESEND_CRM_MISSING_IT = GMAIL_CRM_MISSING_IT;

export const WHATSAPP_MISSING_IT =
  "Numero WhatsApp non disponibile per questo cliente.";

export type StaffCancelCopyInput = {
  firstName: string;
  serviceNames: string;
  dateLabel: string;
  timeLabel: string;
  barberName?: string;
};

/** Automatic message when the salon cancels from the gestionale. */
export function buildStaffCancelCopy(opts: StaffCancelCopyInput) {
  const nome = (opts.firstName || "").trim() || "Ciao";
  const bookUrl = `${SITE.siteUrl.replace(/\/$/, "")}/#prenota`;
  const text =
    `Ciao ${nome},\n\n` +
    `ti informiamo che l'appuntamento del ${opts.dateLabel} alle ${opts.timeLabel} ` +
    `per ${opts.serviceNames} presso ${SITE.name} è stato annullato` +
    (opts.barberName ? ` (barber: ${opts.barberName})` : "") +
    `.\n\n` +
    `Ci scusiamo per l'inconveniente. Per scegliere un nuovo orario puoi prenotare ` +
    `direttamente dal nostro sito web:\n${bookUrl}\n\n` +
    `Oppure WhatsApp ${SITE.phone}.`;
  return {
    subject: `Appuntamento annullato — ${SITE.name}`,
    text,
  };
}

export type StaffRescheduleCopyInput = {
  firstName: string;
  serviceNames: string;
  oldDateLabel: string;
  oldTimeLabel: string;
  newDateLabel: string;
  newTimeLabel: string;
  barberName?: string;
};

/** Automatic message when the salon moves / retimes an appointment. */
export function buildStaffRescheduleCopy(opts: StaffRescheduleCopyInput) {
  const nome = (opts.firstName || "").trim() || "ciao";
  const barber = opts.barberName ? ` con ${opts.barberName}` : "";
  const sameDay = opts.oldDateLabel === opts.newDateLabel;
  const when = sameDay
    ? `alle ${opts.newTimeLabel} (prima era alle ${opts.oldTimeLabel})`
    : `il ${opts.newDateLabel} alle ${opts.newTimeLabel} (prima: ${opts.oldDateLabel} ${opts.oldTimeLabel})`;
  const text =
    `Ciao ${nome}, il salone ha aggiornato il tuo appuntamento da ${SITE.name} per ${opts.serviceNames}${barber}: ` +
    `ora è ${when}. Se non ti va bene, rispondi a questo messaggio o chiama ${SITE.phone}.`;
  return {
    subject: `Orario aggiornato — ${SITE.name}`,
    text,
  };
}
