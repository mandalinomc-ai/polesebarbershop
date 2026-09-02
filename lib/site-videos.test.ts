import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ALL_SITE_VIDEOS,
  COLORAZIONE_VIDEOS,
  CUTTING_TECHNIQUE_VIDEOS,
  SALON_WORK_VIDEOS,
  FELICE_WORKING_FILENAME,
  FELICE_WORKING_VIDEO,
  GALLERY_VIDEOS,
  HERO_VIDEOS,
  REQUIRED_VIDEO_FILES,
  SALONE_GENERALE_VIDEO,
  TAGLIO_VIDEOS,
  VIDEO_BASE,
  VIDEO_HERO_BASE,
  VIDEO_REELS,
} from "./site-videos";

const VIDEO_DIR = join(process.cwd(), "public", "assets", "video");
const HERO_VIDEO_DIR = join(process.cwd(), "public", "assets", "videos");

describe("site-videos", () => {
  it("defines six service reels plus general salon video under /video/", () => {
    expect(TAGLIO_VIDEOS).toHaveLength(3);
    expect(COLORAZIONE_VIDEOS).toHaveLength(3);
    expect(VIDEO_REELS).toHaveLength(6);
    expect(ALL_SITE_VIDEOS).toHaveLength(8);

    expect(VIDEO_REELS.map((v) => v.id)).toEqual([
      "taglio-01",
      "taglio-02",
      "taglio-03",
      "colorazione-01",
      "colorazione-02",
      "colorazione-03",
    ]);

    for (const video of VIDEO_REELS) {
      expect(video.src).toMatch(/^\/video\/(taglio|colorazione)-\d{2}\.mp4$/);
      expect(video.alt.length).toBeGreaterThan(5);
    }

    expect(SALONE_GENERALE_VIDEO.src).toBe(`${VIDEO_BASE}/salone-generale.mp4`);
  });

  it("has all required mp4 files committed on disk in public/assets/video/", () => {
    for (const filename of REQUIRED_VIDEO_FILES) {
      const diskPath = join(VIDEO_DIR, filename);
      expect(existsSync(diskPath), `missing ${diskPath}`).toBe(true);
    }
  });

  it("uses taglio + colorazione in the hero asymmetric grid", () => {
    expect(HERO_VIDEOS).toHaveLength(3);
    expect(HERO_VIDEOS.map((v) => v.id)).toEqual([
      "taglio-01",
      "taglio-02",
      "colorazione-01",
    ]);
  });

  it("shows remaining footage in gallery grid", () => {
    expect(GALLERY_VIDEOS).toHaveLength(3);
    expect(GALLERY_VIDEOS.map((v) => v.id)).toEqual([
      "taglio-03",
      "colorazione-02",
      "colorazione-03",
    ]);
  });

  it("keeps Razor Taper and Skin Fade as technique videos, not priced services", () => {
    expect(CUTTING_TECHNIQUE_VIDEOS).toHaveLength(2);
    expect(CUTTING_TECHNIQUE_VIDEOS.map((v) => v.id)).toEqual([
      "razor-taper-technique",
      "skin-fade-technique",
    ]);
    expect(CUTTING_TECHNIQUE_VIDEOS[0]?.label).toBe("Razor Taper — Tecnica di sfumatura");
    expect(CUTTING_TECHNIQUE_VIDEOS[1]?.label).toBe("Skin Fade — Tecnica di sfumatura a pelle");
    for (const video of CUTTING_TECHNIQUE_VIDEOS) {
      expect(video.src).toMatch(/^\/video\/taglio-\d{2}\.mp4$/);
      expect(video.label).not.toMatch(/€/);
    }
    expect(SALON_WORK_VIDEOS.map((v) => v.id)).toEqual([
      "taglio-03",
      "colorazione-01",
      "colorazione-02",
      "colorazione-03",
    ]);
  });

  it("points the bio clip at public/assets/videos/felice-working.mp4", () => {
    expect(FELICE_WORKING_VIDEO.src).toBe(`${VIDEO_HERO_BASE}/${FELICE_WORKING_FILENAME}`);
    expect(existsSync(HERO_VIDEO_DIR), `missing folder ${HERO_VIDEO_DIR}`).toBe(true);
  });
});
