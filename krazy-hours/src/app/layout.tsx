import type { Metadata, Viewport } from "next";
import { Anton, JetBrains_Mono, Rubik_Wet_Paint, Space_Grotesk } from "next/font/google";
import "./globals.css";

const graffiti = Rubik_Wet_Paint({ weight: "400", subsets: ["latin"], variable: "--font-graffiti", display: "swap" });
const display = Anton({ weight: "400", subsets: ["latin"], variable: "--font-display", display: "swap" });
const sans = Space_Grotesk({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "KRAZY HOURS — Apartment Party · Dec 17 · Only 35 People",
  description:
    "TribeWave Records × Motion Boys Squad present KRAZY HOURS — an apartment party in Isheri, Lagos. December 17, 10 PM – 5 AM. Only 35 people allowed. Register now.",
  openGraph: {
    title: "KRAZY HOURS — Apartment Party",
    description: "Dec 17 · 10 PM – 5 AM · Isheri, Lagos · Only 35 people allowed.",
    type: "website",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "KRAZY HOURS apartment party" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.jpg"] },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${graffiti.variable} ${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="font-sans">
        {children}
        <div className="grain" aria-hidden />
      </body>
    </html>
  );
}
