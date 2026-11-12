import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { CategoryBlock } from "@/components/sections/CategoryBlock";
import { CategoryNav } from "@/components/sections/CategoryNav";
import { CustomCTA } from "@/components/sections/CustomCTA";
import { ButtonLink } from "@/components/ui/Button";
import { categories } from "@/lib/catalogue";
import { images } from "@/lib/images";

export const metadata: Metadata = {
  title: "Our Collections — Sofas, Kitchens, Beds, Wardrobes & More",
  description:
    "Browse DE. LAW FURNITURE LTD's nine furniture collections: sofas, kitchen cabinets, bed frames, window blinds, curtains, wardrobes, dining sets, TV consoles and office furniture. Made to order and quoted to your specification.",
  alternates: { canonical: "/collections" },
};

export default function CollectionsPage() {
  return (
    <>
      <PageHero
        eyebrow="Our Collections"
        title={["Furniture,", "made to measure."]}
        image={images.livingNeutral}
        crumbs={[{ href: "/", label: "Home" }, { href: "/collections", label: "Collections" }]}
        intro="Nine collections, each made to order in premium wood, fabrics and plywood. Choose a design, tell us how you'd like it — and we'll prepare a quotation for your exact requirements."
      >
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="#sofas" variant="gold" icon={false}>Browse the catalogue</ButtonLink>
          <ButtonLink href="/quote" variant="outline-light">Customise your furniture</ButtonLink>
        </div>
      </PageHero>
      <CategoryNav />
      <div className="container-luxe pb-10">
        {categories.map((c) => (
          <CategoryBlock key={c.slug} category={c} />
        ))}
      </div>
      <CustomCTA />
    </>
  );
}
