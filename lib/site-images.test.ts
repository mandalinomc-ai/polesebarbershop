import { describe, expect, it } from "vitest";
import { GALLERY_IMAGES } from "./site-images";

describe("site-images gallery", () => {
  it("uses videos only — no low-res still gallery", () => {
    expect(GALLERY_IMAGES).toHaveLength(0);
  });
});
