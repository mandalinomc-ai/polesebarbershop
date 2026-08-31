import { afterEach, describe, expect, it } from "vitest";
import { RESEND_MISSING_IT, sendEmail } from "./email";

describe("sendEmail without Resend", () => {
  const orig = process.env.RESEND_API_KEY;

  afterEach(() => {
    if (orig === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = orig;
  });

  it("degrades cleanly when RESEND_API_KEY is missing", async () => {
    delete process.env.RESEND_API_KEY;
    const result = await sendEmail({
      to: "mario@example.com",
      subject: "test",
      html: "<p>test</p>",
    });
    expect(result.ok).toBe(false);
    expect(result.skipped).toBe(true);
    if (!result.ok) expect(result.error).toBe(RESEND_MISSING_IT);
  });
});
