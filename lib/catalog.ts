import { SITE } from "./site-config";

export type DayHours = { open: string; close: string } | null;

export const SHOP_HOURS: Record<number, DayHours> = {
  0: null, 1: null,
  2: { open: "09:30", close: "20:00" },
  3: { open: "09:30", close: "20:00" },
  4: { open: "09:30", close: "20:00" },
  5: { open: "09:30", close: "20:00" },
  6: { open: "09:30", close: "20:00" },
};

export type ServiceCategory = "capelli" | "barba" | "colore";

export const SERVICE_CATEGORY_LABEL: Record<ServiceCategory, string> = {
  capelli: "Capelli",
  barba: "Barba",
  colore: "Colore & trattamenti",
};

export type Service = {
  id: string;
  name: string;
  category: ServiceCategory;
  priceEuro: number;
  priceMaxEuro: number | null;
  isVariablePrice: boolean;
  /** Reserved chair time for the calendar. Always > 0 so overlap math works. */
  durationMin: number;
  /** False = official listino shows "durata n/d"; durationMin is only a booking buffer. */
  durationKnown: boolean;
  description: string;
};

/**
 * Official listino — exactly these 9 bookable services.
 * Razor Taper / Skin Fade / other rasature are techniques, not services.
 */
export const SERVICES: Service[] = [
  {
    id: "taglio-pro",
    name: "Taglio Pro",
    category: "capelli",
    priceEuro: 50,
    priceMaxEuro: null,
    isVariablePrice: false,
    durationMin: 25,
    durationKnown: true,
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
    description: "Taglio classico",
  },
  {
    id: "acconciatura",
    name: "Acconciatura",
    category: "capelli",
    priceEuro: 5,
    priceMaxEuro: null,
    isVariablePrice: false,
    durationMin: 15,
    durationKnown: false,
    description: "Solo styling / piega",
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
    durationKnown: false,
    description: "Rifinitura / Modellatura classica",
  },
  {
    id: "decolorazione-meches",
    name: "Decolorazione Meches",
    category: "colore",
    priceEuro: 40,
    priceMaxEuro: 100,
    isVariablePrice: true,
    durationMin: 45,
    durationKnown: false,
    description: "In base a lunghezza, tipo di capello e tempo",
  },
  {
    id: "decolorazione-cutanea",
    name: "Decolorazione Cutanea",
    category: "colore",
    priceEuro: 50,
    priceMaxEuro: 120,
    isVariablePrice: true,
    durationMin: 45,
    durationKnown: false,
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
    durationKnown: false,
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
    durationKnown: false,
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

export function getService(id: string) { return SERVICES.find((s) => s.id === id); }
export function getBarber(id: string) { return BARBERS.find((b) => b.id === id); }
export function getRealBarbers(barbers: Barber[] = BARBERS) { return barbers.filter((b) => !b.virtual); }

export function isBookableServiceId(id: string): boolean {
  return SERVICES.some((s) => s.id === id);
}

export function resolveServices(ids: string[]): Service[] | null {
  const unique = [...new Set(ids)];
  if (!unique.length) return null;
  const found = unique.map((id) => getService(id));
  if (found.some((s) => !s)) return null;
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

export function formatDuration(service: Service): string {
  return service.durationKnown ? `${service.durationMin} min` : "durata n/d";
}

export function totalsForServices(services: Service[]) {
  const durationMin = services.reduce((sum, s) => sum + s.durationMin, 0);
  const priceEuro = services.reduce((sum, s) => sum + s.priceEuro, 0);
  const priceMaxEuro = services.reduce((sum, s) => sum + (s.priceMaxEuro ?? s.priceEuro), 0);
  const isVariable = services.some((s) => s.isVariablePrice);
  const names = services.map((s) => s.name).join(" + ");
  const durationKnown = services.every((s) => s.durationKnown);
  const durationLabel = durationKnown ? `${durationMin} min` : "durata n/d";
  const priceLabel = isVariable
    ? priceMaxEuro > priceEuro
      ? `${priceEuro}–${priceMaxEuro} €`
      : `${priceEuro} €`
    : priceEuro === 0
      ? "Gratuita"
      : `${priceEuro} €`;
  return { durationMin, priceEuro, priceMaxEuro, isVariable, names, priceLabel, durationLabel };
}
