import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PRODUCTS, productOrderMessage } from "./products";

describe("Felice Polese product vetrina", () => {
  it("lists only the real salon products with official photos", () => {
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

  it("prepares WhatsApp info copy for in-store purchase", () => {
    expect(productOrderMessage("Cera Lucida")).toMatch(/informazioni su Cera Lucida/);
    expect(productOrderMessage("Cera Lucida")).toMatch(/acquisto in sede/);
    expect(productOrderMessage("Cera Lucida")).toMatch(/WhatsApp/);
    expect(productOrderMessage("Cera Lucida")).not.toMatch(/acquista online|checkout|carrello/i);
  });
});
