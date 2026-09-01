/** Canonical paths and intrinsic dimensions for static assets in /public. */
export const MARBLE_TEXTURE = {
  src: "/assets/images/marble.png",
  fallbackJpg: "/assets/images/marble-texture.jpg",
  fallbackWebp: "/assets/images/marble-texture.webp",
  width: 588,
  height: 588,
} as const;

export const SITE_LOGO = {
  src: "/assets/images/logo.png",
  width: 1209,
  height: 823,
} as const;

export type GalleryImage = {
  src: string;
  alt: string;
  tall: boolean;
  width: number;
  height: number;
};

/** Four distinct salon shots — no hero-bg repeat, no duplicate product shots. */
export const GALLERY_IMAGES: GalleryImage[] = [
  {
    src: "/assets/images/gallery/fresha-01.jpg",
    alt: "Interno salone Polese Barbershop — marmo e postazioni",
    tall: true,
    width: 1280,
    height: 720,
  },
  {
    src: "/assets/images/gallery/fresha-02.jpg",
    alt: "Postazione barbiere Polese",
    tall: false,
    width: 1280,
    height: 720,
  },
  {
    src: "/assets/images/gallery/fresha-03.jpg",
    alt: "Dettaglio ambiente e finiture del salone",
    tall: false,
    width: 916,
    height: 515,
  },
  {
    src: "/assets/images/brand-products.jpg",
    alt: "Linea prodotti Felice Polese",
    tall: false,
    width: 1280,
    height: 720,
  },
];
