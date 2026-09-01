/** Canonical paths for static assets in /public. */
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

/** Gallery uses real salon videos only — no low-res stills. */
export const GALLERY_IMAGES: GalleryImage[] = [];
