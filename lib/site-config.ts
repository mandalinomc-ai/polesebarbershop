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
  email: "info@polesebarbershop.it",
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
export const CANCEL_HOURS_BEFORE = 3;

export function getMapsUrl(): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SITE.addressFull)}`;
}

export function getWhatsAppUrl(message?: string): string {
  const text = message || `Ciao ${SITE.name}, vorrei informazioni sui vostri servizi.`;
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`;
}

export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || SITE.siteUrl).replace(/\/$/, "");
}

export function getAdminEmail(): string {
  return process.env.ADMIN_EMAIL || SITE.email;
}
