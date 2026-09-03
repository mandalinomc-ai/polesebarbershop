import { normalizeWhatsAppNumber } from "./phone";
import { getSalonNotifyWhatsApp } from "./site-config";

export type WhatsAppSendResult =
  | { ok: true; skipped?: boolean; id?: string; provider?: string }
  | { ok: false; skipped?: boolean; error: string };

function env(name: string): string {
  return process.env[name]?.trim() || "";
}

function isSinchConfigured(): boolean {
  const appId = env("CONVERSATION_APP_ID") || env("SINCH_CONVERSATION_APP_ID");
  const projectId = env("SINCH_PROJECT_ID") || env("PROJECT_ID");
  const keyId = env("SINCH_KEY_ID") || env("KEY_ID");
  const keySecret = env("SINCH_KEY_SECRET") || env("KEY_SECRET");
  return Boolean(appId && projectId && keyId && keySecret);
}

function isMetaConfigured(): boolean {
  return Boolean(env("WHATSAPP_TOKEN") && env("WHATSAPP_PHONE_NUMBER_ID"));
}

/** True when the server can send WhatsApp by itself (no wa.me click). */
export function isWhatsAppConfigured(): boolean {
  return isMetaConfigured() || isSinchConfigured();
}

/** @deprecated use isWhatsAppConfigured */
export function isSinchWhatsAppConfigured(): boolean {
  return isWhatsAppConfigured();
}

async function sendViaMeta(e164: string, text: string): Promise<WhatsAppSendResult> {
  const token = env("WHATSAPP_TOKEN");
  const phoneId = env("WHATSAPP_PHONE_NUMBER_ID");
  if (!token || !phoneId) {
    return { ok: false, skipped: true, error: "WhatsApp Meta non configurato." };
  }
  const to = e164.replace(/\D/g, "");
  const template = env("WHATSAPP_TEMPLATE_NAME");
  const language = env("WHATSAPP_TEMPLATE_LANGUAGE") || "it";
  const payload = template
    ? {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: { name: template, language: { code: language } },
      }
    : {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { preview_url: false, body: text },
      };
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const raw = await res.text();
  if (!res.ok) {
    return { ok: false, error: raw.slice(0, 240) || `WhatsApp Meta HTTP ${res.status}` };
  }
  let id: string | undefined;
  try {
    id = (JSON.parse(raw) as { messages?: { id?: string }[] }).messages?.[0]?.id;
  } catch {
    /* ignore */
  }
  return { ok: true, id, provider: "meta" };
}

async function sendViaSinch(e164: string, text: string): Promise<WhatsAppSendResult> {
  const appId = env("CONVERSATION_APP_ID") || env("SINCH_CONVERSATION_APP_ID");
  const projectId = env("SINCH_PROJECT_ID") || env("PROJECT_ID");
  const keyId = env("SINCH_KEY_ID") || env("KEY_ID");
  const keySecret = env("SINCH_KEY_SECRET") || env("KEY_SECRET");
  const region = (env("CONVERSATION_REGION") || env("SINCH_REGION") || "eu").toLowerCase();
  if (!appId || !projectId || !keyId || !keySecret) {
    return { ok: false, skipped: true, error: "WhatsApp Business non configurato." };
  }
  const host = `${region}.conversation.api.sinch.com`;
  const url = `https://${host}/v1/projects/${projectId}/messages:send`;
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
  return { ok: true, id, provider: "sinch" };
}

/**
 * Server-side WhatsApp to any E.164 number. Never opens wa.me.
 */
export async function sendWhatsApp(phone: string, text: string): Promise<WhatsAppSendResult> {
  const e164 = normalizeWhatsAppNumber(phone);
  if (!e164) return { ok: false, error: "Numero non valido." };
  if (!isWhatsAppConfigured()) {
    return { ok: false, skipped: true, error: "WhatsApp Business non configurato." };
  }
  try {
    if (isMetaConfigured()) {
      const meta = await sendViaMeta(e164, text);
      if (meta.ok || !meta.skipped) return meta;
    }
    return await sendViaSinch(e164, text);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invio WhatsApp fallito";
    return { ok: false, error: message };
  }
}

export async function sendCustomerWhatsApp(phone: string, text: string): Promise<WhatsAppSendResult> {
  return sendWhatsApp(phone, text);
}

export async function sendSalonWhatsApp(text: string): Promise<WhatsAppSendResult> {
  return sendWhatsApp(getSalonNotifyWhatsApp(), text);
}
