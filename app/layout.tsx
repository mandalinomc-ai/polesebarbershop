import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import { headers } from "next/headers";
import { SITE, getMapsUrl, IS_COMING_SOON, SITE_DOCUMENT_TITLE } from "@/lib/site-config";
import { isCanonicalHost, requestHost } from "@/lib/canonical-host";
import { loadShopHours, type WeekdayHours } from "@/lib/runtime-shop-hours";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const title = SITE_DOCUMENT_TITLE;
const description = SITE.seo.description;
const ogImage = `${SITE.siteUrl}/assets/images/og-cover.png`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE.siteUrl),
  title,
  description,
  keywords: SITE.seo.keywords,
  authors: [{ name: SITE.brand }],
  robots: { index: true, follow: true, "max-image-preview": "large" },
  alternates: { canonical: SITE.siteUrl },
  openGraph: {
    type: "website",
    locale: "it_IT",
    siteName: SITE.name,
    title,
    description,
    url: SITE.siteUrl,
    images: [{ url: ogImage, alt: `${SITE.name} — ${SITE.brand}` }],
  },
  twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  icons: { icon: "/assets/images/logo-512.png", apple: "/assets/images/logo-512.png" },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FFFFFF",
  colorScheme: "light",
  viewportFit: "cover",
};

const SCHEMA_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function openingHoursSpec(days: WeekdayHours[]) {
  return days
    .filter((d) => !d.isClosed && d.open && d.close)
    .map((d) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: SCHEMA_DAYS[d.weekday],
      opens: d.open,
      closes: d.close,
    }));
}

function jsonLd(days: WeekdayHours[]) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE.siteUrl}#website`,
        url: SITE.siteUrl,
        name: SITE.name,
        description,
        inLanguage: "it-IT",
      },
      {
        "@type": "HairSalon",
        "@id": `${SITE.siteUrl}#business`,
        name: SITE.name,
        telephone: SITE.phone,
        email: SITE.email,
        vatID: SITE.vatNumber,
        taxID: SITE.fiscalCode,
        address: {
          "@type": "PostalAddress",
          streetAddress: SITE.streetAddress,
          addressLocality: SITE.city,
          addressRegion: SITE.province,
          postalCode: SITE.postalCode,
          addressCountry: "IT",
        },
        geo: { "@type": "GeoCoordinates", latitude: SITE.latitude, longitude: SITE.longitude },
        openingHoursSpecification: openingHoursSpec(days),
        sameAs: [SITE.instagram],
        employee: [{ "@type": "Person", name: "Felice" }],
        hasMap: getMapsUrl(),
      },
    ],
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const host = requestHost(await headers());
  const legacyOffline = !isCanonicalHost(host);
  const modeClass =
    IS_COMING_SOON || legacyOffline ? "mode-coming-soon" : "mode-live";
  const hours = await loadShopHours();

  return (
    <html
      lang="it"
      className={`scroll-smooth ${jakarta.variable} ${cormorant.variable} ${modeClass}`}
    >
      <head>
        <script
          id="schema-json"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(hours.days)) }}
        />
      </head>
      <body className="site-white-canvas">{children}</body>
    </html>
  );
}
