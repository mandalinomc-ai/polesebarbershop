import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SITE_PDFS } from "./site-pdf";

const PDF_DIR = join(process.cwd(), "public", "assets", "pdf");

describe("site-pdf", () => {
  it("defines official logo and hours panel paths under /assets/pdf/", () => {
    expect(SITE_PDFS.logo).toBe("/assets/pdf/Logo_Felice_Polese.pdf");
    expect(SITE_PDFS.hoursPanel).toBe("/assets/pdf/PannelloOrari.pdf");
  });

  it("has both PDF files committed on disk", () => {
    for (const href of Object.values(SITE_PDFS)) {
      const filename = href.split("/").pop()!;
      const diskPath = join(PDF_DIR, filename);
      expect(existsSync(diskPath), `missing ${diskPath}`).toBe(true);
    }
  });
});
