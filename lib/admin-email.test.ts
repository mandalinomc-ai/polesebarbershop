import { afterEach, describe, expect, it } from "vitest";
import { getAdminEmail } from "./site-config";

describe("getAdminEmail", () => {
  const origAdmin = process.env.ADMIN_EMAIL;
  const origOwner = process.env.OWNER_EMAIL;

  afterEach(() => {
    if (origAdmin === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = origAdmin;
    if (origOwner === undefined) delete process.env.OWNER_EMAIL;
    else process.env.OWNER_EMAIL = origOwner;
  });

  it("prefers ADMIN_EMAIL", () => {
    process.env.ADMIN_EMAIL = "admin@example.com";
    process.env.OWNER_EMAIL = "owner@example.com";
    expect(getAdminEmail()).toBe("admin@example.com");
  });

  it("falls back to OWNER_EMAIL", () => {
    delete process.env.ADMIN_EMAIL;
    process.env.OWNER_EMAIL = "owner@example.com";
    expect(getAdminEmail()).toBe("owner@example.com");
  });

  it("falls back to mandalinomc@gmail.com, not only info@polesebarbershop.it", () => {
    delete process.env.ADMIN_EMAIL;
    delete process.env.OWNER_EMAIL;
    expect(getAdminEmail()).toBe("mandalinomc@gmail.com");
    expect(getAdminEmail()).not.toBe("info@polesebarbershop.it");
  });
});
