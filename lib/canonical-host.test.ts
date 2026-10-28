import { describe, expect, it } from "vitest";
import {
  CANONICAL_SITE_HOST,
  CANONICAL_SITE_URL,
  isCanonicalHost,
  requestHost,
} from "./canonical-host";

describe("canonical-host", () => {
  it("accepts .it and www, plus localhost for dev", () => {
    expect(isCanonicalHost("felicepolesebarbershop.it")).toBe(true);
    expect(isCanonicalHost("www.felicepolesebarbershop.it")).toBe(true);
    expect(isCanonicalHost("FelicePoleseBarbershop.it:443")).toBe(true);
    expect(isCanonicalHost("localhost")).toBe(true);
    expect(isCanonicalHost("127.0.0.1:3000")).toBe(true);
  });

  it("rejects Vercel / preview / IP hosts so they stay on legacy offline", () => {
    expect(isCanonicalHost("felice-polese.vercel.app")).toBe(false);
    expect(isCanonicalHost("something.vercel.app")).toBe(false);
    expect(isCanonicalHost("94.177.161.26")).toBe(false);
    expect(isCanonicalHost("")).toBe(false);
    expect(isCanonicalHost(null)).toBe(false);
  });

  it("prefers x-forwarded-host", () => {
    const headers = {
      get(name: string) {
        if (name === "x-forwarded-host") return "felicepolesebarbershop.it";
        if (name === "host") return "localhost:3000";
        return null;
      },
    };
    expect(requestHost(headers)).toBe("felicepolesebarbershop.it");
    expect(CANONICAL_SITE_URL).toBe(`https://${CANONICAL_SITE_HOST}`);
  });
});
