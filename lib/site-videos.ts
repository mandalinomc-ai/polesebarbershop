export type SiteVideo = {
  id: string;
  src: string;
  alt: string;
  label?: string;
  posterSrc?: string;
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

export const MECHES_VIDEO: SiteVideo = {
  id: "meches",
  src: `${VIDEO_BASE}/meches.mp4`,
  alt: "Meches in salone — Felice Polese Barber Shop",
  label: "Meches",
};

export const DECOLORAZIONE_CUTANEA_VIDEO: SiteVideo = {
  id: "decolorazione-cutanea",
  src: `${VIDEO_BASE}/decolorazione-cutanea.mp4`,
  alt: "Decolorazione cutanea in salone — Felice Polese Barber Shop",
  label: "Decolorazione cutanea",
};

/** General salon walkthrough — legacy path under /assets/video/. */
export const SALONE_GENERALE_VIDEO: SiteVideo = {
  id: "salone-generale",
  src: `${VIDEO_BASE}/salone-generale.mp4`,
  alt: "Tour del salone Felice Polese Barber Shop — Corso Dante, Benevento",
};

/**
 * Felice beside bio — Drive clip at the midnight (43c7824) public URL.
 * Identical file also lives at public/assets/videos/felice-working.mp4.
 */
export const FELICE_BIO_SOURCE_BASENAME = "video felice polese bio" as const;

export const FELICE_WORKING_VIDEO: SiteVideo = {
  id: "felice-bio",
  src: `${VIDEO_BASE}/video-felice-polese-bio.mp4`,
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
  MECHES_VIDEO,
  DECOLORAZIONE_CUTANEA_VIDEO,
];

export type ServiceShowcaseVideo = Omit<SiteVideo, "src"> & {
  serviceId: string;
  sourceFile: string;
  /** Dedicated salon clip. Omitted when the treatment has no Drive video. */
  src?: string;
  /** Generated still used when there is no dedicated clip. */
  imageSrc?: string;
};

/**
 * Exact shared-treatment media when available, otherwise conservative reuse of
 * existing real salon footage from the same category. No stock assets.
 */
export const SERVICE_SHOWCASE_VIDEOS: ServiceShowcaseVideo[] = [
  {
    serviceId: "taglio-pro",
    id: "service-taglio-pro",
    src: `${VIDEO_BASE}/taglio-01.mp4`,
    alt: "Taglio Pro — clip reale dal salone Felice Polese",
    label: "Taglio Pro",
    sourceFile: "taglio-01.mp4",
  },
  {
    serviceId: "taglio-standard",
    id: "service-taglio-standard",
    src: `${VIDEO_BASE}/taglio-02.mp4`,
    alt: "Taglio Standard — clip reale dal salone Felice Polese",
    label: "Taglio Standard",
    sourceFile: "taglio-02.mp4",
  },
  {
    serviceId: "acconciatura",
    id: "service-acconciatura",
    src: `${VIDEO_BASE}/taglio-03.mp4`,
    alt: "Acconciatura e styling — clip reale dal salone Felice Polese",
    label: "Acconciatura",
    sourceFile: "taglio-03.mp4",
  },
  {
    serviceId: "taglio-bambino",
    id: "service-taglio-bambino",
    src: `${VIDEO_BASE}/taglio-01.mp4`,
    alt: "Taglio Bambino — clip reale dal salone Felice Polese",
    label: "Taglio Bambino",
    sourceFile: "taglio-01.mp4",
  },
  {
    serviceId: "barba-pro",
    id: "service-barba-pro",
    alt: "Barba Pro — foto servizio Felice Polese",
    label: "Barba Pro",
    posterSrc: "/assets/images/services/barba-pro.jpg",
    imageSrc: "/assets/images/services/barba-pro.jpg",
    sourceFile: "barba-pro.jpg",
  },
  {
    serviceId: "barba-standard",
    id: "service-barba-standard",
    alt: "Barba Standard — rifinitura barba fade Felice Polese",
    label: "Barba Standard",
    posterSrc: "/assets/images/services/barba-standard.jpg",
    imageSrc: "/assets/images/services/barba-standard.jpg",
    sourceFile: "barba-standard.jpg",
  },
  {
    serviceId: "decolorazione-meches",
    id: "service-decolorazione-meches",
    src: MECHES_VIDEO.src,
    alt: "Decolorazione Meches — clip reale dal salone Felice Polese",
    label: "Decolorazione Meches",
    sourceFile: "meches.mp4",
  },
  {
    serviceId: "decolorazione-cutanea",
    id: "service-decolorazione-cutanea",
    src: DECOLORAZIONE_CUTANEA_VIDEO.src,
    alt: "Decolorazione Cutanea — clip reale dal salone Felice Polese",
    label: "Decolorazione Cutanea",
    sourceFile: "decolorazione-cutanea.mp4",
  },
  {
    serviceId: "tintura-capelli",
    id: "service-tintura-capelli",
    src: `${VIDEO_BASE}/colorazione-02.mp4`,
    alt: "Tintura Capelli — clip reale dal salone Felice Polese",
    label: "Tintura Capelli",
    sourceFile: "colorazione-02.mp4",
  },
  {
    serviceId: "tintura-barba",
    id: "service-tintura-barba",
    alt: "Tintura Barba — foto servizio Felice Polese",
    label: "Tintura Barba",
    posterSrc: "/assets/images/services/tintura-barba.jpg",
    imageSrc: "/assets/images/services/tintura-barba.jpg",
    sourceFile: "tintura-barba.jpg",
  },
] as const;

/** Filenames that must exist under public/assets/video/ (committed to git). */
export const REQUIRED_VIDEO_FILES = [
  "salone-generale.mp4",
  "taglio-01.mp4",
  "taglio-02.mp4",
  "taglio-03.mp4",
  "colorazione-01.mp4",
  "colorazione-02.mp4",
  "colorazione-03.mp4",
  "meches.mp4",
  "decolorazione-cutanea.mp4",
  "video-felice-polese-bio.mp4",
] as const;

/** Synced bio clip filename under public/assets/video/ */
export const FELICE_WORKING_FILENAME = "video-felice-polese-bio.mp4" as const;

/** Technique reels — sync from public/video/ with scripts/sync-videos.ps1 */
export const TECHNIQUE_VIDEO_FILES = [
  "razor-fade.mp4",
  "taper-fade.mp4",
  "burst-fade.mp4",
] as const;
