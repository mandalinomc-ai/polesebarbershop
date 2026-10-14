import type { ClientProfile } from "@/lib/client-kit/types";

/**
 * Blank white-label pack — copy this folder with:
 *   node scripts/scaffold-client.mjs --slug mio-barbiere --name "Mio Barbiere"
 *
 * Fill every REPLACE_* value, drop media into public/assets/, then point
 * clients/active.ts at the new slug (scaffold does this when --activate).
 */
export const profile: ClientProfile = {
  slug: "nuovo-cliente",
  label: "REPLACE_NOME_SALONE",
  primaryBarberName: "REPLACE_NOME_BARBIERE",
  primaryBarberTitle: "Master barber",
  productLineName: "REPLACE_LINEA_PRODOTTI",
  site: {
    brand: "REPLACE_BRAND_MAIUSCOLO",
    name: "REPLACE_NOME_SALONE",
    legalName: "REPLACE_RAGIONE_SOCIALE",
    tagline: "REPLACE_TAGLINE",
    heroHeadline: "REPLACE_TAGLINE",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://www.replace-dominio.it",
    address: "REPLACE_VIA_NUMERO",
    addressFull: "REPLACE_VIA_NUMERO – REPLACE_CAP REPLACE_CITTA (REPLACE_PROVINCIA)",
    streetAddress: "REPLACE_VIA_NUMERO",
    city: "REPLACE_CITTA",
    province: "REPLACE_PROVINCIA",
    postalCode: "REPLACE_CAP",
    country: "Italia",
    region: "REPLACE_REGIONE",
    latitude: 0,
    longitude: 0,
    openingDate: "2099-01-01",
    phone: "+39 REPLACE_TELEFONO",
    phoneDisplay: "REPLACE_TELEFONO",
    phoneTel: "+39REPLACE_TELEFONO_SOLO_CIFRE",
    whatsapp: "39REPLACE_TELEFONO_SOLO_CIFRE",
    email: "replace@email.it",
    instagram: "https://instagram.com/REPLACE_HANDLE",
    instagramHandle: "@REPLACE_HANDLE",
    fiscalCode: "REPLACE_CF",
    vatNumber: "REPLACE_PIVA",
    pricesIncludeVat: "Tutti i prezzi si intendono IVA inclusa.",
    hours: {
      monday: "Lun · 09:00 — 19:00",
      tuesday: "Mar · 09:00 — 19:00",
      wednesday: "Mer · 09:00 — 19:00",
      thursday: "Gio · 09:00 — 19:00",
      friday: "Ven · 09:00 — 19:00",
      saturday: "Sab · 09:00 — 19:00",
      sunday: "Dom · Chiuso",
      weekdays: "Lun–Sab 09:00—19:00 · Dom chiuso",
    },
    seo: {
      keywords: "barbiere REPLACE_CITTA, REPLACE_NOME_SALONE",
      description:
        "REPLACE_NOME_SALONE — barberia a REPLACE_CITTA. Prenota online.",
    },
  },
  copy: {
    documentTitle: "REPLACE_NOME_SALONE | REPLACE_TAGLINE",
    heroSentence: "REPLACE_HERO_FRASE",
    heroLead: "REPLACE_HERO_LEAD — città, tono, promessa.",
    heroCta: "Prenota il tuo appuntamento",
    heroSlotCta: "Prenota il tuo posto",
    heroMenuCta: "Vedi il menu",
    heroPreOpeningEyebrow: "Prenotazioni online già aperte",
    heroBeforeOpening: "Prenota il tuo appuntamento per l'apertura",
    salonContactMessage:
      "Ciao, vorrei informazioni su orari, prezzi o servizi.",
    notifyWhatsAppMessage:
      "Ciao, vorrei essere avvisato all'apertura di REPLACE_NOME_SALONE.",
    salonContactBody:
      "Info, orari, prezzi o un consiglio — rispondiamo dal salone su WhatsApp o email.",
    mapsDestination: "REPLACE_VIA_NUMERO, REPLACE_CAP REPLACE_CITTA",
    publicContactWhatsApp: "+39REPLACE_TELEFONO_SOLO_CIFRE",
    salonNotifyWhatsAppFallback: "+39REPLACE_TELEFONO_SOLO_CIFRE",
    adminEmailFallback: "replace@email.it",
  },
  theme: {
    ink: "#000000",
    muted: "#1A1A1A",
    surface: "#F9F9F9",
    white: "#FFFFFF",
    gold: "#C9A962",
    marble: "#F7F5F2",
    themeColor: "#FFFFFF",
  },
  mediaSlots: [
    { path: "/assets/images/logo.png", purpose: "Logo principale", required: true },
    { path: "/assets/images/logo-512.png", purpose: "Icona PWA / favicon 512", required: true },
    { path: "/assets/images/og-cover.png", purpose: "Open Graph social share", required: true },
    { path: "/assets/images/marble.png", purpose: "Texture sfondo (opzionale)", required: false },
    { path: "/assets/images/salone/", purpose: "Foto locale / utensili / branding", required: false },
    { path: "/assets/images/services/", purpose: "Foto servizi", required: false },
    { path: "/assets/images/products/", purpose: "Foto prodotti", required: false },
    { path: "/assets/images/qr/", purpose: "QR canali", required: false },
    { path: "/assets/video/", purpose: "Reel taglio / colore / bio / tour", required: false },
  ],
};
