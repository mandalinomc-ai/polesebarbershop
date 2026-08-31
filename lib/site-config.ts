export const TIMEZONE = "Europe/Rome";

export const SITE = {
  brand: "FELICE POLESE",
  name: "Polese Barbershop",
  legalName: "Polese Barbershop",
  tagline: "L'Arte della Barberia d'Élite",
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL || "https://polesebarbershop.vercel.app",
  address: "Corso Dante Alighieri, 44",
  addressFull: "Corso Dante Alighieri, 44 – 82100 Benevento (BN)",
  streetAddress: "Corso Dante Alighieri, 44",
  city: "Benevento",
  province: "BN",
  postalCode: "82100",
  country: "Italia",
  region: "Campania",
  latitude: 41.1298,
  longitude: 14.7825,
  openingDate: "2026-09-01",
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
      "barbiere Benevento, barbershop Benevento, Felice Polese, Davide, Corso Dante Alighieri 44",
    description:
      "Polese Barbershop — Felice e Davide. Barberia d'élite a Benevento, Corso Dante Alighieri 44. Prenota online.",
  },
} as const;

export const SLOT_STEP_MINUTES = 5;
export const MIN_NOTICE_MINUTES = 15;
export const REMINDER_LEAD_MINUTES = 30;
export const CANCEL_HOURS_BEFORE = 1;
/** Italian copy: "1 ora" (not "1 ore" / not 24h). */
export const CANCEL_NOTICE_IT = "1 ora";
export const MAPS_DESTINATION = "Corso Dante Alighieri 44, 82100 Benevento";

/** Generic salon contact — info, hours, prices or a quick tip. */
export const SALON_CONTACT_MESSAGE =
  "Ciao, vorrei parlare con il salone per un'informazione.";

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
  return wallDateRome(now) < SITE.openingDate;
}

export function getHeroHeadline(now: Date = new Date()): string {
  return isBeforeOfficialOpening(now) ? HERO_BEFORE_OPENING : "Prenota il tuo posto";
}

export type BookingConfirmCopy = {
  firstName?: string;
  service: string;
  dateLabel: string;
  timeLabel: string;
  barberName?: string;
};

export function getBookingConfirmMessage(opts: BookingConfirmCopy): string {
  const who = opts.firstName?.trim() ? ` sono ${opts.firstName.trim()} e` : "";
  const barber = opts.barberName ? ` con ${opts.barberName}` : "";
  return `Ciao,${who} ho prenotato ${opts.service} il ${opts.dateLabel} alle ${opts.timeLabel}${barber} da ${SITE.name}.`;
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
  title: "Parla con il salone",
  eyebrow: "Scrivici",
  body: "Puoi scriverci per info, orari, prezzi o un consiglio. Felice e Davide ti rispondono dal salone.",
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

export function getAdminEmail(): string {
  return (
    process.env.ADMIN_EMAIL ||
    process.env.OWNER_EMAIL ||
    ADMIN_EMAIL_FALLBACK
  );
}
