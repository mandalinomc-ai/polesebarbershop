import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { SITE, getMapsUrl } from "@/lib/site-config";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const title = `${SITE.name} — ${SITE.tagline} | ${SITE.city}`;
const description = SITE.seo.description;
const ogImage = `${SITE.siteUrl}/assets/images/hero-bg.jpg`;

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
  themeColor: "#0B0B0B",
  colorScheme: "dark",
  viewportFit: "cover",
};

function jsonLd() {
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
        openingHoursSpecification: [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            opens: "09:30",
            closes: "20:00",
          },
        ],
        sameAs: [SITE.instagram],
        employee: [
          { "@type": "Person", name: "Felice" },
          { "@type": "Person", name: "Davide" },
        ],
        hasMap: getMapsUrl(),
      },
    ],
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`scroll-smooth ${inter.variable} ${cormorant.variable} is-live`}>
      <head>
        <script
          id="schema-json"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }}
        />
      </head>
      <body className="mode-live">{children}</body>
    </html>
  );
}
