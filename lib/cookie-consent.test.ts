import { describe, expect, it } from "vitest";
import {
  CONSENT_VERSION,
  SITE_COOKIES,
  defaultConsent,
  parseConsent,
  serializeConsent,
} from "./cookie-consent";

describe("cookie consent", () => {
  it("lists only real cookies (no invented analytics)", () => {
    const names = SITE_COOKIES.map((c) => c.name);
    expect(names).toContain("polese_admin");
    expect(names).toContain("polese_cookie_consent");
    expect(names.some((n) => /ga|gtm|fbp|_fbp|hotjar/i.test(n))).toBe(false);
  });

  it("round-trips consent state", () => {
    const state = defaultConsent(true);
    expect(state.necessary).toBe(true);
    expect(state.version).toBe(CONSENT_VERSION);
    const again = parseConsent(serializeConsent(state));
    expect(again?.preferences).toBe(true);
  });

  it("rejects invalid or outdated payloads", () => {
    expect(parseConsent(null)).toBeNull();
    expect(parseConsent("{")).toBeNull();
    expect(parseConsent(JSON.stringify({ version: 99, necessary: true }))).toBeNull();
  });
});
