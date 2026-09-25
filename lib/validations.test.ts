import { describe, expect, it } from "vitest";
import { bookingSchema, walkInSchema, adminLoginSchema } from "./validations";
import {
  normalizeItalianPhone,
  normalizeWhatsAppNumber,
  resolveBookingPhone,
  sanitizeWhatsAppPhone,
} from "./phone";

describe("phone + booking validation", () => {
  it("sanitises Italian mobiles to +39 (spaces, dashes, trunk zero)", () => {
    expect(sanitizeWhatsAppPhone("3331234567")).toBe("+393331234567");
    expect(normalizeWhatsAppNumber("333-123-4567")).toBe("+393331234567");
    expect(normalizeItalianPhone("327 015 6225")).toBe("+393270156225");
    expect(normalizeItalianPhone("+39 327 015 6225")).toBe("+393270156225");
    expect(normalizeItalianPhone("03270156225")).toBe("+393270156225");
    expect(normalizeItalianPhone("0039 333 111 2233")).toBe("+393331112233");
    expect(normalizeItalianPhone("(333) 111.22.33")).toBe("+393331112233");
    expect(normalizeItalianPhone("393331112233")).toBe("+393331112233");
  });

  it("keeps already-prefixed international numbers", () => {
    expect(sanitizeWhatsAppPhone("+393331234567")).toBe("+393331234567");
    expect(sanitizeWhatsAppPhone("+41 79 123 45 67")).toBe("+41791234567");
  });

  it("rejects unusable scraps", () => {
    expect(sanitizeWhatsAppPhone("")).toBeNull();
    expect(sanitizeWhatsAppPhone("12")).toBeNull();
    expect(sanitizeWhatsAppPhone("abc")).toBeNull();
  });

  it("resolves wizard phone without doubling +39", () => {
    expect(resolveBookingPhone("327 015 6225")).toBe("+393270156225");
    expect(resolveBookingPhone("+393270156225")).toBe("+393270156225");
    expect(resolveBookingPhone("+39 327 015 6225")).toBe("+393270156225");
  });

  it("rejects booking without GDPR consent", () => {
    const result = bookingSchema.safeParse({
      serviceIds: ["taglio-pro"],
      barberId: "felice",
      date: "2026-09-01",
      startTime: "09:30",
      firstName: "Mario",
      lastName: "Rossi",
      email: "mario@example.com",
      phone: "+393270156225",
      gdprConsent: false,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a complete booking payload", () => {
    const result = bookingSchema.safeParse({
      serviceIds: ["taglio-pro", "barba-pro"],
      barberId: "anyone",
      date: "2026-09-01",
      startTime: "09:30",
      firstName: "Mario",
      lastName: "Rossi",
      email: "Mario@Example.com",
      phone: "3270156225",
      gdprConsent: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("mario@example.com");
      expect(result.data.phone).toBe("+393270156225");
    }
  });

  it("accepts HTML time inputs that include seconds for walk-in", () => {
    const result = walkInSchema.safeParse({
      serviceIds: ["taglio-standard"],
      barberId: "felice",
      date: "2026-09-01",
      startTime: "09:30:00",
      priceEuro: 15,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.startTime).toBe("09:30");
  });

  it("accepts gestionale login with username or id", () => {
    expect(adminLoginSchema.safeParse({ username: "admin", password: "admin" }).success).toBe(true);
    const asId = adminLoginSchema.safeParse({ id: "admin", password: "admin" });
    expect(asId.success).toBe(true);
    if (asId.success) expect(asId.data.username).toBe("admin");
    expect(adminLoginSchema.safeParse({ password: "admin" }).success).toBe(false);
  });
});
