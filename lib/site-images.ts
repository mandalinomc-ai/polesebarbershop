/** Canonical paths and intrinsic dimensions for static assets in /public. */
export const SITE_LOGO = {
  src: "/assets/images/logo.png",
  width: 1209,
  height: 823,
} as const;

export const HERO_BG = {
  src: "/assets/images/hero-bg.jpg",
  width: 1280,
  height: 720,
} as const;

export type GalleryImage = {
  src: string;
  alt: string;
  tall: boolean;
  width: number;
  height: number;
};

export const GALLERY_IMAGES: GalleryImage[] = [
  {
    src: "/assets/images/gallery/fresha-01.jpg",
    alt: "Interno salone Polese Barbershop — marmo e postazioni",
    tall: false,
    width: 1280,
    height: 720,
  },
  {
    src: HERO_BG.src,
    alt: "Salone Felice Polese Benevento",
    tall: true,
    width: HERO_BG.width,
    height: HERO_BG.height,
  },
  {
    src: "/assets/images/gallery/fresha-02.jpg",
    alt: "Postazione barbiere Polese",
    tall: false,
    width: 1280,
    height: 720,
  },
  {
    src: "/assets/images/brand-products.jpg",
    alt: "Linea prodotti Felice Polese",
    tall: false,
    width: 1280,
    height: 720,
  },
  {
    src: "/assets/images/gallery/fresha-00.jpg",
    alt: "Prodotti grooming Felice Polese",
    tall: false,
    width: 1280,
    height: 720,
  },
];
