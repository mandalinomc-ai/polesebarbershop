import { describe, expect, it } from "vitest";
import { bookingSchema } from "./validations";
import { normalizeItalianPhone } from "./phone";

describe("phone + booking validation", () => {
  it("normalises Italian mobiles to +39", () => {
    expect(normalizeItalianPhone("327 015 6225")).toBe("+393270156225");
    expect(normalizeItalianPhone("+39 327 015 6225")).toBe("+393270156225");
    expect(normalizeItalianPhone("03270156225")).toBe("+393270156225");
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
});
