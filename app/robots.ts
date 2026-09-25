import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-config";

/** Dynamic robots — always matches NEXT_PUBLIC_SITE_URL / SITE.siteUrl (VPS .it). */
export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/gestionale", "/admin", "/api/admin"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
