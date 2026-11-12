import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/site";
import { categories } from "@/lib/catalogue";
import { Providers } from "@/components/providers/Providers";
import { Loader } from "@/components/layout/Loader";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFloat } from "@/components/layout/WhatsAppFloat";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} | Custom Furniture Manufacturer in Lagos`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  keywords: [
    "furniture Lagos",
    "custom furniture Nigeria",
    "furniture manufacturer Lagos",
    "sofas Lagos",
    "kitchen cabinets Lagos",
    "wardrobes Lagos",
    "bed frames",
    "dining sets",
    "TV consoles",
    "office furniture Lagos",
    "window blinds Lagos",
    "curtains Lagos",
    "interior furnishing",
    "Egbe Lagos furniture",
  ],
  openGraph: {
    type: "website",
    locale: "en_NG",
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: `${site.name} — ${site.tagline}`, description: site.description },
  alternates: { canonical: "/" },
  formatDetection: { telephone: true, address: true },
};

export const viewport: Viewport = {
  themeColor: "#2a1d15",
  width: "device-width",
  initialScale: 1,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FurnitureStore",
  name: site.name,
  slogan: site.tagline,
  description: site.description,
  url: site.url,
  foundingDate: site.established,
  telephone: site.phones.map((p) => p.tel),
  address: {
    "@type": "PostalAddress",
    streetAddress: `${site.address.line1}, ${site.address.line2}`,
    addressLocality: site.address.city,
    addressRegion: "Lagos",
    addressCountry: "NG",
  },
  openingHoursSpecification: [{ "@type": "OpeningHoursSpecification", opens: site.hours.opens, closes: site.hours.closes }],
  priceRange: "Quoted on request",
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Furniture collections",
    itemListElement: categories.map((c) => ({ "@type": "OfferCatalog", name: c.name, url: `${site.url}/collections/${c.slug}` })),
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG" className={`${cormorant.variable} ${manrope.variable}`}>
      <body>
        <noscript>
          {/* Without JavaScript, skip the intro and show every animated element in its final state. */}
          <style>{`#intro-loader{display:none!important}[style*="opacity:0"],[style*="clip-path"],[style*="transform"]{opacity:1!important;clip-path:none!important;transform:none!important}`}</style>
        </noscript>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <a href="#main" className="sr-only z-[200] bg-espresso px-4 py-3 text-ivory focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
          Skip to content
        </a>
        <Providers>
          <Loader />
          <Header />
          <main id="main">{children}</main>
          <Footer />
          <WhatsAppFloat />
        </Providers>
      </body>
    </html>
  );
}
