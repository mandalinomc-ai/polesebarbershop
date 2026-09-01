export const TIMEZONE = "Europe/Rome";

/** When true, homepage shows coming-soon gate only. Default false — full live site with countdown + booking. */
export const IS_COMING_SOON =
  process.env.NEXT_PUBLIC_IS_COMING_SOON === "true";

export const SITE = {
  brand: "FELICE POLESE",
  name: "Polese Barbershop",
  legalName: "Polese Barbershop",
  tagline: "L'Arte della Barberia Sartoriale",
  heroHeadline: "L'ARTE DELLA BARBERIA SARTORIALE",
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL || "https://polesebarbershop.vercel.app",
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
  phone: "+39 351 252 3087",
  phoneDisplay: "351 252 3087",
  phoneTel: "+393512523087",
  whatsapp: "393512523087",
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
      "barbiere Benevento, barbershop Benevento, Felice Polese, Davide, Corso Dante 45",
    description:
      "Polese Barbershop — Felice e Davide. Barberia d'élite a Benevento, Corso Dante 45. Prenota online.",
  },
} as const;

export const SLOT_STEP_MINUTES = 5;
/** Open days shown in the booking wizard day scroller (no cap on total bookings). */
export const BOOKING_UI_DAYS = 42;
/** Open days in the hero mini-calendar. */
export const HERO_CALENDAR_DAYS = 14;
/** Max open days the calendar can list when generating bookable dates. */
export const BOOKING_HORIZON_DAYS = 365;
export const MIN_NOTICE_MINUTES = 15;
export const REMINDER_LEAD_MINUTES = 30;
export const CANCEL_HOURS_BEFORE = 1;
/** Italian copy: "1 ora" (not "1 ore" / not 24h). */
export const CANCEL_NOTICE_IT = "1 ora";
export const MAPS_DESTINATION = "Corso Dante 45, 82100 Benevento";

/** Generic salon contact — info, hours, prices or a quick tip. */
export const SALON_CONTACT_MESSAGE =
  "Ciao, vorrei un'informazione su orari, prezzi o servizi.";

/** Coming-soon WhatsApp CTA — notify me at opening. */
export const NOTIFY_WHATSAPP_MESSAGE =
  "Ciao, vorrei essere avvisato all'apertura di Polese Barbershop.";

/** Homepage / stories CTA — booking stays visible before official opening. */
export const HERO_CTA = "Prenota già ora";
export const HERO_BEFORE_OPENING =
  "Prenota già ora, prima dell'apertura ufficiale";
export const BOOKING_DATE_PARAM = "data";
export const BOOKING_DATE_STORAGE_KEY = "polese-booking-date";
export const BOOKING_DATE_EVENT = "polese-booking-date";

export function wallDateRome(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isBeforeOfficialOpening(now: Date = new Date()): boolean {
  // Keep story copy through the opening civil date in Rome (not UTC midnight).
  return wallDateRome(now) <= SITE.openingDate;
}

export function getHeroHeadline(now: Date = new Date()): string {
  return isBeforeOfficialOpening(now) ? HERO_BEFORE_OPENING : "Prenota il tuo posto";
}

export type BookingConfirmCopy = {
  firstName?: string;
  phone?: string;
  service: string;
  dateLabel: string;
  timeLabel: string;
  barberName?: string;
};

export function getBookingConfirmMessage(opts: BookingConfirmCopy): string {
  const name = opts.firstName?.trim() || "—";
  const tel = opts.phone?.trim() || "—";
  return `Ciao Felice, ho prenotato su ${SITE.name}: ${opts.service} il ${opts.dateLabel} alle ${opts.timeLabel}. Nome: ${name} - Tel: ${tel}`;
}

export function getBookingConfirmWhatsAppUrl(opts: BookingConfirmCopy): string {
  return getWhatsAppUrl(getBookingConfirmMessage(opts));
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

/** Gmail del salone per avvisi prenotazioni (non l'account GitHub). */
export const ADMIN_EMAIL_FALLBACK = "felicepolese550@gmail.com";

const RESEND_TEST_DOMAIN = ["resend", "dev"].join(".");

export function getAdminEmail(): string {
  return (
    process.env.ADMIN_EMAIL ||
    process.env.OWNER_EMAIL ||
    ADMIN_EMAIL_FALLBACK
  );
}

/** Inbox che riceve davvero le email con From di test Resend (account owner). */
export function getNotifyEmail(): string | null {
  const email = process.env.NOTIFY_EMAIL?.trim();
  return email || null;
}

/** True when RESEND_FROM uses onboarding@resend.dev (piano gratuito, dominio non verificato). */
export function isResendTestFrom(): boolean {
  const from = process.env.RESEND_FROM?.trim() || "";
  const domain = from.match(/@([^>\s]+)/)?.[1]?.toLowerCase() || "";
  return !from || domain === RESEND_TEST_DOMAIN;
}

/**
 * Destinatari avvisi prenotazione al salone.
 * In test mode Resend consegna solo a NOTIFY_EMAIL; con dominio verificato va ad ADMIN_EMAIL.
 */
export function getOwnerNotifyEmails(): string[] {
  const admin = getAdminEmail().trim().toLowerCase();
  const notify = getNotifyEmail()?.toLowerCase() || "";

  if (isResendTestFrom()) {
    if (notify) return [notify];
    return [admin];
  }

  const emails = new Set<string>([admin]);
  if (notify && notify !== admin) emails.add(notify);
  return [...emails];
}
