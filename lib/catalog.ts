import { SITE } from "./site-config";

export type DayHours = { open: string; close: string } | null;

/** JS weekday: 0 Sunday … 6 Saturday. Sunday closed (hours not provided). */
export const SHOP_HOURS: Record<number, DayHours> = {
  0: null,
  1: { open: "15:00", close: "19:00" },
  2: { open: "08:30", close: "19:00" },
  3: { open: "08:30", close: "19:00" },
  4: { open: "08:30", close: "20:00" },
  5: { open: "08:00", close: "21:00" },
  6: { open: "08:00", close: "21:00" },
};

export type ServiceCategory = "capelli" | "barba" | "colore";

export const SERVICE_CATEGORY_LABEL: Record<ServiceCategory, string> = {
  capelli: "Capelli",
  barba: "Barba",
  colore: "Colore & trattamenti",
};

/**
 * Optional servicing → processing → servicing.
 * Only set when real minutes exist — never invent tinture defaults.
 */
export type ServiceProcessing = {
  servicingBeforeMin: number;
  processingMin: number;
  servicingAfterMin: number;
  /** When true, barber is free during processingMin (another cut can fit). */
  barberFreeDuringProcessing?: boolean;
};

export type Service = {
  id: string;
  name: string;
  category: ServiceCategory;
  priceEuro: number;
  priceMaxEuro: number | null;
  isVariablePrice: boolean;
  /**
   * Catalog duration when durationKnown.
   * Booking occupancy uses this (or DB override / gestionale override).
   */
  durationMin: number;
  /** False = listino/booking must not invent a duration. All 10 official services are known. */
  durationKnown: boolean;
  /** When false, service is hidden from public booking (admin can deactivate). */
  active: boolean;
  description: string;
  /**
   * Optional servicing→processing→servicing. Only set when real minutes exist.
   */
  processing?: ServiceProcessing | null;
};

/**
 * Official listino — exactly these 10 bookable services.
 * Razor Taper / Skin Fade / other rasature are techniques, not services.
 * Durations are operational booking times (Durata prevista).
 */
export const SERVICES: Service[] = [
  {
    id: "taglio-pro",
    name: "Taglio Pro",
    category: "capelli",
    priceEuro: 25,
    priceMaxEuro: null,
    isVariablePrice: false,
    durationMin: 50,
    durationKnown: true,
    active: true,
    description: "Shampoo specifico per tipo di capello + Black Mask",
  },
  {
    id: "taglio-standard",
    name: "Taglio Standard",
    category: "capelli",
    priceEuro: 15,
    priceMaxEuro: null,
    isVariablePrice: false,
    durationMin: 30,
    durationKnown: true,
    active: true,
    description: "Taglio classico",
  },
  {
    id: "acconciatura",
    name: "Acconciatura",
    category: "capelli",
    priceEuro: 5,
    priceMaxEuro: null,
    isVariablePrice: false,
    durationMin: 10,
    durationKnown: true,
    active: true,
    description: "Solo styling",
  },
  {
    id: "taglio-bambino",
    name: "Taglio Bambino",
    category: "capelli",
    priceEuro: 10,
    priceMaxEuro: null,
    isVariablePrice: false,
    durationMin: 20,
    durationKnown: true,
    active: true,
    description: "Taglio per bambini",
  },
  {
    id: "barba-pro",
    name: "Barba Pro",
    category: "barba",
    priceEuro: 15,
    priceMaxEuro: null,
    isVariablePrice: false,
    durationMin: 20,
    durationKnown: true,
    active: true,
    description: "Panno caldo con vaporizzatore + Oli con fragranze",
  },
  {
    id: "barba-standard",
    name: "Barba Standard",
    category: "barba",
    priceEuro: 5,
    priceMaxEuro: null,
    isVariablePrice: false,
    durationMin: 15,
    durationKnown: true,
    active: true,
    description: "Rifinitura / Modellatura classica",
  },
  {
    id: "decolorazione-meches",
    name: "Decolorazione Meches",
    category: "colore",
    priceEuro: 40,
    priceMaxEuro: 100,
    isVariablePrice: true,
    durationMin: 150,
    durationKnown: true,
    active: true,
    description: "In base a lunghezza, tipo di capello e tempo",
  },
  {
    id: "decolorazione-cutanea",
    name: "Decolorazione Cutanea",
    category: "colore",
    priceEuro: 50,
    priceMaxEuro: 120,
    isVariablePrice: true,
    durationMin: 180,
    durationKnown: true,
    active: true,
    description: "In base a lunghezza e tipo di capello",
  },
  {
    id: "tintura-capelli",
    name: "Tintura Capelli",
    category: "colore",
    priceEuro: 10,
    priceMaxEuro: 30,
    isVariablePrice: true,
    durationMin: 30,
    durationKnown: true,
    active: true,
    description: "Colore capelli",
  },
  {
    id: "tintura-barba",
    name: "Tintura Barba",
    category: "colore",
    priceEuro: 5,
    priceMaxEuro: 15,
    isVariablePrice: true,
    durationMin: 20,
    durationKnown: true,
    active: true,
    description: "Colore barba",
  },
];

export const SERVICE_CATEGORIES: ServiceCategory[] = ["capelli", "barba", "colore"];

/** IDs that must never be offered as bookable catalog rows. */
export const UNOFFICIAL_SERVICE_IDS = [
  "razor-taper",
  "skin-fade",
  "combo-classico",
  "combo-sartoriale",
  "consulenza-sede",
  "taglio-sartoriale",
] as const;

export const BOOKABLE_SERVICE_IDS = SERVICES.map((s) => s.id);

/** Expected booking durations for the 10 official services (source of truth seed). */
export const OFFICIAL_DURATION_MIN: Record<string, number> = Object.fromEntries(
  SERVICES.map((s) => [s.id, s.durationMin]),
);

export type Barber = {
  id: string;
  name: string;
  title: string;
  virtual: boolean;
  hours: Record<number, DayHours>;
};

export const ANYONE_BARBER_ID = "anyone";

export const BARBERS: Barber[] = [
  {
    id: ANYONE_BARBER_ID,
    name: "Qualsiasi disponibilità",
    title: "Assegniamo la poltrona libera tra Felice e Davide",
    virtual: true,
    hours: SHOP_HOURS,
  },
  { id: "felice", name: "Felice", title: "Master barber · " + SITE.name, virtual: false, hours: SHOP_HOURS },
  { id: "davide", name: "Davide", title: "Barber · poltrona indipendente", virtual: false, hours: SHOP_HOURS },
];

export function getService(id: string) {
  return SERVICES.find((s) => s.id === id);
}
export function getBarber(id: string) {
  return BARBERS.find((b) => b.id === id);
}
export function getRealBarbers(barbers: Barber[] = BARBERS) {
  return barbers.filter((b) => !b.virtual);
}

export function isBookableServiceId(id: string): boolean {
  const s = getService(id);
  return Boolean(s && s.active !== false);
}

export function resolveServices(ids: string[]): Service[] | null {
  const unique = [...new Set(ids)];
  if (!unique.length) return null;
  const found = unique.map((id) => getService(id));
  if (found.some((s) => !s || s.active === false)) return null;
  return found as Service[];
}

export function formatPrice(service: Service): string {
  if (service.isVariablePrice && service.priceMaxEuro != null) {
    return `${service.priceEuro}–${service.priceMaxEuro} €`;
  }
  if (service.priceEuro === 0) return "Gratuita";
  return `${service.priceEuro} €`;
}

export function formatPriceRange(service: Service): string {
  return formatPrice(service);
}

/** Public listino / booking label — expected duration, not a guarantee. */
export function formatDuration(service: Service): string {
  if (!service.durationKnown || !(service.durationMin > 0)) return "—";
  return `Durata prevista: ${service.durationMin} min`;
}

/** Short duration for compact UI (chips, summaries). */
export function formatDurationShort(service: Service): string {
  if (!service.durationKnown || !(service.durationMin > 0)) return "—";
  return `${service.durationMin} min`;
}

export function totalsForServices(services: Service[]) {
  const durationMin = services.reduce((sum, s) => sum + s.durationMin, 0);
  const priceEuro = services.reduce((sum, s) => sum + s.priceEuro, 0);
  const priceMaxEuro = services.reduce((sum, s) => sum + (s.priceMaxEuro ?? s.priceEuro), 0);
  const isVariable = services.some((s) => s.isVariablePrice);
  const names = services.map((s) => s.name).join(" + ");
  const durationKnown = services.every((s) => s.durationKnown);
  const durationLabel = durationKnown
    ? `Durata prevista: ${durationMin} min`
    : "—";
  const priceLabel = isVariable
    ? priceMaxEuro > priceEuro
      ? `${priceEuro}–${priceMaxEuro} €`
      : `${priceEuro} €`
    : priceEuro === 0
      ? "Gratuita"
      : `${priceEuro} €`;
  return { durationMin, priceEuro, priceMaxEuro, isVariable, names, priceLabel, durationLabel, durationKnown };
}

/** Online booking requires every selected service to have a known catalog duration. */
export function servicesAreOnlineBookable(services: Service[]): boolean {
  return services.length > 0 && services.every((s) => s.durationKnown && s.active !== false);
}

/**
 * Block reason for online booking when a selection cannot proceed.
 * Empty selection → null (UI stays silent; Continua stays disabled).
 * Never uses engine jargon (n/d, inventata, durationUnknown).
 */
export function onlineBookingBlockReason(services: Service[]): string | null {
  if (!services.length) return null;
  const inactive = services.filter((s) => s.active === false);
  if (inactive.length) {
    return `Servizio non disponibile: ${inactive.map((s) => s.name).join(", ")}.`;
  }
  const unknown = services.filter((s) => !s.durationKnown);
  if (!unknown.length) return null;
  // Official catalog always has known durations — edge case only (stale overlay).
  return "Uno o più servizi non sono prenotabili online. Scegline altri o chiama il salone.";
}
