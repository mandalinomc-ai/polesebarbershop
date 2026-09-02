export type SiteVideo = {
  id: string;
  src: string;
  alt: string;
  label?: string;
};

/** Public video URL — files live in public/assets/video/, rewritten from /video/. */
export const VIDEO_BASE = "/video";

/** Legacy hero folder — bio clip now lives in public/assets/video/ with reels. */
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

/**
 * Felice beside bio — only rendered when the synced file exists.
 * Windows source: public/video/video felice polese bio.mp4
 * After sync: public/assets/video/video-felice-polese-bio.mp4
 */
export const FELICE_BIO_SOURCE_BASENAME = "video felice polese bio" as const;

export const FELICE_WORKING_VIDEO: SiteVideo = {
  id: "felice-bio",
  src: `${VIDEO_BASE}/video-felice-polese-bio.mp4`,
  alt: "Felice Polese al lavoro — Felice Polese Barber Shop Benevento",
};

/**
 * Cutting techniques — dedicated clips synced from public/video/ via scripts/sync-videos.ps1.
 * Not listino, not bookable. Order: Taper, Burst, Razor.
 */
export const CUTTING_TECHNIQUE_VIDEOS: SiteVideo[] = [
  {
    id: "taper-fade-technique",
    src: `${VIDEO_BASE}/taper-fade.mp4`,
    alt: "Taper fade — tecnica di sfumatura in salone",
    label: "Taper Fade",
  },
  {
    id: "burst-fade-technique",
    src: `${VIDEO_BASE}/burst-fade.mp4`,
    alt: "Burst fade — tecnica di sfumatura in salone",
    label: "Burst Fade",
  },
  {
    id: "razor-fade-technique",
    src: `${VIDEO_BASE}/razor-fade.mp4`,
    alt: "Razor fade — tecnica di sfumatura in salone",
    label: "Razor Fade",
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

export const ALL_SITE_VIDEOS: SiteVideo[] = [FELICE_WORKING_VIDEO, ...VIDEO_REELS];

/** Filenames that must exist under public/assets/video/ (committed to git). */
export const REQUIRED_VIDEO_FILES = [
  "taglio-01.mp4",
  "taglio-02.mp4",
  "taglio-03.mp4",
  "colorazione-01.mp4",
  "colorazione-02.mp4",
  "colorazione-03.mp4",
] as const;

/** Synced bio clip filename under public/assets/video/ */
export const FELICE_WORKING_FILENAME = "video-felice-polese-bio.mp4" as const;

/** Technique reels — sync from public/video/ with scripts/sync-videos.ps1 */
export const TECHNIQUE_VIDEO_FILES = [
  "taper-fade.mp4",
  "burst-fade.mp4",
  "razor-fade.mp4",
] as const;

/** Optional service clip — wire path even when missing from git. */
export const DECOLORAZIONE_CUTE_FILENAME = "decolorazione-cute.mp4" as const;
