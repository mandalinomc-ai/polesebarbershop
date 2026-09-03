import { SITE } from "./site-config";

const FORMSUBMIT_HOST = ["formsubmit", "co"].join(".");

export function salonFormSubmitAjaxUrl(to: string = SITE.email): string {
  return `https://${FORMSUBMIT_HOST}/ajax/${encodeURIComponent(to.trim().toLowerCase())}`;
}

export function salonFormSubmitAction(to: string = SITE.email): string {
  return `https://${FORMSUBMIT_HOST}/${encodeURIComponent(to.trim().toLowerCase())}`;
}

export type SalonRelayPayload = {
  to?: string;
  subject: string;
  message: string;
};

/** Browser-side POST so Cloudflare is less likely to block Vercel IPs. */
export async function postSalonBookingRelay(payload: SalonRelayPayload): Promise<boolean> {
  const to = payload.to?.trim() || SITE.email;
  try {
    const res = await fetch(salonFormSubmitAjaxUrl(to), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        _subject: payload.subject,
        _template: "box",
        _captcha: "false",
        message: payload.message,
      }),
    });
    if (res.ok) return true;
  } catch {
    /* fall through to hidden form */
  }
  return postSalonBookingRelayForm(payload);
}

function postSalonBookingRelayForm(payload: SalonRelayPayload): boolean {
  if (typeof document === "undefined") return false;
  const to = payload.to?.trim() || SITE.email;
  const iframeName = "salon-relay-frame";
  let iframe = document.getElementById(iframeName) as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = iframeName;
    iframe.name = iframeName;
    iframe.title = "Avviso salone";
    iframe.style.display = "none";
    document.body.appendChild(iframe);
  }
  const form = document.createElement("form");
  form.method = "POST";
  form.action = salonFormSubmitAction(to);
  form.target = iframeName;
  form.style.display = "none";
  const fields: Record<string, string> = {
    _subject: payload.subject,
    _template: "box",
    _captcha: "false",
    message: payload.message,
  };
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
  window.setTimeout(() => form.remove(), 4000);
  return true;
}
