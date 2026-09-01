import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ALL_SITE_VIDEOS,
  COLORAZIONE_VIDEOS,
  GALLERY_VIDEOS,
  HERO_VIDEOS,
  REQUIRED_VIDEO_FILES,
  SALONE_GENERALE_VIDEO,
  TAGLIO_VIDEOS,
  VIDEO_BASE,
  VIDEO_REELS,
} from "./site-videos";

const VIDEO_DIR = join(process.cwd(), "public", "assets", "video");

describe("site-videos", () => {
  it("defines six service reels plus general salon video under /assets/video/", () => {
    expect(TAGLIO_VIDEOS).toHaveLength(3);
    expect(COLORAZIONE_VIDEOS).toHaveLength(3);
    expect(VIDEO_REELS).toHaveLength(6);
    expect(ALL_SITE_VIDEOS).toHaveLength(8);

    for (const video of VIDEO_REELS) {
      expect(video.src).toMatch(/^\/assets\/video\/(taglio|colorazione)-\d{2}\.mp4$/);
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
});
