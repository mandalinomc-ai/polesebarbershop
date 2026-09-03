import { normalizeWhatsAppNumber } from "./phone";

export const TIMEZONE = "Europe/Rome";

/** When true, homepage shows coming-soon gate only. Default false — full live site with countdown + booking. */
export const IS_COMING_SOON =
  process.env.NEXT_PUBLIC_IS_COMING_SOON === "true";

export const SITE = {
  brand: "FELICE POLESE",
  name: "Felice Polese Barber Shop",
  legalName: "Felice Polese Barber Shop",
  tagline: "MODERN BARBERING & FADE STUDIO",
  heroHeadline: "MODERN BARBERING & FADE STUDIO",
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://felicepolesebarbershop.vercel.app",
  address: "Corso Dante 45",
  addressFull: "Corso Dante 45 – 82100 Benevento (BN)",
  streetAddress: "Corso Dante 45",
  previousAddress: "ex Via Ungaretti 6",
  city: "Benevento",
  province: "BN",
  postalCode: "82100",
  country: "Italia",
  region: "Campania",
  latitude: 41.1298,
  longitude: 14.7825,
  openingDate: "2026-09-07",
  phone: "+39 327 015 6225",
  phoneDisplay: "327 015 6225",
  phoneTel: "+393270156225",
  whatsapp: "393270156225",
  email: "felicepolese550@gmail.com",
  instagram: "https://instagram.com/felicepolese_barber",
  instagramHandle: "@felicepolese_barber",
  fiscalCode: "PLSFLC04S21A783K",
  vatNumber: "01894030624",
  pricesIncludeVat: "Tutti i prezzi sono da intendersi IVA inclusa.",
  hours: {
    weekdays: "Mar — Sab · 09:30 — 20:00",
    monday: "Lun · Chiuso",
    sunday: "Dom · Chiuso",
  },
  seo: {
    keywords:
      "barbiere Benevento, Felice Polese Barber Shop, Felice Polese, Davide, Corso Dante 45",
    description:
      "Felice Polese Barber Shop — Felice e Davide. Barberia d'élite a Benevento, Corso Dante 45. Prenota online.",
  },
} as const;

/** Liked-page document title (pre-overwrite marble HTML). */
export const SITE_DOCUMENT_TITLE = "Felice Polese | Modern Barbering & Fade Studio";

/** Public FAB / disdette on the website (customers write here). Not salon booking alerts. */
export const PUBLIC_CONTACT_WHATSAPP = "+393270156225";
/** Official salon WhatsApp for automatic booking alerts. */
export const SALON_NOTIFY_WHATSAPP_FALLBACK = "+393270156225";

export function getSalonNotifyWhatsApp(): string {
  const fromEnv = normalizeWhatsAppNumber(process.env.SALON_NOTIFY_WHATSAPP || "");
  if (fromEnv && fromEnv !== PUBLIC_CONTACT_WHATSAPP) return fromEnv;
  return SALON_NOTIFY_WHATSAPP_FALLBACK;
}

export const SLOT_STEP_MINUTES = 5;
/** Open days shown in the booking wizard day scroller (no cap on total bookings). */
export const BOOKING_UI_DAYS = 42;
/** Open days in the hero mini-calendar. */
export const HERO_CALENDAR_DAYS = 14;
/** Max open days the calendar can list when generating bookable dates. */
export const BOOKING_HORIZON_DAYS = 365;
export const MIN_NOTICE_MINUTES = 15;
export const REMINDER_LEAD_MINUTES = 30;
/** Minimum lead time before appointment start to allow online cancellation (Europe/Rome wall time via UTC instants). */
export const CANCEL_MINUTES_BEFORE = 30;
/** Italian copy for cancellation notice. */
export const CANCEL_NOTICE_IT = "30 minuti";

/** True when the appointment can still be cancelled online (≥ CANCEL_MINUTES_BEFORE before start). */
export function canCancelAppointment(
  startsAt: Date | string,
  now: Date = new Date(),
): boolean {
  const minutesLeft =
    (new Date(startsAt).getTime() - now.getTime()) / 60_000;
  return minutesLeft >= CANCEL_MINUTES_BEFORE;
}
export const MAPS_DESTINATION = "Corso Dante 45, 82100 Benevento";

/** Generic salon contact — info, hours, prices or a quick tip. */
export const SALON_CONTACT_MESSAGE =
  "Ciao, vorrei un'informazione su orari, prezzi o servizi.";

/** Coming-soon WhatsApp CTA — notify me at opening. */
export const NOTIFY_WHATSAPP_MESSAGE =
  "Ciao, vorrei essere avvisato all'apertura di Felice Polese Barber Shop.";

/** Homepage / stories CTA — booking stays visible before official opening. */
export const HERO_CTA = "Prenota il tuo appuntamento";
export const HERO_SLOT_CTA = "Prenota il tuo slot";
export const HERO_MENU_CTA = "Vedi il menu";
export const HERO_SENTENCE = "Precisione tecnica, stile contemporaneo.";
export const HERO_LEAD =
  "Fade ad alta definizione, grooming e skincare. Studio pulito, ritmo veloce, risultato netto. Benevento.";
export const HERO_PRE_OPENING_EYEBROW = "Prenotazioni già aperte";
export const HERO_BEFORE_OPENING =
  "Prenota il tuo appuntamento per l'apertura";
export const BOOKING_DATE_PARAM = "data";
export const BOOKING_SERVICE_PARAM = "servizio";
export const BOOKING_DATE_STORAGE_KEY = "polese-booking-date";
export const BOOKING_DATE_EVENT = "polese-booking-date";
export const BOOKING_SERVICE_EVENT = "polese-booking-service";

export function wallDateRome(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Opening instant at 10:00 Europe/Rome on the official opening civil date. */
export function openingTargetMs(): number {
  return Date.parse(`${SITE.openingDate}T10:00:00+02:00`);
}

export function isBeforeOfficialOpening(now: Date = new Date()): boolean {
  return now.getTime() < openingTargetMs();
}

export function getHeroHeadline(now: Date = new Date()): string {
  return isBeforeOfficialOpening(now) ? HERO_BEFORE_OPENING : HERO_CTA;
}

/** Countdown label — e.g. "APERTURA 7 SETTEMBRE". */
export function formatOpeningCountdownLabel(): string {
  const parts = SITE.openingDate.split("-").map(Number);
  const y = parts[0]!;
  const m = parts[1]!;
  const d = parts[2]!;
  const utcNoon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const month = new Intl.DateTimeFormat("it-IT", {
    month: "long",
    timeZone: "UTC",
  })
    .format(utcNoon)
    .toUpperCase();
  return `APERTURA ${d} ${month}`;
}

export function serviceBookingHref(serviceId: string): string {
  return `/?${BOOKING_SERVICE_PARAM}=${encodeURIComponent(serviceId)}#prenota`;
}

export function readBookingServiceFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const query = new URLSearchParams(window.location.search).get(
    BOOKING_SERVICE_PARAM,
  );
  if (query && /^[a-z0-9-]+$/.test(query)) return query;
  return null;
}

export type BookingConfirmCopy = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  service: string;
  dateLabel: string;
  timeLabel: string;
  barberName?: string;
  priceLabel?: string;
  durationLabel?: string;
  manageUrl?: string;
};

export function getBookingConfirmMessage(opts: BookingConfirmCopy): string {
  const name = opts.firstName?.trim() || "—";
  const tel = opts.phone?.trim() || "—";
  return `Ciao Felice, ho prenotato su ${SITE.name}: ${opts.service} il ${opts.dateLabel} alle ${opts.timeLabel}. Nome: ${name} - Tel: ${tel}`;
}

/** Cliente → salone (wa.me 327). Il cliente apre la chat con Felice. */
export function getBookingConfirmWhatsAppUrl(opts: BookingConfirmCopy): string {
  return getWhatsAppUrl(getBookingConfirmMessage(opts));
}

/** Testo automatico WhatsApp al cliente. */
export function getCustomerConfirmMessage(opts: BookingConfirmCopy): string {
  const name = opts.firstName?.trim() || "";
  const barber = opts.barberName?.trim() ? ` con ${opts.barberName.trim()}` : "";
  const hello = name ? `Ciao ${name}` : "Ciao";
  const price = opts.priceLabel?.trim() ? ` · ${opts.priceLabel.trim()}` : "";
  const duration = opts.durationLabel?.trim() ? ` · ${opts.durationLabel.trim()}` : "";
  return `${hello}, la tua prenotazione da ${SITE.name} è confermata: ${opts.service}${price}${duration} il ${opts.dateLabel} alle ${opts.timeLabel}${barber}. Ti aspettiamo in ${SITE.streetAddress}. Per modifiche o disdette chiama o scrivi al ${SITE.phone}.`;
}

/** Testo automatico WhatsApp al salone (numero ufficiale 327). */
export function getSalonNewBookingMessage(opts: BookingConfirmCopy): string {
  const name = [opts.firstName, opts.lastName].filter(Boolean).join(" ").trim() || "Cliente";
  const price = opts.priceLabel?.trim() ? ` · ${opts.priceLabel.trim()}` : "";
  const duration = opts.durationLabel?.trim() ? ` · ${opts.durationLabel.trim()}` : "";
  const manage = opts.manageUrl?.trim() ? `\nGestisci: ${opts.manageUrl.trim()}` : "";
  return [
    `NUOVA PRENOTAZIONE — ${SITE.name}`,
    `Cliente: ${name}`,
    `Tel: ${opts.phone?.trim() || "—"}`,
    `Email: ${opts.email?.trim() || "—"}`,
    `Servizio: ${opts.service}${price}${duration}`,
    `Barbiere: ${opts.barberName?.trim() || "—"}`,
    `Quando: ${opts.dateLabel} alle ${opts.timeLabel}`,
    manage.trim(),
  ].filter(Boolean).join("\n");
}

/** Salone → cliente. Felice clicca e apre la chat WhatsApp con il numero del cliente. */
export function getSalonToCustomerWhatsAppUrl(
  customerPhone: string,
  opts: BookingConfirmCopy,
): string | null {
  return whatsAppMeUrl(customerPhone, getCustomerConfirmMessage(opts));
}

export function whatsAppMeUrl(phone: string, message: string): string | null {
  const e164 = normalizeWhatsAppNumber(phone);
  if (!e164) return null;
  const digits = e164.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function bookingWizardHref(date?: string): string {
  if (!date) return "/#prenota";
  return `/?${BOOKING_DATE_PARAM}=${encodeURIComponent(date)}#prenota`;
}

export function readBookingDateFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const query = new URLSearchParams(window.location.search).get(BOOKING_DATE_PARAM);
  if (query && /^\d{4}-\d{2}-\d{2}$/.test(query)) return query;
  try {
    const stored = sessionStorage.getItem(BOOKING_DATE_STORAGE_KEY);
    if (stored && /^\d{4}-\d{2}-\d{2}$/.test(stored)) return stored;
  } catch {
    /* private mode */
  }
  return null;
}

export const SALON_CONTACT = {
  id: "scrivici",
  title: "Scrivici",
  eyebrow: "Contatti",
  body: "Info, orari, prezzi o un consiglio — Felice e Davide rispondono dal salone su WhatsApp o email.",
  cta: "WhatsApp",
  prefill: SALON_CONTACT_MESSAGE,
} as const;

export function getMapsUrl(): string {
  return `https://maps.google.com/?destination=${encodeURIComponent(MAPS_DESTINATION)}`;
}

export function getWhatsAppUrl(message?: string): string {
  const text = message || SALON_CONTACT_MESSAGE;
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`;
}

/** Direct chat QR / link — no prefilled text. */
export function getWhatsAppChatUrl(): string {
  return `https://wa.me/${SITE.whatsapp}`;
}

export function getPrenotaUrl(): string {
  return `${getSiteUrl()}/#prenota`;
}

export type SocialChannel = {
  id: "instagram" | "whatsapp" | "prenota";
  label: string;
  handle: string;
  href: string;
  qr: string;
  qrPayload: string;
  external: boolean;
};

/** Instagram, WhatsApp and prenota — QR PNG per canale (il PDF logo non li aveva). */
export function getSocialChannels(): SocialChannel[] {
  return [
    {
      id: "instagram",
      label: "Instagram",
      handle: SITE.instagramHandle,
      href: SITE.instagram,
      qr: "/assets/images/qr/instagram.png",
      qrPayload: SITE.instagram,
      external: true,
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      handle: SITE.phone,
      href: getWhatsAppChatUrl(),
      qr: "/assets/images/qr/whatsapp.png",
      qrPayload: getWhatsAppChatUrl(),
      external: true,
    },
    {
      id: "prenota",
      label: HERO_CTA,
      handle: "Online",
      href: "/#prenota",
      qr: "/assets/images/qr/prenota.png",
      qrPayload: getPrenotaUrl(),
      external: false,
    },
  ];
}

export function getMailtoUrl(message?: string): string {
  const body = message || SALON_CONTACT_MESSAGE;
  const params = new URLSearchParams({
    subject: `Informazione — ${SITE.name}`,
    body,
  });
  return `mailto:${SITE.email}?${params.toString()}`;
}

export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || SITE.siteUrl).replace(/\/$/, "");
}

/** Gmail del salone per avvisi prenotazioni. */
export const ADMIN_EMAIL_FALLBACK = "felicepolese550@gmail.com";

export function getAdminEmail(): string {
  return (
    process.env.ADMIN_EMAIL ||
    process.env.OWNER_EMAIL ||
    ADMIN_EMAIL_FALLBACK
  );
}

/** Recipient for booking notification emails (owner inbox). */
export function getBookingNotificationEmail(): string {
  return (
    process.env.BOOKING_NOTIFICATION_EMAIL ||
    getAdminEmail()
  );
}
