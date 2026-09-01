export type SiteVideo = {
  id: string;
  src: string;
  alt: string;
  label?: string;
};

/** Canonical public path — never change without updating committed files in public/assets/video/. */
export const VIDEO_BASE = "/assets/video";

/** Felice bio / hero clip — public/assets/videos/ (separate from reel folder). */
export const VIDEO_HERO_BASE = "/assets/videos";

/** Real salon footage — user-provided mp4 in public/assets/video/. */
export const TAGLIO_VIDEOS: SiteVideo[] = [
  {
    id: "taglio-01",
    src: `${VIDEO_BASE}/taglio-01.mp4`,
    alt: "Taglio capelli in salone — Felice Polese Barbershop",
    label: "Taglio",
  },
  {
    id: "taglio-02",
    src: `${VIDEO_BASE}/taglio-02.mp4`,
    alt: "Tecnica di taglio — Polese Barbershop Benevento",
    label: "Taglio",
  },
  {
    id: "taglio-03",
    src: `${VIDEO_BASE}/taglio-03.mp4`,
    alt: "Dettaglio taglio e finitura — Felice Polese",
    label: "Taglio",
  },
];

export const COLORAZIONE_VIDEOS: SiteVideo[] = [
  {
    id: "colorazione-01",
    src: `${VIDEO_BASE}/colorazione-01.mp4`,
    alt: "Colorazione capelli in salone — Polese Barbershop",
    label: "Colorazione",
  },
  {
    id: "colorazione-02",
    src: `${VIDEO_BASE}/colorazione-02.mp4`,
    alt: "Applicazione colore — Felice Polese Barbershop",
    label: "Colorazione",
  },
  {
    id: "colorazione-03",
    src: `${VIDEO_BASE}/colorazione-03.mp4`,
    alt: "Risultato colorazione — Polese Barbershop",
    label: "Colorazione",
  },
];

/** General salon walkthrough — legacy path under /assets/video/. */
export const SALONE_GENERALE_VIDEO: SiteVideo = {
  id: "salone-generale",
  src: `${VIDEO_BASE}/salone-generale.mp4`,
  alt: "Tour del salone Polese Barbershop — Corso Dante Alighieri, Benevento",
};

/** Felice at work — native HTML5 beside bio (public/assets/videos/felice-working.mp4). */
export const FELICE_WORKING_VIDEO: SiteVideo = {
  id: "felice-working",
  src: `${VIDEO_HERO_BASE}/felice-working.mp4`,
  alt: "Felice Polese al lavoro — Polese Barbershop Benevento",
};

/** All six service reels for the homepage video grid. */
export const VIDEO_REELS: SiteVideo[] = [...TAGLIO_VIDEOS, ...COLORAZIONE_VIDEOS];

/** Hero asymmetric grid — taglio + colorazione. */
export const HERO_VIDEOS: SiteVideo[] = [
  TAGLIO_VIDEOS[0]!,
  TAGLIO_VIDEOS[1]!,
  COLORAZIONE_VIDEOS[0]!,
];

/** Remaining salon footage in galleria. */
export const GALLERY_VIDEOS: SiteVideo[] = [
  TAGLIO_VIDEOS[2]!,
  COLORAZIONE_VIDEOS[1]!,
  COLORAZIONE_VIDEOS[2]!,
];

export const ALL_SITE_VIDEOS: SiteVideo[] = [
  FELICE_WORKING_VIDEO,
  SALONE_GENERALE_VIDEO,
  ...VIDEO_REELS,
];

/** Filenames that must exist under public/assets/video/ (committed to git). */
export const REQUIRED_VIDEO_FILES = [
  "salone-generale.mp4",
  "taglio-01.mp4",
  "taglio-02.mp4",
  "taglio-03.mp4",
  "colorazione-01.mp4",
  "colorazione-02.mp4",
  "colorazione-03.mp4",
] as const;

/** Felice bio clip — public/assets/videos/felice-working.mp4 */
export const FELICE_WORKING_FILENAME = "felice-working.mp4" as const;
