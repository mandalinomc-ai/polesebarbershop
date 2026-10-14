/** Real photos of the new Felice Polese salon (web-optimized). */
export type SalonPhoto = {
  id: string;
  src: string;
  alt: string;
  /** Short label under the photo (kept brief). */
  caption: string;
  /** Wider tile in the salone strip (logo / landscape). */
  wide?: boolean;
  width: number;
  height: number;
};

/** Compact strip under About — logo, opening plaque, equipment. */
export const SALON_LOCALE_PHOTOS: SalonPhoto[] = [
  {
    id: "logo-muro",
    src: "/assets/images/salone/logo-muro.jpg",
    alt: "Logo Felice Polese sul muro del nuovo salone",
    caption: "Logo in salone",
    wide: true,
    width: 1600,
    height: 1067,
  },
  {
    id: "targhetta",
    src: "/assets/images/salone/targhetta-apertura.jpg",
    alt: "Targhetta in onore dell'apertura — 7 settembre 2026",
    caption: "Apertura 7 settembre 2026",
    width: 800,
    height: 1200,
  },
  {
    id: "attrezzatura-igiene",
    src: "/assets/images/salone/attrezzatura-igiene.jpg",
    alt: "Attrezzatura professionale e igiene in postazione",
    caption: "Attrezzatura",
    width: 800,
    height: 1200,
  },
  {
    id: "attrezzatura-postazione",
    src: "/assets/images/salone/attrezzatura-postazione.jpg",
    alt: "Dettaglio attrezzatura da barbiere in salone",
    caption: "Postazione",
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
