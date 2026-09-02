import { describe, expect, it } from "vitest";
import {
  isSinchWhatsAppConfigured,
  isWhatsAppConfigured,
  sendCustomerWhatsApp,
  sendSalonWhatsApp,
} from "./whatsapp-outbound";
import { getSalonNotifyWhatsApp, PUBLIC_CONTACT_WHATSAPP } from "./site-config";

describe("automatic WhatsApp (no wa.me)", () => {
  it("skips when Business API credentials are missing", async () => {
    expect(isWhatsAppConfigured()).toBe(false);
    expect(isSinchWhatsAppConfigured()).toBe(false);
    const result = await sendCustomerWhatsApp("+393331112233", "Ciao, prenotazione confermata.");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.skipped).toBe(true);
  });

  it("sends salon alerts to official 327 number, never to the old 351 number", async () => {
    expect(getSalonNotifyWhatsApp()).toBe("+393270156225");
    expect(getSalonNotifyWhatsApp()).not.toBe("+393512523087");
    expect(PUBLIC_CONTACT_WHATSAPP).toBe("+393270156225");
    const salon = await sendSalonWhatsApp("NUOVA PRENOTAZIONE");
    expect(salon.ok).toBe(false);
    if (!salon.ok) expect(salon.skipped).toBe(true);
  });
});
