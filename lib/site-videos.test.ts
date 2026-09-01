import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { VIDEO_REELS } from "./site-videos";

describe("site-videos reels", () => {
  it("defines four vertical salon reels with mp4 sources and posters", () => {
    expect(VIDEO_REELS).toHaveLength(4);
    const ids = VIDEO_REELS.map((r) => r.id);
    expect(new Set(ids).size).toBe(4);

    for (const reel of VIDEO_REELS) {
      expect(reel.src).toMatch(/^\/assets\/videos\/reel-\d{2}\.mp4$/);
      expect(reel.poster).toMatch(/^\/assets\/images\//);
      expect(reel.alt.length).toBeGreaterThan(5);
      expect(reel.label.length).toBeGreaterThan(2);
    }
  });

  it("ships reel mp4 files in public/assets/videos", () => {
    for (const reel of VIDEO_REELS) {
      const disk = join(process.cwd(), "public", reel.src.replace(/^\//, ""));
      expect(existsSync(disk), reel.src).toBe(true);
      const size = readFileSync(disk).length;
      expect(size).toBeGreaterThan(100_000);
    }
  });
});
