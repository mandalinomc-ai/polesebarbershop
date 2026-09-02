import { afterEach, describe, expect, it } from "vitest";
import {
  getAdminEmail,
  getNotifyEmail,
  getOwnerNotifyEmails,
  isResendTestFrom,
} from "./site-config";

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

  it("falls back to the salon Gmail", () => {
    delete process.env.ADMIN_EMAIL;
    delete process.env.OWNER_EMAIL;
    expect(getAdminEmail()).toBe("felicepolese550@gmail.com");
  });
});

describe("owner notify routing", () => {
  const origAdmin = process.env.ADMIN_EMAIL;
  const origOwner = process.env.OWNER_EMAIL;
  const origNotify = process.env.NOTIFY_EMAIL;
  const origFrom = process.env.RESEND_FROM;

  afterEach(() => {
    if (origAdmin === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = origAdmin;
    if (origOwner === undefined) delete process.env.OWNER_EMAIL;
    else process.env.OWNER_EMAIL = origOwner;
    if (origNotify === undefined) delete process.env.NOTIFY_EMAIL;
    else process.env.NOTIFY_EMAIL = origNotify;
    if (origFrom === undefined) delete process.env.RESEND_FROM;
    else process.env.RESEND_FROM = origFrom;
  });

  it("detects Resend test From", () => {
    process.env.RESEND_FROM = "Felice Polese Barber Shop <onboarding@resend.dev>";
    expect(isResendTestFrom()).toBe(true);
    process.env.RESEND_FROM = "Polese <noreply@polesebarbershop.it>";
    expect(isResendTestFrom()).toBe(false);
  });

  it("always includes the salon Gmail, plus NOTIFY_EMAIL when it differs", () => {
    process.env.RESEND_FROM = "Felice Polese Barber Shop <onboarding@resend.dev>";
    process.env.ADMIN_EMAIL = "felicepolese550@gmail.com";
    process.env.NOTIFY_EMAIL = "notify@example.com";
    expect(getNotifyEmail()).toBe("notify@example.com");
    expect(getOwnerNotifyEmails()).toEqual([
      "felicepolese550@gmail.com",
      "notify@example.com",
    ]);
  });

  it("sends to admin and notify when domain is verified", () => {
    process.env.RESEND_FROM = "Polese <noreply@polesebarbershop.it>";
    process.env.ADMIN_EMAIL = "felicepolese550@gmail.com";
    process.env.NOTIFY_EMAIL = "notify@example.com";
    expect(getOwnerNotifyEmails()).toEqual([
      "felicepolese550@gmail.com",
      "notify@example.com",
    ]);
  });
});
