export const TIMEZONE = "Europe/Rome";

export const SITE = {
  brand: "FELICE POLESE",
  name: "Polese Barbershop",
  legalName: "Felicepolese Barber",
  tagline: "L'Arte della Barberia d'Élite",
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL || "https://polesebarbershop.vercel.app",

  address: "Corso Dante n. 45",
  addressFull: "Corso Dante n. 45, 82100 Benevento BN, Italia",
  streetAddress: "Corso Dante n. 45",
  city: "Benevento",
  province: "BN",
  postalCode: "82100",
  country: "Italia",
  region: "Campania",
  previousAddress: "Via Giuseppe Ungaretti 6, 82100 Benevento",
  latitude: 41.1298,
  longitude: 14.7825,

  openingDate: "2026-09-01",
  openingDateTime: "2026-09-01T10:00:00",

  phone: "+39 351 252 3087",
  phoneDisplay: "351 252 3087",
  phoneTel: "+393512523087",
  whatsapp: "393512523087",
  email: "info@polesebarbershop.it",
  instagram: "https://instagram.com/felicepolese_barber",
  instagramHandle: "@felicepolese_barber",
  fresha:
    "https://www.fresha.com/it/a/felicepolese-barber-benevento-via-giuseppe-ungaretti-6-lhtcfefq",

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
      "barbiere Benevento, barbershop Benevento, taglio uomo Benevento, barba Benevento, Felice Polese, Polese Barbershop, rasatura uomo Campania, grooming uomo Benevento, Corso Dante barbiere",
    description:
      "Polese Barbershop — Felice Polese. Barberia d'élite a Benevento, Corso Dante 45. Taglio sartoriale, barba, rasatura calda e grooming premium. Prenota il tuo appuntamento.",
    comingSoonDescription:
      "Polese Barbershop di Felice Polese si trasferisce in Corso Dante 45, Benevento. Barberia d'élite: taglio sartoriale, barba e rasatura premium. Prossima apertura — resta aggiornato.",
    liveDescription:
      "Polese Barbershop — Felice Polese. Barberia d'élite a Benevento, Corso Dante 45. Taglio sartoriale, barba, rasatura calda e grooming premium. Prenota il tuo appuntamento.",
  },
} as const;

export const SLOT_STEP_MINUTES = 15;
export const MIN_NOTICE_MINUTES = 15;
export const REMINDER_LEAD_MINUTES = 30;
export const CANCEL_HOURS_BEFORE = 0;

export function getMapsUrl(): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    SITE.addressFull,
  )}`;
}

export function getWhatsAppUrl(message?: string): string {
  const text =
    message || `Ciao ${SITE.name}, vorrei informazioni sui vostri servizi.`;
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`;
}

export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || SITE.siteUrl).replace(/\/$/, "");
}

export function getAdminEmail(): string {
  return process.env.OWNER_EMAIL || process.env.ADMIN_EMAIL || SITE.email;
}

export function isComingSoon(now: Date = new Date()): boolean {
  const opening = Date.parse(`${SITE.openingDate}T10:00:00+02:00`);
  return now.getTime() < opening;
}
