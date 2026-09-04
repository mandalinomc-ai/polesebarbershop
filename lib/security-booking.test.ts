import { describe, expect, it } from "vitest";
import { bookingSchema } from "./validations";

describe("booking honeypot + validation", () => {
  const base = {
    serviceIds: ["taglio-pro"],
    barberId: "felice",
    date: "2026-09-08",
    startTime: "09:30",
    firstName: "Mario",
    lastName: "Rossi",
    email: "mario@example.com",
    phone: "+393331112233",
    gdprConsent: true as const,
  };

  it("accepts empty honeypot website field", () => {
    const parsed = bookingSchema.safeParse({ ...base, website: "" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.website).toBe("");
  });

  it("accepts omitted honeypot (defaults empty)", () => {
    const parsed = bookingSchema.safeParse(base);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.website).toBe("");
  });

  it("still requires GDPR consent", () => {
    const parsed = bookingSchema.safeParse({ ...base, gdprConsent: false });
    expect(parsed.success).toBe(false);
  });
});
