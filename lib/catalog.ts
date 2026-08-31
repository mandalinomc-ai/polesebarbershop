import { SITE } from "./site-config";

export type DayHours = { open: string; close: string } | null;

export const SHOP_HOURS: Record<number, DayHours> = {
  0: null,
  1: null,
  2: { open: "09:30", close: "20:00" },
  3: { open: "09:30", close: "20:00" },
  4: { open: "09:30", close: "20:00" },
  5: { open: "09:30", close: "20:00" },
  6: { open: "09:30", close: "20:00" },
};

export type ServiceCategory = "Taglio" | "Barba" | "Trattamenti";

export const SERVICE_CATEGORY_LABEL: Record<ServiceCategory, string> = {
  Taglio: "Taglio",
  Barba: "Barba",
  Trattamenti: "Trattamenti",
};

export type Service = {
  id: string;
  name: string;
  category: ServiceCategory;
  price: number;
  priceEuro: number;
  priceMaxEuro: number | null;
  isVariablePrice: boolean;
  durationMin: number;
  description: string;
};

function svc(
  id: string,
  name: string,
  category: ServiceCategory,
  price: number,
  durationMin: number,
  description: string,
): Service {
  return {
    id,
    name,
    category,
    price,
    priceEuro: price,
    priceMaxEuro: null,
    isVariablePrice: false,
    durationMin,
    description,
  };
}

export const SERVICES: Service[] = [
  svc("taglio-sartoriale", "Taglio sartoriale", "Taglio", 25, 45, "Consulenza viso, taglio su misura e styling premium."),
  svc("barba-rasatura", "Barba & rasatura", "Barba", 18, 30, "Rasatura calda e rifinitura barba con trattamenti lenitivi."),
  svc("colorazione-barba", "Colorazione barba", "Barba", 15, 20, "Copertura naturale tono su tono."),
  svc("combo-premium", "Combo premium", "Trattamenti", 40, 75, "Taglio + barba + trattamento viso. L'esperienza completa."),
  svc("trattamento-viso", "Trattamento viso", "Trattamenti", 20, 30, "Pulizia, scrub e maschera rigenerante."),
];

export const SERVICE_CATEGORIES: ServiceCategory[] = ["Taglio", "Barba", "Trattamenti"];

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
    name: "Chiunque sia disponibile",
    title: "Assegniamo il barbiere con più disponibilità",
    virtual: true,
    hours: SHOP_HOURS,
  },
  {
    id: "felice",
    name: "Felice Polese",
    title: "Master barber · " + SITE.name,
    virtual: false,
    hours: SHOP_HOURS,
  },
];

export function getService(id: string): Service | undefined {
  return SERVICES.find((s) => s.id === id);
}

export function getBarber(id: string): Barber | undefined {
  return BARBERS.find((b) => b.id === id);
}

export function getRealBarbers(barbers: Barber[] = BARBERS): Barber[] {
  return barbers.filter((b) => !b.virtual);
}

export function resolveServices(ids: string[]): Service[] | null {
  const unique = [...new Set(ids)];
  if (!unique.length) return null;
  const found = unique.map((id) => getService(id));
  if (found.some((s) => !s)) return null;
  return found as Service[];
}

export function formatPrice(service: Service): string {
  return `€ ${service.price}`;
}

export function formatPriceRange(service: Service): string {
  return formatPrice(service);
}

export function totalsForServices(services: Service[]): {
  durationMin: number;
  price: number;
  priceEuro: number;
  priceMaxEuro: number;
  isVariable: boolean;
  names: string;
  priceLabel: string;
} {
  const durationMin = services.reduce((sum, s) => sum + s.durationMin, 0);
  const price = services.reduce((sum, s) => sum + s.price, 0);
  const names = services.map((s) => s.name).join(" + ");
  return {
    durationMin,
    price,
    priceEuro: price,
    priceMaxEuro: price,
    isVariable: false,
    names,
    priceLabel: `€ ${price}`,
  };
}

export function servicesByCategory(): Record<ServiceCategory, Service[]> {
  return {
    Taglio: SERVICES.filter((s) => s.category === "Taglio"),
    Barba: SERVICES.filter((s) => s.category === "Barba"),
    Trattamenti: SERVICES.filter((s) => s.category === "Trattamenti"),
  };
}
