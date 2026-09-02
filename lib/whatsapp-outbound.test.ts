import { describe, expect, it } from "vitest";
import { isSinchWhatsAppConfigured, sendCustomerWhatsApp } from "./whatsapp-outbound";

describe("optional Sinch WhatsApp", () => {
  it("skips when Conversation API credentials are missing", async () => {
    expect(isSinchWhatsAppConfigured()).toBe(false);
    const result = await sendCustomerWhatsApp("+393331112233", "Ciao, prenotazione confermata.");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.skipped).toBe(true);
  });
});
