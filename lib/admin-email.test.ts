import { afterEach, describe, expect, it } from "vitest";
import {
  getAdminEmail,
  getBookingNotificationEmail,
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

describe("getBookingNotificationEmail", () => {
  const origBooking = process.env.BOOKING_NOTIFICATION_EMAIL;
  const origAdmin = process.env.ADMIN_EMAIL;

  afterEach(() => {
    if (origBooking === undefined) delete process.env.BOOKING_NOTIFICATION_EMAIL;
    else process.env.BOOKING_NOTIFICATION_EMAIL = origBooking;
    if (origAdmin === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = origAdmin;
  });

  it("prefers BOOKING_NOTIFICATION_EMAIL", () => {
    process.env.BOOKING_NOTIFICATION_EMAIL = "booking@example.com";
    process.env.ADMIN_EMAIL = "admin@example.com";
    expect(getBookingNotificationEmail()).toBe("booking@example.com");
  });

  it("falls back to ADMIN_EMAIL", () => {
    delete process.env.BOOKING_NOTIFICATION_EMAIL;
    process.env.ADMIN_EMAIL = "admin@example.com";
    expect(getBookingNotificationEmail()).toBe("admin@example.com");
  });
});
