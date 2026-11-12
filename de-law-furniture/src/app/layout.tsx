import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/site";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG" className={`${cormorant.variable} ${manrope.variable}`}>
      <body>
        <noscript>
          {/* Without JavaScript, skip the intro and show every animated element in its final state. */}
          <style>{`#intro-loader{display:none!important}[style*="opacity:0"],[style*="clip-path"],[style*="transform"]{opacity:1!important;clip-path:none!important;transform:none!important}`}</style>
        </noscript>
        {children}
      </body>
    </html>
  );
}
