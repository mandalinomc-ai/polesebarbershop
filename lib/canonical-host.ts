/** Production site — only this host serves the full booking experience. */
export const CANONICAL_SITE_HOST = "felicepolesebarbershop.it";
export const CANONICAL_SITE_URL = `https://${CANONICAL_SITE_HOST}`;

/** Loopback / Docker bind hosts — Next image optimizer fetches via HOSTNAME=0.0.0.0. */
const INTERNAL_LIVE_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
]);

/** Strip port; keep IPv6 ([::1]:3000 → ::1) intact. */
function normalizeHostName(hostHeader: string | null | undefined): string {
  const raw = String(hostHeader || "")
    .split(",")[0]
    ?.trim()
    .toLowerCase();
  if (!raw) return "";
  if (raw.startsWith("[")) {
    const end = raw.indexOf("]");
    if (end !== -1) return raw.slice(1, end);
  }
  // hostname or IPv4, optional :port — do not split bare IPv6 on ":"
  if (raw.includes(".") || !raw.includes(":")) return raw.split(":")[0] || "";
  return raw;
}

/**
 * True when this request should show the live site (not the legacy offline gate).
 * Localhost / Docker bind addresses stay live so `/_next/image` can read public assets
 * (middleware must not 308 those internal fetches to the public .it URL).
 */
export function isCanonicalHost(hostHeader: string | null | undefined): boolean {
  const host = normalizeHostName(hostHeader);
  if (!host) return false;
  if (INTERNAL_LIVE_HOSTS.has(host)) return true;
  return host === CANONICAL_SITE_HOST || host === `www.${CANONICAL_SITE_HOST}`;
}

/** Prefer x-forwarded-host behind proxies (Vercel / nginx). */
export function requestHost(
  headersLike: { get(name: string): string | null },
): string {
  return (
    headersLike.get("x-forwarded-host") ||
    headersLike.get("host") ||
    ""
  );
}
