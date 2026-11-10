import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import {
  CANONICAL_SITE_URL,
  isCanonicalHost,
  requestHost,
} from "@/lib/canonical-host";

/**
 * Canonical (.it): allow public pages, point sitemap at .it only.
 * Any other host (vercel.app, IP, previews): disallow all + no sitemap.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = requestHost(await headers());

  if (!isCanonicalHost(host)) {
    return {
      rules: [
        {
          userAgent: "*",
          disallow: "/",
        },
      ],
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/gestionale", "/admin", "/api/admin"],
      },
    ],
    sitemap: `${CANONICAL_SITE_URL}/sitemap.xml`,
  };
}
