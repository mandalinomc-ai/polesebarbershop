import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ALL_SITE_VIDEOS,
  COLORAZIONE_VIDEOS,
  CUTTING_TECHNIQUE_VIDEOS,
  DECOLORAZIONE_CUTANEA_VIDEO,
  SALON_WORK_VIDEOS,
  FELICE_WORKING_FILENAME,
  FELICE_WORKING_VIDEO,
  GALLERY_VIDEOS,
  HERO_VIDEOS,
  MECHES_VIDEO,
  REQUIRED_VIDEO_FILES,
  SALONE_GENERALE_VIDEO,
  SERVICE_SHOWCASE_VIDEOS,
  TAGLIO_VIDEOS,
  VIDEO_BASE,
  VIDEO_REELS,
} from "./site-videos";

const VIDEO_DIR = join(process.cwd(), "public", "assets", "video");

describe("site-videos", () => {
  it("defines service reels plus general salon video under /video/", () => {
    expect(TAGLIO_VIDEOS).toHaveLength(3);
    expect(COLORAZIONE_VIDEOS).toHaveLength(3);
    expect(VIDEO_REELS).toHaveLength(6);
    expect(ALL_SITE_VIDEOS).toHaveLength(10);

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
    expect(MECHES_VIDEO.src).toBe(`${VIDEO_BASE}/meches.mp4`);
    expect(DECOLORAZIONE_CUTANEA_VIDEO.src).toBe(
      `${VIDEO_BASE}/decolorazione-cutanea.mp4`,
    );
  });

  it("has all required mp4 files committed on disk in public/assets/video/", () => {
    for (const filename of REQUIRED_VIDEO_FILES) {
      const diskPath = join(VIDEO_DIR, filename);
      expect(existsSync(diskPath), `missing ${diskPath}`).toBe(true);
    }
  });

  it("maps every bookable service to real local media", () => {
    expect(SERVICE_SHOWCASE_VIDEOS).toHaveLength(10);
    expect(SERVICE_SHOWCASE_VIDEOS.map((v) => v.serviceId)).toEqual([
      "taglio-pro",
      "taglio-standard",
      "acconciatura",
      "taglio-bambino",
      "barba-pro",
      "barba-standard",
      "decolorazione-meches",
      "decolorazione-cutanea",
      "tintura-capelli",
      "tintura-barba",
    ]);
    expect(
      SERVICE_SHOWCASE_VIDEOS.find((v) => v.serviceId === "decolorazione-meches")?.src,
    ).toBe(`${VIDEO_BASE}/meches.mp4`);
    expect(
      SERVICE_SHOWCASE_VIDEOS.find((v) => v.serviceId === "decolorazione-cutanea")?.src,
    ).toBe(`${VIDEO_BASE}/decolorazione-cutanea.mp4`);
    expect(
      SERVICE_SHOWCASE_VIDEOS.find((v) => v.serviceId === "barba-pro")?.posterSrc,
    ).toBe("/assets/images/services/barba-pro.jpg");
    expect(
      SERVICE_SHOWCASE_VIDEOS.find((v) => v.serviceId === "barba-pro")?.imageSrc,
    ).toBe("/assets/images/services/barba-pro.jpg");
    expect(SERVICE_SHOWCASE_VIDEOS.find((v) => v.serviceId === "barba-pro")?.src).toBeUndefined();
    expect(
      SERVICE_SHOWCASE_VIDEOS.find((v) => v.serviceId === "barba-standard")?.imageSrc,
    ).toBe("/assets/images/services/barba-pro.jpg");
    expect(
      SERVICE_SHOWCASE_VIDEOS.find((v) => v.serviceId === "barba-standard")?.src,
    ).toBeUndefined();
    expect(
      SERVICE_SHOWCASE_VIDEOS.find((v) => v.serviceId === "tintura-barba")?.posterSrc,
    ).toBe("/assets/images/services/tintura-barba.jpg");
    expect(
      SERVICE_SHOWCASE_VIDEOS.find((v) => v.serviceId === "tintura-barba")?.imageSrc,
    ).toBe("/assets/images/services/tintura-barba.jpg");
    expect(
      SERVICE_SHOWCASE_VIDEOS.find((v) => v.serviceId === "tintura-barba")?.src,
    ).toBeUndefined();
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

  it("has fade technique mp4 files on disk under public/assets/video/", () => {
    for (const filename of [
      "razor-fade.mp4",
      "taper-fade.mp4",
      "burst-fade.mp4",
    ] as const) {
      const diskPath = join(VIDEO_DIR, filename);
      expect(existsSync(diskPath), `missing ${diskPath}`).toBe(true);
    }
  });

  it("keeps fade techniques as dedicated clips, not priced services", () => {
    expect(CUTTING_TECHNIQUE_VIDEOS).toHaveLength(3);
    expect(CUTTING_TECHNIQUE_VIDEOS.map((v) => v.id)).toEqual([
      "razor-fade-technique",
      "taper-fade-technique",
      "burst-fade-technique",
    ]);
    expect(CUTTING_TECHNIQUE_VIDEOS[0]?.label).toBe("Razor Fade — Tecnica di sfumatura");
    expect(CUTTING_TECHNIQUE_VIDEOS[1]?.label).toBe("Taper Fade — Tecnica di sfumatura");
    expect(CUTTING_TECHNIQUE_VIDEOS[2]?.label).toBe("Burst Fade — Tecnica di sfumatura");
    for (const video of CUTTING_TECHNIQUE_VIDEOS) {
      expect(video.src).toMatch(/^\/video\/(razor-fade|taper-fade|burst-fade)\.mp4$/);
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
    const bioPath = join(VIDEO_DIR, FELICE_WORKING_FILENAME);
    expect(existsSync(bioPath), `missing ${bioPath}`).toBe(true);
    expect(statSync(bioPath).size).toBeGreaterThan(1_000_000);
  });
});
