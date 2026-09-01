import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GALLERY_IMAGES } from "./site-images";

function fileHash(relativePublicPath: string): string {
  const disk = join(process.cwd(), "public", relativePublicPath.replace(/^\//, ""));
  return createHash("md5").update(readFileSync(disk)).digest("hex");
}

describe("site-images gallery", () => {
  it("uses four distinct assets (no hero-bg repeat, no duplicate product shots)", () => {
    expect(GALLERY_IMAGES).toHaveLength(4);
    const srcs = GALLERY_IMAGES.map((g) => g.src);
    expect(new Set(srcs).size).toBe(4);
    expect(srcs).not.toContain("/assets/images/hero-bg.jpg");
    expect(srcs).not.toContain("/assets/images/gallery/fresha-00.jpg");
    expect(srcs).not.toContain("/assets/images/logo.jpg");

    const hashes = srcs.map((src) => fileHash(src));
    expect(new Set(hashes).size).toBe(4);
  });

  it("includes fresha-01/02/03 and brand-products for visual variety", () => {
    const srcs = GALLERY_IMAGES.map((g) => g.src);
    expect(srcs).toContain("/assets/images/gallery/fresha-01.jpg");
    expect(srcs).toContain("/assets/images/gallery/fresha-02.jpg");
    expect(srcs).toContain("/assets/images/gallery/fresha-03.jpg");
    expect(srcs).toContain("/assets/images/brand-products.jpg");
  });
});
