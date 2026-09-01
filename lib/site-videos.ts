export type VideoReel = {
  id: string;
  src: string;
  poster: string;
  alt: string;
  label: string;
};

/** Vertical salon reels — autoplay muted loops in homepage grid boxes. */
export const VIDEO_REELS: VideoReel[] = [
  {
    id: "salone-interno",
    src: "/assets/videos/reel-01.mp4",
    poster: "/assets/images/gallery/fresha-01.jpg",
    alt: "Interno salone Polese Barbershop — marmo e postazioni",
    label: "Il salone",
  },
  {
    id: "postazione-barbiere",
    src: "/assets/videos/reel-02.mp4",
    poster: "/assets/images/gallery/fresha-02.jpg",
    alt: "Postazione barbiere Polese",
    label: "Taglio",
  },
  {
    id: "dettaglio-ambiente",
    src: "/assets/videos/reel-03.mp4",
    poster: "/assets/images/gallery/fresha-03.jpg",
    alt: "Dettaglio ambiente e finiture del salone",
    label: "Atmosfera",
  },
  {
    id: "prodotti",
    src: "/assets/videos/reel-04.mp4",
    poster: "/assets/images/brand-products.jpg",
    alt: "Linea prodotti Felice Polese",
    label: "Prodotti",
  },
];
