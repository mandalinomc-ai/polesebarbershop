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

export type ServiceCategory = "taglio" | "barba" | "combo" | "tecnici" | "consulenza";

export const SERVICE_CATEGORY_LABEL: Record<ServiceCategory, string> = {
  taglio: "Taglio Normale / Sartoriale",
  barba: "Barba",
  combo: "Combo",
  tecnici: "Trattamenti Tecnici",
  consulenza: "Consulenza Tricologica",
};

export type Service = {
  id: string;
  name: string;
  category: ServiceCategory;
  priceEuro: number;
  priceMaxEuro: number | null;
  isVariablePrice: boolean;
  durationMin: number;
  description: string;
};

export const SERVICES: Service[] = [
  {
    id: "taglio-standard",
    name: "Taglio Normale",
    category: "taglio",
    priceEuro: 15,
    priceMaxEuro: null,
    isVariablePrice: false,
    durationMin: 30,
    description: "Taglio capelli classico",
  },
  {
    id: "taglio-pro",
    name: "Taglio Sartoriale",
    category: "taglio",
    priceEuro: 50,
    priceMaxEuro: null,
    isVariablePrice: false,
    durationMin: 25,
    description: "Taglio con shampoo e maschera",
  },
  {
    id: "barba-pro",
    name: "Barba",
    category: "barba",
    priceEuro: 15,
    priceMaxEuro: null,
    isVariablePrice: false,
    durationMin: 20,
    description: "Barba con panno caldo",
  },
  {
    id: "barba-standard",
    name: "Rifinitura barba",
    category: "barba",
    priceEuro: 5,
    priceMaxEuro: null,
    isVariablePrice: false,
    durationMin: 15,
    description: "Rifinitura e modellatura",
  },
  {
    id: "combo-classico",
    name: "Combo Taglio + Barba",
    category: "combo",
    priceEuro: 30,
    priceMaxEuro: null,
    isVariablePrice: false,
    durationMin: 45,
    description: "Taglio normale e barba completa",
  },
  {
    id: "combo-sartoriale",
    name: "Combo Sartoriale + Barba",
    category: "combo",
    priceEuro: 60,
    priceMaxEuro: null,
    isVariablePrice: false,
    durationMin: 40,
    description: "Taglio sartoriale e barba completa",
  },
  {
    id: "decolorazione-meches",
    name: "Meches",
    category: "tecnici",
    priceEuro: 40,
    priceMaxEuro: 100,
    isVariablePrice: true,
    durationMin: 45,
    description: "Colpi di sole e schiariture. Prezzo in salone.",
  },
  {
    id: "decolorazione-cutanea",
    name: "Decolorazione",
    category: "tecnici",
    priceEuro: 50,
    priceMaxEuro: 120,
    isVariablePrice: true,
    durationMin: 45,
    description: "Decolorazione completa. Prezzo in salone.",
  },
  {
    id: "tintura-capelli",
    name: "Tintura capelli",
    category: "tecnici",
    priceEuro: 10,
    priceMaxEuro: 30,
    isVariablePrice: true,
    durationMin: 30,
    description: "Colore capelli. Prezzo in salone.",
  },
  {
    id: "tintura-barba",
    name: "Tintura barba",
    category: "tecnici",
    priceEuro: 5,
    priceMaxEuro: 15,
    isVariablePrice: true,
    durationMin: 20,
    description: "Colore barba. Prezzo in salone.",
  },
  {
    id: "consulenza-sede",
    name: "Consulenza Tricologica",
    category: "consulenza",
    priceEuro: 0,
    priceMaxEuro: null,
    isVariablePrice: false,
    durationMin: 30,
    description: "Valutazione capelli e cuoio capelluto in salone.",
  },
];

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  "taglio",
  "barba",
  "combo",
  "tecnici",
  "consulenza",
];

export type Barber = {
  id: string;
  name: string;
  title: string;
  virtual: boolean;
  hours: Record<number, DayHours>;
};

export const ANYONE_BARBER_ID = "anyone";

export const BARBERS: Barber[] = [
  { id: ANYONE_BARBER_ID, name: "Chiunque sia disponibile", title: "Assegniamo la poltrona libera tra Felice e Davide", virtual: true, hours: SHOP_HOURS },
  { id: "felice", name: "Felice", title: "Master barber · " + SITE.name, virtual: false, hours: SHOP_HOURS },
  { id: "davide", name: "Davide", title: "Barber · poltrona indipendente", virtual: false, hours: SHOP_HOURS },
];

export function getService(id: string) { return SERVICES.find((s) => s.id === id); }
export function getBarber(id: string) { return BARBERS.find((b) => b.id === id); }
export function getRealBarbers(barbers: Barber[] = BARBERS) { return barbers.filter((b) => !b.virtual); }

export function resolveServices(ids: string[]): Service[] | null {
  const unique = [...new Set(ids)];
  if (!unique.length) return null;
  const found = unique.map((id) => getService(id));
  if (found.some((s) => !s)) return null;
  return found as Service[];
}

export function formatPrice(service: Service): string {
  if (service.isVariablePrice) return `da ${service.priceEuro} €`;
  if (service.priceEuro === 0) return "Gratuita";
  return `${service.priceEuro} €`;
}

export function formatPriceRange(service: Service): string {
  if (service.isVariablePrice && service.priceMaxEuro != null) {
    return `da ${service.priceEuro} € a ${service.priceMaxEuro} €`;
  }
  return formatPrice(service);
}

export function totalsForServices(services: Service[]) {
  const durationMin = services.reduce((sum, s) => sum + s.durationMin, 0);
  const priceEuro = services.reduce((sum, s) => sum + s.priceEuro, 0);
  const priceMaxEuro = services.reduce((sum, s) => sum + (s.priceMaxEuro ?? s.priceEuro), 0);
  const isVariable = services.some((s) => s.isVariablePrice);
  const names = services.map((s) => s.name).join(" + ");
  const priceLabel = isVariable
    ? priceMaxEuro > priceEuro
      ? `da ${priceEuro} € a ${priceMaxEuro} €`
      : `da ${priceEuro} €`
    : priceEuro === 0
      ? "Gratuita"
      : `${priceEuro} €`;
  return { durationMin, priceEuro, priceMaxEuro, isVariable, names, priceLabel };
}
