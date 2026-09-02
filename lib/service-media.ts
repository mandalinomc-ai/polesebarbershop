import { existsSync } from "node:fs";
import { join } from "node:path";
import { VIDEO_BASE } from "./site-videos";

export type ServiceMedia =
  | { kind: "video"; src: string; diskName: string }
  | { kind: "photo"; src: string; diskName: string };

const VIDEO_DIR = join(process.cwd(), "public", "assets", "video");
const IMAGE_DIR = join(process.cwd(), "public", "images");

/** Official listino media — videos under /video/, photos under /images/. */
export const SERVICE_MEDIA: Record<string, ServiceMedia> = {
  "taglio-pro": {
    kind: "video",
    src: `${VIDEO_BASE}/taglio-01.mp4`,
    diskName: "taglio-01.mp4",
  },
  "taglio-standard": {
    kind: "video",
    src: `${VIDEO_BASE}/taglio-01.mp4`,
    diskName: "taglio-01.mp4",
  },
  "taglio-bambino": {
    kind: "video",
    src: `${VIDEO_BASE}/taglio-03.mp4`,
    diskName: "taglio-03.mp4",
  },
  acconciatura: {
    kind: "video",
    src: `${VIDEO_BASE}/taglio-02.mp4`,
    diskName: "taglio-02.mp4",
  },
  "barba-pro": {
    kind: "photo",
    src: "/images/barba-pro.jpg",
    diskName: "barba-pro.jpg",
  },
  "barba-standard": {
    kind: "video",
    src: `${VIDEO_BASE}/taglio-03.mp4`,
    diskName: "taglio-03.mp4",
  },
  "decolorazione-meches": {
    kind: "video",
    src: `${VIDEO_BASE}/colorazione-03.mp4`,
    diskName: "colorazione-03.mp4",
  },
  "decolorazione-cutanea": {
    kind: "video",
    src: `${VIDEO_BASE}/decolorazione-cute.mp4`,
    diskName: "decolorazione-cute.mp4",
  },
  "tintura-capelli": {
    kind: "video",
    src: `${VIDEO_BASE}/colorazione-01.mp4`,
    diskName: "colorazione-01.mp4",
  },
  "tintura-barba": {
    kind: "photo",
    src: "/images/tintura-barba.jpg",
    diskName: "tintura-barba.jpg",
  },
};

export function serviceMediaExists(media: ServiceMedia): boolean {
  if (media.kind === "video") {
    return existsSync(join(VIDEO_DIR, media.diskName));
  }
  return existsSync(join(IMAGE_DIR, media.diskName));
}

export function getServiceMedia(serviceId: string): ServiceMedia | null {
  const media = SERVICE_MEDIA[serviceId];
  if (!media) return null;
  return serviceMediaExists(media) ? media : null;
}
