import { describe, expect, it } from "vitest";
import { CLIENT } from "@/clients/active";
import { SITE, SITE_DOCUMENT_TITLE, HERO_SENTENCE } from "@/lib/site-config";

describe("white-label client kit", () => {
  it("active pack is Felice Polese by default", () => {
    expect(CLIENT.slug).toBe("felice-polese");
    expect(CLIENT.site.name).toBe("Felice Polese Barber Shop");
    expect(SITE.name).toBe(CLIENT.site.name);
    expect(SITE_DOCUMENT_TITLE).toBe(CLIENT.copy.documentTitle);
    expect(HERO_SENTENCE).toBe(CLIENT.copy.heroSentence);
  });

  it("exposes required media slots for onboarding", () => {
    const required = CLIENT.mediaSlots.filter((s) => s.required);
    expect(required.some((s) => s.path.includes("logo.png"))).toBe(true);
    expect(required.some((s) => s.path.includes("og-cover"))).toBe(true);
  });
});
