import { afterEach, describe, expect, it } from "vitest";
import {
  ADMIN_COOKIE,
  createAdminToken,
  getAdminPassword,
  getAdminUser,
  isAdminConfigured,
  isAdminTokenValid,
  verifyAdminCredentials,
} from "./admin-auth";
import { POST } from "@/app/api/admin/login/route";

describe("admin /gestionale credentials", () => {
  const origUser = process.env.ADMIN_USER;
  const origPass = process.env.ADMIN_PASSWORD;

  afterEach(() => {
    if (origUser === undefined) delete process.env.ADMIN_USER;
    else process.env.ADMIN_USER = origUser;
    if (origPass === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = origPass;
  });

  it("defaults to admin / admin when env is unset", () => {
    delete process.env.ADMIN_USER;
    delete process.env.ADMIN_PASSWORD;
    expect(getAdminUser()).toBe("admin");
    expect(getAdminPassword()).toBe("admin");
    expect(isAdminConfigured()).toBe(true);
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

  it("uses ADMIN_USER and ADMIN_PASSWORD when set", () => {
    process.env.ADMIN_USER = "felice";
    process.env.ADMIN_PASSWORD = "segreto12";
    expect(verifyAdminCredentials("felice", "segreto12")).toBe(true);
    expect(verifyAdminCredentials("admin", "admin")).toBe(false);
  });
});

describe("POST /api/admin/login", () => {
  const origUser = process.env.ADMIN_USER;
  const origPass = process.env.ADMIN_PASSWORD;

  afterEach(() => {
    if (origUser === undefined) delete process.env.ADMIN_USER;
    else process.env.ADMIN_USER = origUser;
    if (origPass === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = origPass;
  });

  async function login(body: unknown) {
    return POST(
      new Request("http://localhost/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  }

  it("accepts username admin and password admin by default", async () => {
    delete process.env.ADMIN_USER;
    delete process.env.ADMIN_PASSWORD;
    const res = await login({ username: "admin", password: "admin" });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(true);
    expect(res.cookies.get(ADMIN_COOKIE)?.value).toBeTruthy();
  });

  it("accepts id as alias of username", async () => {
    delete process.env.ADMIN_USER;
    delete process.env.ADMIN_PASSWORD;
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
});
