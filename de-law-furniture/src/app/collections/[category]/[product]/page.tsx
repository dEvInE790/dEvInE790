import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ChevronRight, Phone } from "lucide-react";
import { ProductGallery } from "@/components/sections/ProductGallery";
import { CustomisationList } from "@/components/sections/CategoryBlock";
import { CustomCTA } from "@/components/sections/CustomCTA";
import { ProductCard } from "@/components/ui/ProductCard";
import { ButtonLink } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { Reveal, Stagger } from "@/components/motion/Reveal";
import { HeroReveal } from "@/components/motion/HeroReveal";
import { categories, findProduct } from "@/lib/catalogue";
import { site, whatsappLink, waMessages } from "@/lib/site";

type Params = { params: Promise<{ category: string; product: string }> };

export function generateStaticParams() {
  return categories.flatMap((c) => c.products.map((p) => ({ category: c.slug, product: p.slug })));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category, product } = await params;
  const found = findProduct(category, product);
  if (!found) return {};
  const { category: c, product: p } = found;
  return {
    title: `${p.name} — ${c.name}`,
    description: `${p.description} Made to order by DE. LAW FURNITURE LTD, Lagos. Request a personalised quotation.`,
    alternates: { canonical: `/collections/${c.slug}/${p.slug}` },
    openGraph: { images: [{ url: p.images[0].src, alt: p.images[0].alt }] },
  };
}

export default async function ProductPage({ params }: Params) {
  const { category, product } = await params;
  const found = findProduct(category, product);
  if (!found) notFound();
  const { category: c, product: p } = found;
  const quoteHref = `/quote?category=${encodeURIComponent(c.name)}&product=${encodeURIComponent(p.name)}`;
  const related = c.products.filter((x) => x.slug !== p.slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    category: c.name,
    image: p.images.map((i) => i.src),
    brand: { "@type": "Brand", name: site.name },
    manufacturer: { "@type": "Organization", name: site.name },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="grain relative bg-espresso pb-20 pt-32 text-ivory md:pb-28 md:pt-40">
        <div className="container-luxe">
          <HeroReveal delay={0.1}>
            <nav aria-label="Breadcrumb" className="mb-10">
              <ol className="flex flex-wrap items-center gap-2 text-[0.7rem] uppercase tracking-[0.2em] text-ivory/55">
                <li><Link href="/" className="hover:text-ivory">Home</Link></li>
                <li aria-hidden><ChevronRight className="h-3 w-3" /></li>
                <li><Link href="/collections" className="hover:text-ivory">Collections</Link></li>
                <li aria-hidden><ChevronRight className="h-3 w-3" /></li>
                <li><Link href={`/collections/${c.slug}`} className="hover:text-ivory">{c.name}</Link></li>
                <li aria-hidden><ChevronRight className="h-3 w-3" /></li>
                <li aria-current="page" className="text-ivory/90">{p.name}</li>
              </ol>
            </nav>
          </HeroReveal>

          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <ProductGallery images={p.images} name={p.name} />
            </div>
            <div className="lg:col-span-5 lg:pt-6">
              <HeroReveal delay={0.3}>
                <p className="eyebrow flex items-center gap-4 text-gold-light">
                  <span className="rule" /> {c.name}
                </p>
                <h1 className="display mt-6 text-5xl md:text-6xl xl:text-7xl">{p.name}</h1>
                <p className="mt-6 text-base leading-relaxed text-ivory/75 md:text-lg">{p.description}</p>
              </HeroReveal>

              <HeroReveal delay={0.5}>
                <ul className="mt-8 space-y-3 border-t border-ivory/10 pt-8">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-ivory/80">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" strokeWidth={1.6} aria-hidden /> {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 border-t border-ivory/10 pt-8">
                  <CustomisationList category={c} tone="dark" />
                </div>
                <div className="mt-8 border border-gold/30 bg-espresso-soft/60 p-5 text-sm leading-relaxed text-ivory/75">
                  <strong className="font-semibold text-gold-light">Pricing:</strong> every piece is made to order, so prices depend on your size, materials, finish and project details. Request a quote and we&apos;ll prepare one for your exact requirements.
                </div>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <ButtonLink href={quoteHref} variant="gold">Request a Quote</ButtonLink>
                  <ButtonLink href={whatsappLink(waMessages.product(p.name, c.name))} variant="outline-light" icon={<WhatsAppIcon className="h-4 w-4" />}>
                    Enquire on WhatsApp
                  </ButtonLink>
                </div>
                <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ivory/55">
                  <Phone className="h-4 w-4" strokeWidth={1.4} aria-hidden /> Prefer to call?
                  {site.phones.map((ph, i) => (
                    <span key={ph.tel}>
                      <a href={`tel:${ph.tel}`} className="link-underline text-ivory/80">{ph.display}</a>
                      {i < site.phones.length - 1 && " ·"}
                    </span>
                  ))}
                </p>
              </HeroReveal>
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="bg-ivory py-24 md:py-32" aria-labelledby="related-title">
          <div className="container-luxe">
            <Reveal className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <h2 id="related-title" className="display text-4xl text-espresso md:text-6xl">More {c.name.toLowerCase()}</h2>
              <Link href={`/collections/${c.slug}`} className="link-underline pb-1 text-xs font-semibold uppercase tracking-[0.22em] text-espresso">
                View the full collection
              </Link>
            </Reveal>
            <Stagger className="mt-14 grid gap-x-6 gap-y-14 sm:grid-cols-2" stagger={0.14}>
              {related.map((r) => (
                <ProductCard key={r.slug} product={r} category={c} index={c.products.indexOf(r)} />
              ))}
            </Stagger>
          </div>
        </section>
      )}

      <CustomCTA />
    </>
  );
}
