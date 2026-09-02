export type SiteVideo = {
  id: string;
  src: string;
  alt: string;
  label?: string;
};

/** Public video URL — files live in public/assets/video/, rewritten from /video/. */
export const VIDEO_BASE = "/video";

/** Felice bio / hero clip — public/assets/videos/ (separate from reel folder). */
export const VIDEO_HERO_BASE = "/assets/videos";

/** Real salon footage — user-provided mp4 in public/assets/video/. */
export const TAGLIO_VIDEOS: SiteVideo[] = [
  {
    id: "taglio-01",
    src: `${VIDEO_BASE}/taglio-01.mp4`,
    alt: "Taglio capelli in salone — Felice Polese Barber Shop",
    label: "Taglio",
  },
  {
    id: "taglio-02",
    src: `${VIDEO_BASE}/taglio-02.mp4`,
    alt: "Tecnica di taglio — Felice Polese Barber Shop Benevento",
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
    alt: "Colorazione capelli in salone — Felice Polese Barber Shop",
    label: "Colorazione",
  },
  {
    id: "colorazione-02",
    src: `${VIDEO_BASE}/colorazione-02.mp4`,
    alt: "Applicazione colore — Felice Polese Barber Shop",
    label: "Colorazione",
  },
  {
    id: "colorazione-03",
    src: `${VIDEO_BASE}/colorazione-03.mp4`,
    alt: "Risultato colorazione — Felice Polese Barber Shop",
    label: "Colorazione",
  },
];

/** General salon walkthrough — legacy path under /assets/video/. */
export const SALONE_GENERALE_VIDEO: SiteVideo = {
  id: "salone-generale",
  src: `${VIDEO_BASE}/salone-generale.mp4`,
  alt: "Tour del salone Felice Polese Barber Shop — Corso Dante, Benevento",
};

/**
 * Felice beside bio — only rendered when this file exists.
 * Drop the chosen clip here as public/assets/videos/felice-working.mp4
 */
export const FELICE_WORKING_VIDEO: SiteVideo = {
  id: "felice-working",
  src: `${VIDEO_HERO_BASE}/felice-working.mp4`,
  alt: "Felice Polese al lavoro — Felice Polese Barber Shop Benevento",
};

/**
 * Cutting techniques — dedicated clips synced from public/video/ via scripts/sync-videos.ps1.
 * Not listino, not bookable.
 */
export const CUTTING_TECHNIQUE_VIDEOS: SiteVideo[] = [
  {
    id: "razor-fade-technique",
    src: `${VIDEO_BASE}/razor-fade.mp4`,
    alt: "Razor fade — tecnica di sfumatura in salone",
    label: "Razor Fade — Tecnica di sfumatura",
  },
  {
    id: "taper-fade-technique",
    src: `${VIDEO_BASE}/taper-fade.mp4`,
    alt: "Taper fade — tecnica di sfumatura in salone",
    label: "Taper Fade — Tecnica di sfumatura",
  },
  {
    id: "burst-fade-technique",
    src: `${VIDEO_BASE}/burst-fade.mp4`,
    alt: "Burst fade — tecnica di sfumatura in salone",
    label: "Burst Fade — Tecnica di sfumatura",
  },
];

/** Remaining salon footage (informational, no prices, no Prenota). */
export const SALON_WORK_VIDEOS: SiteVideo[] = [
  TAGLIO_VIDEOS[2]!,
  ...COLORAZIONE_VIDEOS,
];

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

/** Drop-in filename for the bio clip: public/assets/videos/felice-working.mp4 */
export const FELICE_WORKING_FILENAME = "felice-working.mp4" as const;

/** Technique reels — sync from public/video/ with scripts/sync-videos.ps1 */
export const TECHNIQUE_VIDEO_FILES = [
  "razor-fade.mp4",
  "taper-fade.mp4",
  "burst-fade.mp4",
] as const;
