import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PRODUCTS, productOrderMessage } from "./products";

describe("Felice Polese product vetrina", () => {
  it("lists the full salon line without invented prices", () => {
    expect(PRODUCTS.map((p) => p.id)).toEqual([
      "cera-lucida",
      "cera-matte",
      "lacca-professionale",
      "shampoo-idratante",
      "balsamo",
      "pomata",
      "olio-barba",
    ]);
    expect(PRODUCTS.map((p) => p.name)).toEqual([
      "Cera Lucida",
      "Cera Matte",
      "Lacca Professionale",
      "Shampoo Idratante",
      "Balsamo Nutriente",
      "Pomata Styling",
      "Olio Barba",
    ]);
    for (const product of PRODUCTS) {
      expect(product).not.toHaveProperty("priceLabel");
      expect(product.image).toMatch(/^\/assets\/images\/products\//);
      const disk = join(process.cwd(), "public", product.image.replace(/^\//, ""));
      expect(existsSync(disk), `missing ${disk}`).toBe(true);
    }
  });

  it("keeps official poster photos for Cera Lucida and Lacca Professionale", () => {
    expect(PRODUCTS.find((p) => p.id === "cera-lucida")?.image).toBe(
      "/assets/images/products/cera-lucida.jpg",
    );
    expect(PRODUCTS.find((p) => p.id === "lacca-professionale")?.image).toBe(
      "/assets/images/products/lacca-professionale.jpg",
    );
  });

  it("prepares WhatsApp info copy for in-store purchase", () => {
    expect(productOrderMessage("Cera Lucida")).toMatch(/informazioni su Cera Lucida/);
    expect(productOrderMessage("Cera Lucida")).toMatch(/acquisto in sede/);
    expect(productOrderMessage("Cera Lucida")).toMatch(/WhatsApp/);
    expect(productOrderMessage("Cera Lucida")).not.toMatch(/acquista online|checkout|carrello/i);
  });
});
