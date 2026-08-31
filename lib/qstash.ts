import { Client } from "@upstash/qstash";
import { getSiteUrl } from "./site-config";

export function getQStash(): Client | null {
  if (!process.env.QSTASH_TOKEN) return null;
  return new Client({ token: process.env.QSTASH_TOKEN });
}

export async function scheduleWhatsAppReminder(opts: {
  appointmentId: string;
  manageToken: string;
  startsAt: Date;
}): Promise<{ messageId?: string; skipped?: boolean }> {
  const client = getQStash();
  if (!client) return { skipped: true };
  const notBefore = Math.floor(opts.startsAt.getTime() / 1000) - 30 * 60;
  const now = Math.floor(Date.now() / 1000);
  if (notBefore <= now) return { skipped: true };
  const url = `${getSiteUrl()}/api/cron/whatsapp-reminder`;
  const result = await client.publishJSON({
    url,
    body: {
      appointmentId: opts.appointmentId,
      manageToken: opts.manageToken,
    },
    notBefore,
    retries: 3,
  });
  return { messageId: result.messageId };
}

export async function cancelScheduledReminder(
  messageId: string | null | undefined,
): Promise<void> {
  if (!messageId) return;
  const client = getQStash();
  if (!client) return;
  try {
    await client.messages.delete(messageId);
  } catch {
    // ignore
  }
}
