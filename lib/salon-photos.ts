/** Real photos of the new Felice Polese salon (web-optimized). */
export type SalonPhoto = {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
};

/** All utensil / station shots — shown in the locale carousel. */
export const SALON_UTENSILI_PHOTOS: SalonPhoto[] = [
  {
    id: "utensili-01",
    src: "/assets/images/salone/utensili-01.jpg",
    alt: "Attrezzatura professionale in postazione",
    width: 934,
    height: 1400,
  },
  {
    id: "utensili-02",
    src: "/assets/images/salone/utensili-02.jpg",
    alt: "Forbici e igiene in salone",
    width: 934,
    height: 1400,
  },
  {
    id: "utensili-03",
    src: "/assets/images/salone/utensili-03.jpg",
    alt: "Clipper e utensili da barbiere",
    width: 1600,
    height: 1067,
  },
  {
    id: "utensili-04",
    src: "/assets/images/salone/utensili-04.jpg",
    alt: "Postazione con forbici e spray",
    width: 1600,
    height: 1067,
  },
  {
    id: "utensili-05",
    src: "/assets/images/salone/utensili-05.jpg",
    alt: "Dettaglio utensili e phon",
    width: 1600,
    height: 1067,
  },
  {
    id: "utensili-06",
    src: "/assets/images/salone/utensili-06.jpg",
    alt: "Lavaggio e postazione del nuovo locale",
    width: 1600,
    height: 1067,
  },
  {
    id: "utensili-07",
    src: "/assets/images/salone/utensili-07.jpg",
    alt: "Dettaglio igiene e forbici",
    width: 934,
    height: 1400,
  },
];

/** Logo on the wall + opening plaque — shown together under the carousel. */
export const SALON_BRAND_PHOTOS: SalonPhoto[] = [
  {
    id: "logo-muro",
    src: "/assets/images/salone/logo-muro.jpg",
    alt: "Logo Felice Polese sul muro del nuovo salone",
    width: 1600,
    height: 1067,
  },
  {
    id: "targhetta",
    src: "/assets/images/salone/targhetta-apertura.jpg",
    alt: "Targhetta in onore dell'apertura — 7 settembre 2026",
    width: 800,
    height: 1200,
  },
];

/** Shelf shot for the prodotti section (visual only, not a product SKU). */
export const SALON_PRODUCTS_SHELF = {
  src: "/assets/images/salone/prodotti-scaffale.jpg",
  alt: "Linea prodotti Felice Polese in vetrina al salone",
  width: 1600,
  height: 1067,
} as const;
