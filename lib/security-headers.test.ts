import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("security headers config", () => {
  it("defines CSP and core hardening headers", async () => {
    const headers = await nextConfig.headers?.();
    expect(headers).toBeTruthy();
    const global = headers!.find((h) => h.source === "/:path*");
    expect(global).toBeTruthy();
    const map = Object.fromEntries(global!.headers.map((h) => [h.key, h.value]));
    expect(map["Content-Security-Policy"]).toMatch(/default-src 'self'/);
    expect(map["Content-Security-Policy"]).toMatch(/fonts\.gstatic\.com/);
    expect(map["X-Frame-Options"]).toBe("DENY");
    expect(map["X-Content-Type-Options"]).toBe("nosniff");
    expect(map["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(map["Strict-Transport-Security"]).toMatch(/max-age=/);
    expect(map["Permissions-Policy"]).toMatch(/camera=\(\)/);
  });

  it("sets no-store on API and immutable on static assets", async () => {
    const headers = await nextConfig.headers?.();
    const api = headers!.find((h) => h.source === "/api/:path*");
    expect(api?.headers[0]?.value).toMatch(/no-store/);
    const staticAssets = headers!.find((h) => h.source === "/_next/static/:path*");
    expect(staticAssets?.headers[0]?.value).toMatch(/immutable/);
  });

  it("disables powered-by header", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});
