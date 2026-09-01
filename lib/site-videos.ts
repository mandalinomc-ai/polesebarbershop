export type SiteVideo = {
  id: string;
  src: string;
  poster: string;
  alt: string;
};

const VIDEO_BASE = "/assets/video";

/** Real salon footage — user-provided mp4 in public/assets/video/. */
export const TAGLIO_VIDEOS: SiteVideo[] = [
  {
    id: "taglio-01",
    src: `${VIDEO_BASE}/taglio-01.mp4`,
    poster: "/assets/images/gallery/fresha-02.jpg",
    alt: "Taglio capelli in salone — Felice Polese Barbershop",
  },
  {
    id: "taglio-02",
    src: `${VIDEO_BASE}/taglio-02.mp4`,
    poster: "/assets/images/gallery/fresha-01.jpg",
    alt: "Tecnica di taglio — Polese Barbershop Benevento",
  },
  {
    id: "taglio-03",
    src: `${VIDEO_BASE}/taglio-03.mp4`,
    poster: "/assets/images/gallery/fresha-03.jpg",
    alt: "Dettaglio taglio e finitura — Felice Polese",
  },
];

export const COLORAZIONE_VIDEOS: SiteVideo[] = [
  {
    id: "colorazione-01",
    src: `${VIDEO_BASE}/colorazione-01.mp4`,
    poster: "/assets/images/gallery/fresha-03.jpg",
    alt: "Colorazione capelli in salone — Polese Barbershop",
  },
  {
    id: "colorazione-02",
    src: `${VIDEO_BASE}/colorazione-02.mp4`,
    poster: "/assets/images/gallery/fresha-02.jpg",
    alt: "Applicazione colore — Felice Polese Barbershop",
  },
  {
    id: "colorazione-03",
    src: `${VIDEO_BASE}/colorazione-03.mp4`,
    poster: "/assets/images/gallery/fresha-01.jpg",
    alt: "Risultato colorazione — Polese Barbershop",
  },
];

/** Hero asymmetric grid — taglio + colorazione (no invented reel labels). */
export const HERO_VIDEOS: SiteVideo[] = [
  TAGLIO_VIDEOS[0]!,
  TAGLIO_VIDEOS[1]!,
  COLORAZIONE_VIDEOS[0]!,
];

/** Remaining salon footage in galleria — Marcel editorial grid, no text overlays. */
export const GALLERY_VIDEOS: SiteVideo[] = [
  TAGLIO_VIDEOS[2]!,
  COLORAZIONE_VIDEOS[1]!,
  COLORAZIONE_VIDEOS[2]!,
];

export const ALL_SITE_VIDEOS: SiteVideo[] = [...TAGLIO_VIDEOS, ...COLORAZIONE_VIDEOS];
