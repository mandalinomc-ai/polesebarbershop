/**
 * White-label client pack — everything that changes between barbershops.
 * Runtime code reads the active pack via `clients/active.ts`.
 */

export type ClientHoursLabels = {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
  /** Single-line summary for footers / SEO. */
  weekdays: string;
};

export type ClientSiteIdentity = {
  brand: string;
  name: string;
  legalName: string;
  tagline: string;
  heroHeadline: string;
  siteUrl: string;
  address: string;
  addressFull: string;
  streetAddress: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  region: string;
  latitude: number;
  longitude: number;
  /** Civil opening date YYYY-MM-DD (Europe/Rome). */
  openingDate: string;
  phone: string;
  phoneDisplay: string;
  phoneTel: string;
  /** Digits only for wa.me (e.g. 39327…). */
  whatsapp: string;
  email: string;
  instagram: string;
  instagramHandle: string;
  fiscalCode: string;
  vatNumber: string;
  pricesIncludeVat: string;
  hours: ClientHoursLabels;
  seo: {
    keywords: string;
    description: string;
  };
};

export type ClientCopy = {
  documentTitle: string;
  heroSentence: string;
  heroLead: string;
  heroCta: string;
  heroSlotCta: string;
  heroMenuCta: string;
  heroPreOpeningEyebrow: string;
  heroBeforeOpening: string;
  salonContactMessage: string;
  notifyWhatsAppMessage: string;
  salonContactBody: string;
  mapsDestination: string;
  /** Public FAB WhatsApp (E.164 with +). */
  publicContactWhatsApp: string;
  /** Fallback salon notify WhatsApp (E.164 with +). */
  salonNotifyWhatsAppFallback: string;
  adminEmailFallback: string;
};

export type ClientTheme = {
  ink: string;
  muted: string;
  surface: string;
  white: string;
  gold: string;
  marble: string;
  themeColor: string;
};

export type ClientMediaSlot = {
  /** Path under /public (must start with /). */
  path: string;
  /** What the operator should upload. */
  purpose: string;
  required: boolean;
};

export type ClientProfile = {
  /** Folder slug under clients/ (lowercase-kebab). */
  slug: string;
  /** Human label for docs / Cursor. */
  label: string;
  site: ClientSiteIdentity;
  copy: ClientCopy;
  theme: ClientTheme;
  /**
   * Default barber display name for seed / solo operator.
   * Catalog still owns full BARBERS list + hours.
   */
  primaryBarberName: string;
  primaryBarberTitle: string;
  /** Product line name used in WhatsApp product messages. */
  productLineName: string;
  /** Expected media slots for onboarding (photos / video / logo). */
  mediaSlots: ClientMediaSlot[];
};
