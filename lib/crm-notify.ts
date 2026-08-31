import { SITE } from "@/lib/site-config";
import { normalizeItalianPhone } from "@/lib/phone";

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
      text: `Ciao ${nome}, da ${SITE.name} ti aspettiamo per un taglio o un trattamento. Prenota quando vuoi su ${SITE.siteUrl.replace(/\/$/, "")}/#prenota oppure scrivici al ${SITE.phone}. Felice e Davide.`,
    };
  }
  return {
    subject: `Grazie da ${SITE.name}`,
    text: `Ciao ${nome}, è stato un piacere vederti da ${SITE.name}. Se vuoi, prenota il prossimo appuntamento online o scrivici su WhatsApp. A presto, Felice e Davide.`,
  };
}

/** Digits only, with country code, for https://wa.me/<digits> */
export function waMeDigits(phone: string): string | null {
  const e164 = normalizeItalianPhone(phone);
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

export const RESEND_CRM_MISSING_IT =
  "Invio email non configurato: manca RESEND_API_KEY. Imposta la chiave Resend (piano gratuito) per mandare email dal gestionale.";

export const WHATSAPP_MISSING_IT =
  "Numero WhatsApp non disponibile per questo cliente.";
