import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/ui/PageHero";
import { ButtonLink } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { CategoryBlock } from "@/components/sections/CategoryBlock";
import { CustomCTA } from "@/components/sections/CustomCTA";
import { Reveal } from "@/components/motion/Reveal";
import { getCatalogue, getCategory } from "@/lib/content";
import { whatsappLink, waMessages } from "@/lib/site";

type Params = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category } = await params;
  const c = await getCategory(category);
  if (!c) return {};
  return {
    title: `${c.name} — Made to Order in Lagos`,
    description: `${c.intro} Custom ${c.name.toLowerCase()} by DE. LAW FURNITURE LTD, Egbe, Lagos. Request a personalised quotation.`,
    alternates: { canonical: `/collections/${c.slug}` },
    openGraph: c.cover.src ? { images: [{ url: c.cover.src, alt: c.cover.alt }] } : undefined,
  };
}

export default async function CategoryPage({ params }: Params) {
  const { category } = await params;
  const categories = await getCatalogue();
  const c = categories.find((x) => x.slug === category);
  if (!c) notFound();
  const idx = categories.findIndex((x) => x.slug === c.slug);
  const next = categories[(idx + 1) % categories.length];
  const prev = categories[(idx - 1 + categories.length) % categories.length];

  return (
    <>
      <PageHero
        eyebrow={`Collection ${c.index}`}
        title={[c.name]}
        image={c.cover}
        intro={c.intro}
        crumbs={[
          { href: "/", label: "Home" },
          { href: "/collections", label: "Collections" },
          { href: `/collections/${c.slug}`, label: c.name },
        ]}
      >
        <div className="flex flex-wrap gap-3">
          <ButtonLink href={`/quote?category=${encodeURIComponent(c.name)}`} variant="gold">Request a Quote</ButtonLink>
          <ButtonLink href={whatsappLink(waMessages.category(c.name))} variant="outline-light" icon={<WhatsAppIcon className="h-4 w-4" />}>
            Enquire on WhatsApp
          </ButtonLink>
        </div>
      </PageHero>

      <div className="container-luxe">
        <CategoryBlock category={c} showLink={false} />
      </div>

      <nav aria-label="More collections" className="border-t border-espresso/10 bg-cream">
        <div className="container-luxe grid sm:grid-cols-2">
          {[
            { c: prev, label: "Previous collection", align: "" },
            { c: next, label: "Next collection", align: "sm:text-right sm:border-l border-espresso/10" },
          ].map(({ c: item, label, align }) => (
            <Reveal key={label}>
              <Link href={`/collections/${item.slug}`} className={`group block py-14 sm:px-8 ${align}`}>
                <span className="eyebrow text-taupe">{label}</span>
                <span className="display mt-3 block text-4xl text-espresso transition-colors group-hover:text-gold-deep md:text-5xl">{item.name}</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </nav>

      <CustomCTA image={c.products[0]?.images[1] ?? c.cover} title={[`Your ${c.singular.toLowerCase()},`, "your way."]} />
    </>
  );
}
