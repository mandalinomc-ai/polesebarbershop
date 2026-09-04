import { afterEach, describe, expect, it } from "vitest";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_MAX_AGE_SEC,
  createAdminToken,
  getAdminPassword,
  getAdminUser,
  isAdminConfigured,
  isAdminTokenValid,
  isUsingDefaultAdminCredentials,
  verifyAdminCredentials,
  adminCookieOptions,
} from "./admin-auth";
import { POST } from "@/app/api/admin/login/route";
import { resetRateLimitStore } from "./rate-limit";

describe("admin /gestionale credentials", () => {
  const origUser = process.env.ADMIN_USER;
  const origPass = process.env.ADMIN_PASSWORD;
  const origSecret = process.env.ADMIN_SESSION_SECRET;
  const origVercel = process.env.VERCEL;
  const origVercelEnv = process.env.VERCEL_ENV;

  afterEach(() => {
    if (origUser === undefined) delete process.env.ADMIN_USER;
    else process.env.ADMIN_USER = origUser;
    if (origPass === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = origPass;
    if (origSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = origSecret;
    if (origVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = origVercel;
    if (origVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = origVercelEnv;
    resetRateLimitStore();
  });

  it("defaults to admin / admin when env is unset", () => {
    delete process.env.ADMIN_USER;
    delete process.env.ADMIN_PASSWORD;
    expect(getAdminUser()).toBe("admin");
    expect(getAdminPassword()).toBe("admin");
    expect(isAdminConfigured()).toBe(true);
    expect(isUsingDefaultAdminCredentials()).toBe(true);
    expect(verifyAdminCredentials("admin", "admin")).toBe(true);
    expect(verifyAdminCredentials("Admin", "admin")).toBe(true);
    expect(verifyAdminCredentials("admin", "wrong")).toBe(false);
    expect(verifyAdminCredentials("nope", "admin")).toBe(false);
    const token = createAdminToken();
    expect(token).toBeTruthy();
    expect(isAdminTokenValid(token)).toBe(true);
    expect(isAdminTokenValid("nope")).toBe(false);
    expect(ADMIN_COOKIE).toBe("polese_admin");
  });

  it("issues expiring signed session tokens", () => {
    delete process.env.ADMIN_USER;
    delete process.env.ADMIN_PASSWORD;
    const token = createAdminToken(1_700_000_000_000)!;
    const parts = token.split(".");
    expect(parts).toHaveLength(3);
    expect(isAdminTokenValid(token, 1_700_000_000_000)).toBe(true);
    const pastExpiry =
      1_700_000_000_000 + ADMIN_SESSION_MAX_AGE_SEC * 1000 + 1;
    expect(isAdminTokenValid(token, pastExpiry)).toBe(false);
  });

  it("sets HttpOnly Secure cookie options on Vercel", () => {
    process.env.VERCEL = "1";
    const opts = adminCookieOptions();
    expect(opts.httpOnly).toBe(true);
    expect(opts.secure).toBe(true);
    expect(opts.sameSite).toBe("lax");
    expect(opts.maxAge).toBe(ADMIN_SESSION_MAX_AGE_SEC);
  });

  it("uses ADMIN_USER and ADMIN_PASSWORD when set", () => {
    process.env.ADMIN_USER = "felice";
    process.env.ADMIN_PASSWORD = "segreto12";
    expect(isUsingDefaultAdminCredentials()).toBe(false);
    expect(verifyAdminCredentials("felice", "segreto12")).toBe(true);
    expect(verifyAdminCredentials("admin", "admin")).toBe(false);
  });

  it("treats explicit admin/admin env as configured, not insecure defaults", () => {
    process.env.ADMIN_USER = "admin";
    process.env.ADMIN_PASSWORD = "admin";
    expect(isUsingDefaultAdminCredentials()).toBe(false);
    expect(verifyAdminCredentials("admin", "admin")).toBe(true);
  });
});

describe("POST /api/admin/login", () => {
  const origUser = process.env.ADMIN_USER;
  const origPass = process.env.ADMIN_PASSWORD;
  const origVercelEnv = process.env.VERCEL_ENV;

  afterEach(() => {
    if (origUser === undefined) delete process.env.ADMIN_USER;
    else process.env.ADMIN_USER = origUser;
    if (origPass === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = origPass;
    if (origVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = origVercelEnv;
    resetRateLimitStore();
  });

  async function login(body: unknown, ip = "203.0.113.10") {
    return POST(
      new Request("http://localhost/api/admin/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": ip,
        },
        body: JSON.stringify(body),
      }),
    );
  }

  it("accepts username admin and password admin by default outside Vercel production", async () => {
    delete process.env.ADMIN_USER;
    delete process.env.ADMIN_PASSWORD;
    delete process.env.VERCEL_ENV;
    const res = await login({ username: "admin", password: "admin" });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(true);
    expect(res.cookies.get(ADMIN_COOKIE)?.value).toBeTruthy();
    expect(isAdminTokenValid(res.cookies.get(ADMIN_COOKIE)?.value)).toBe(true);
  });

  it("accepts id as alias of username", async () => {
    delete process.env.ADMIN_USER;
    delete process.env.ADMIN_PASSWORD;
    delete process.env.VERCEL_ENV;
    const res = await login({ id: "admin", password: "admin" });
    expect(res.status).toBe(200);
  });

  it("rejects missing username", async () => {
    delete process.env.ADMIN_USER;
    delete process.env.ADMIN_PASSWORD;
    const res = await login({ password: "admin" });
    expect(res.status).toBe(400);
  });

  it("rejects wrong password", async () => {
    delete process.env.ADMIN_USER;
    delete process.env.ADMIN_PASSWORD;
    const res = await login({ username: "admin", password: "nope" });
    expect(res.status).toBe(401);
  });

  it("blocks default credentials in Vercel production", async () => {
    delete process.env.ADMIN_USER;
    delete process.env.ADMIN_PASSWORD;
    process.env.VERCEL_ENV = "production";
    const res = await login({ username: "admin", password: "admin" });
    expect(res.status).toBe(503);
  });

  it("accepts explicit admin/admin env in Vercel production", async () => {
    process.env.ADMIN_USER = "admin";
    process.env.ADMIN_PASSWORD = "admin";
    process.env.VERCEL_ENV = "production";
    const res = await login({ username: "admin", password: "admin" });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(true);
  });

  it("rate-limits repeated login failures", async () => {
    process.env.ADMIN_USER = "felice";
    process.env.ADMIN_PASSWORD = "segreto12";
    delete process.env.VERCEL_ENV;
    let last = 401;
    for (let i = 0; i < 6; i++) {
      const res = await login({ username: "felice", password: "wrong" }, "198.51.100.50");
      last = res.status;
    }
    expect(last).toBe(429);
  });
});
