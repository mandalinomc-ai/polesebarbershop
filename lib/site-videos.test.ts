import { describe, expect, it } from "vitest";
import {
  ALL_SITE_VIDEOS,
  COLORAZIONE_VIDEOS,
  GALLERY_VIDEOS,
  HERO_VIDEOS,
  TAGLIO_VIDEOS,
} from "./site-videos";

describe("site-videos", () => {
  it("defines six real salon videos under public/assets/video/", () => {
    expect(TAGLIO_VIDEOS).toHaveLength(3);
    expect(COLORAZIONE_VIDEOS).toHaveLength(3);
    expect(ALL_SITE_VIDEOS).toHaveLength(6);

    for (const video of ALL_SITE_VIDEOS) {
      expect(video.src).toMatch(/^\/assets\/video\/(taglio|colorazione)-\d{2}\.mp4$/);
      expect((video as { poster?: string }).poster).toBeUndefined();
      expect(video.alt.length).toBeGreaterThan(5);
    }
  });

  it("uses taglio + colorazione in the hero asymmetric grid (no reel labels)", () => {
    expect(HERO_VIDEOS).toHaveLength(3);
    expect(HERO_VIDEOS.map((v) => v.id)).toEqual([
      "taglio-01",
      "taglio-02",
      "colorazione-01",
    ]);
    for (const video of HERO_VIDEOS) {
      expect((video as { label?: string }).label).toBeUndefined();
    }
  });

  it("shows remaining footage in gallery grid (no invented labels)", () => {
    expect(GALLERY_VIDEOS).toHaveLength(3);
    expect(GALLERY_VIDEOS.map((v) => v.id)).toEqual([
      "taglio-03",
      "colorazione-02",
      "colorazione-03",
    ]);
  });
});
