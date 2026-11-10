import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import {
  CANONICAL_SITE_URL,
  isCanonicalHost,
  requestHost,
} from "@/lib/canonical-host";

/**
 * Sitemap always lists only https://felicepolesebarbershop.it URLs.
 * Non-.it hosts return an empty set (and middleware 308s the request away).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = requestHost(await headers());
  if (!isCanonicalHost(host)) {
    return [];
  }

  const base = CANONICAL_SITE_URL;
  const lastModified = new Date();
  return [
    { url: `${base}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    {
      url: `${base}/prenota`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${base}/privacy-policy`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${base}/cookie-policy`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${base}/terms`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
