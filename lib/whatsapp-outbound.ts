import { normalizeWhatsAppNumber } from "./phone";

export type WhatsAppSendResult =
  | { ok: true; skipped?: boolean; id?: string }
  | { ok: false; skipped?: boolean; error: string };

function env(name: string): string {
  return process.env[name]?.trim() || "";
}

export function isSinchWhatsAppConfigured(): boolean {
  const appId = env("CONVERSATION_APP_ID") || env("SINCH_CONVERSATION_APP_ID");
  const projectId = env("SINCH_PROJECT_ID") || env("PROJECT_ID");
  const keyId = env("SINCH_KEY_ID") || env("KEY_ID");
  const keySecret = env("SINCH_KEY_SECRET") || env("KEY_SECRET");
  return Boolean(appId && projectId && keyId && keySecret);
}

/**
 * Server-side WhatsApp to an arbitrary customer number.
 * Requires Sinch Conversation API credentials (WhatsApp channel on the app).
 */
export async function sendCustomerWhatsApp(
  phone: string,
  text: string,
): Promise<WhatsAppSendResult> {
  const appId = env("CONVERSATION_APP_ID") || env("SINCH_CONVERSATION_APP_ID");
  const projectId = env("SINCH_PROJECT_ID") || env("PROJECT_ID");
  const keyId = env("SINCH_KEY_ID") || env("KEY_ID");
  const keySecret = env("SINCH_KEY_SECRET") || env("KEY_SECRET");
  const region = (env("CONVERSATION_REGION") || env("SINCH_REGION") || "eu").toLowerCase();
  if (!appId || !projectId || !keyId || !keySecret) {
    return { ok: false, skipped: true, error: "WhatsApp Business non configurato." };
  }
  const e164 = normalizeWhatsAppNumber(phone);
  if (!e164) return { ok: false, error: "Numero cliente non valido." };

  const host = `${region}.conversation.api.sinch.com`;
  const url = `https://${host}/v1/projects/${projectId}/messages:send`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_id: appId,
        recipient: {
          identified_by: {
            channel_identities: [{ channel: "WHATSAPP", identity: e164 }],
          },
        },
        channel_priority_order: ["WHATSAPP"],
        message: { text_message: { text } },
      }),
    });
    const raw = await res.text();
    if (!res.ok) {
      return { ok: false, error: raw.slice(0, 240) || `WhatsApp HTTP ${res.status}` };
    }
    let id: string | undefined;
    try {
      id = (JSON.parse(raw) as { message_id?: string }).message_id;
    } catch {
      /* ignore */
    }
    return { ok: true, id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invio WhatsApp fallito";
    return { ok: false, error: message };
  }
}
