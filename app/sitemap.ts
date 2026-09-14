import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-config";

/** Dynamic sitemap — host follows env; includes all public legal + booking routes. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const lastModified = new Date();
  return [
    { url: `${base}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/prenota`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/privacy-policy`, lastModified, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/cookie-policy`, lastModified, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/terms`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
