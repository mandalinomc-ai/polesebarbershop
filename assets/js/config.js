/**
 * Polese Barbershop — Configurazione globale
 * Imposta IS_COMING_SOON su false per pubblicare il sito completo.
 */
const IS_COMING_SOON = true;

const SITE_CONFIG = {
  IS_COMING_SOON: IS_COMING_SOON,

  brand: 'FELICE POLESE',
  name: 'Polese Barbershop',
  legalName: 'Felicepolese Barber',
  tagline: "L'Arte della Barberia d'Élite",

  /** URL pubblico del sito (aggiornare dopo deploy Vercel) */
  siteUrl: 'https://polesebarbershop.vercel.app',

  address: 'Corso Dante n. 45',
  addressFull: 'Corso Dante n. 45, 82100 Benevento BN, Italia',
  city: 'Benevento',
  province: 'BN',
  postalCode: '82100',
  country: 'Italia',
  region: 'Campania',

  /** Sede attuale (fino al trasferimento) */
  previousAddress: 'Via Giuseppe Ungaretti 6, 82100 Benevento',

  latitude: 41.1298,
  longitude: 14.7825,

  openingDate: '2026-09-01T10:00:00',

  phone: '+39 351 252 3087',
  phoneDisplay: '351 252 3087',
  whatsapp: '393512523087',
  email: 'info@polesebarbershop.it',
  instagram: 'https://instagram.com/felicepolese_barber',
  instagramHandle: '@felicepolese_barber',
  fresha: 'https://www.fresha.com/it/a/felicepolese-barber-benevento-via-giuseppe-ungaretti-6-lhtcfefq',

  hours: {
    weekdays: 'Mar — Sab · 09:30 — 20:00',
    monday: 'Lun · Chiuso',
    sunday: 'Dom · Chiuso',
  },

  seo: {
    keywords: 'barbiere Benevento, barbershop Benevento, taglio uomo Benevento, barba Benevento, Felice Polese, Polese Barbershop, rasatura uomo Campania, grooming uomo Benevento, Corso Dante barbiere',
    comingSoonDescription: 'Polese Barbershop di Felice Polese si trasferisce in Corso Dante 45, Benevento. Barberia d\'élite: taglio sartoriale, barba e rasatura premium. Prossima apertura — resta aggiornato.',
    liveDescription: 'Polese Barbershop — Felice Polese. Barberia d\'élite a Benevento, Corso Dante 45. Taglio sartoriale, barba, rasatura calda e grooming premium. Prenota il tuo appuntamento.',
  },
};
