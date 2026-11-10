/** Production site — only this host serves the full booking experience. */
export const CANONICAL_SITE_HOST = "felicepolesebarbershop.it";
export const CANONICAL_SITE_URL = `https://${CANONICAL_SITE_HOST}`;

/**
 * True when this request should show the live site (not the legacy offline gate).
 * Localhost stays live for development.
 */
export function isCanonicalHost(hostHeader: string | null | undefined): boolean {
  const host = String(hostHeader || "")
    .split(",")[0]
    ?.trim()
    .toLowerCase()
    .split(":")[0];
  if (!host) return false;
  if (host === "localhost" || host === "127.0.0.1") return true;
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
