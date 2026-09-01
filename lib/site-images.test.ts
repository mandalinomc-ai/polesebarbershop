import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GALLERY_IMAGES, HERO_BG } from "./site-images";

function fileHash(relativePublicPath: string): string {
  const disk = join(process.cwd(), "public", relativePublicPath.replace(/^\//, ""));
  return createHash("md5").update(readFileSync(disk)).digest("hex");
}

describe("site-images gallery", () => {
  it("uses five distinct assets (no hero repeat, no duplicate product shots)", () => {
    expect(GALLERY_IMAGES).toHaveLength(5);
    const srcs = GALLERY_IMAGES.map((g) => g.src);
    expect(new Set(srcs).size).toBe(5);
    expect(srcs).not.toContain(HERO_BG.src);
    expect(srcs).not.toContain("/assets/images/gallery/fresha-00.jpg");

    const hashes = srcs.map((src) => fileHash(src));
    expect(new Set(hashes).size).toBe(5);
  });

  it("includes fresha-03 and brand-products for visual variety", () => {
    const srcs = GALLERY_IMAGES.map((g) => g.src);
    expect(srcs).toContain("/assets/images/gallery/fresha-03.jpg");
    expect(srcs).toContain("/assets/images/brand-products.jpg");
    expect(srcs).toContain("/assets/images/gallery/fresha-01.jpg");
  });
});
