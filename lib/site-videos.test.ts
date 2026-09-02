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
  TAGLIO_VIDEOS,
  VIDEO_BASE,
  VIDEO_REELS,
} from "./site-videos";

const VIDEO_DIR = join(process.cwd(), "public", "assets", "video");

describe("site-videos", () => {
  it("defines six service reels under /video/ without salone-generale", () => {
    expect(TAGLIO_VIDEOS).toHaveLength(3);
    expect(COLORAZIONE_VIDEOS).toHaveLength(3);
    expect(VIDEO_REELS).toHaveLength(6);
    expect(ALL_SITE_VIDEOS).toHaveLength(7);

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

    expect(ALL_SITE_VIDEOS.some((v) => v.id === "salone-generale")).toBe(false);
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

  it("keeps fade techniques as dedicated clips in Taper / Burst / Razor order", () => {
    expect(CUTTING_TECHNIQUE_VIDEOS).toHaveLength(3);
    expect(CUTTING_TECHNIQUE_VIDEOS.map((v) => v.id)).toEqual([
      "taper-fade-technique",
      "burst-fade-technique",
      "razor-fade-technique",
    ]);
    expect(CUTTING_TECHNIQUE_VIDEOS[0]?.label).toBe("Taper Fade");
    expect(CUTTING_TECHNIQUE_VIDEOS[1]?.label).toBe("Burst Fade");
    expect(CUTTING_TECHNIQUE_VIDEOS[2]?.label).toBe("Razor Fade");
    for (const video of CUTTING_TECHNIQUE_VIDEOS) {
      expect(video.src).toMatch(/^\/video\/(taper-fade|burst-fade|razor-fade)\.mp4$/);
      expect(video.label).not.toMatch(/€/);
    }
    expect(SALON_WORK_VIDEOS.map((v) => v.id)).toEqual([
      "taglio-03",
      "colorazione-01",
      "colorazione-02",
      "colorazione-03",
    ]);
  });

  it("points the bio clip at public/assets/video/video-felice-polese-bio.mp4", () => {
    expect(FELICE_WORKING_VIDEO.src).toBe(`${VIDEO_BASE}/video-felice-polese-bio.mp4`);
    expect(FELICE_WORKING_FILENAME).toBe("video-felice-polese-bio.mp4");
    expect(existsSync(VIDEO_DIR), `missing folder ${VIDEO_DIR}`).toBe(true);
  });
});
