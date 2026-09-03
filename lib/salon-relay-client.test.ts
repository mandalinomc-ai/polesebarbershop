import { describe, expect, it } from "vitest";
import { SITE } from "./site-config";
import { salonFormSubmitAction, salonFormSubmitAjaxUrl } from "./salon-relay-client";

describe("salon client relay", () => {
  it("posts to FormSubmit for the salon Gmail", () => {
    expect(SITE.email).toBe("felicepolese550@gmail.com");
    expect(salonFormSubmitAjaxUrl()).toContain("formsubmit");
    expect(salonFormSubmitAjaxUrl()).toContain("felicepolese550");
    expect(salonFormSubmitAction()).toMatch(/formsubmit\.co\/felicepolese550/);
  });
});
