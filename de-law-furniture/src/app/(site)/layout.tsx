import { site } from "@/lib/site";
import { jsonLdString } from "@/lib/json-ld";
import { getCatalogue, getCatalogueIndex } from "@/lib/content";
import { Providers } from "@/components/providers/Providers";
import { Loader } from "@/components/layout/Loader";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFloat } from "@/components/layout/WhatsAppFloat";

// Content comes from the database and can change at any time from /admin.
export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [catalogue, catalogueIndex] = await Promise.all([getCatalogue(), getCatalogueIndex()]);

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
      itemListElement: catalogue.map((c) => ({ "@type": "OfferCatalog", name: c.name, url: `${site.url}/collections/${c.slug}` })),
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <a href="#main" className="sr-only z-[200] bg-espresso px-4 py-3 text-ivory focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <Providers>
        <Loader />
        <Header catalogue={catalogueIndex} />
        <main id="main">{children}</main>
        <Footer catalogue={catalogueIndex} />
        <WhatsAppFloat catalogue={catalogueIndex} />
      </Providers>
    </>
  );
}
