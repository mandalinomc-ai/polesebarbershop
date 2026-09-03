import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PRODUCTS } from "./products";

describe("Felice Polese product vetrina", () => {
  it("lists the two Drive products without invented prices", () => {
    expect(PRODUCTS).toHaveLength(2);
    expect(PRODUCTS.map((p) => p.id)).toEqual([
      "cera-lucida",
      "lacca-professionale",
    ]);
    expect(PRODUCTS.map((p) => p.name)).toEqual([
      "Cera Lucida",
      "Lacca Professionale",
    ]);
    for (const product of PRODUCTS) {
      expect(product).not.toHaveProperty("priceLabel");
      expect(product.image).toMatch(/^\/assets\/images\/products\//);
      const disk = join(process.cwd(), "public", product.image.replace(/^\//, ""));
      expect(existsSync(disk), `missing ${disk}`).toBe(true);
    }
  });
});
