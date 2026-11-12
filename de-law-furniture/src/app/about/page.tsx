import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { ClipImage } from "@/components/motion/ClipImage";
import { Parallax } from "@/components/motion/Parallax";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { SplitText } from "@/components/motion/SplitText";
import { Craftsmanship } from "@/components/sections/Craftsmanship";
import { Services } from "@/components/sections/Services";
import { WhyChoose } from "@/components/sections/WhyChoose";
import { CustomCTA } from "@/components/sections/CustomCTA";
import { Marquee } from "@/components/ui/Marquee";
import { images } from "@/lib/images";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About Us — Furniture Makers Since 2015",
  description:
    "Established on 10 January 2015 in Egbe, Lagos, DE. LAW FURNITURE LTD manufactures and furnishes all kinds of interior and exterior furniture using premium wood, fabrics and plywood — with delivery and installation.",
  alternates: { canonical: "/about" },
};

const facts = [
  { value: "2015", label: "Established 10 January" },
  { value: "09", label: "Furniture collections" },
  { value: "03", label: "Core materials — wood, fabric & plywood" },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About Us"
        title={["Made with care.", "Built to last."]}
        image={images.livingLounge}
        crumbs={[{ href: "/", label: "Home" }, { href: "/about", label: "About" }]}
        intro={`${site.name} is a furniture manufacturing and furnishing company specialising in all kinds of interior and exterior furniture designs.`}
      />

      {/* Story */}
      <section className="bg-ivory py-28 md:py-40" aria-labelledby="story-title">
        <div className="container-luxe grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Reveal y={16}>
              <p className="eyebrow mb-6 flex items-center gap-4 text-gold-deep">
                <span className="rule" /> Our Story
              </p>
            </Reveal>
            <SplitText id="story-title" lines={["Since", "10 January 2015."]} className="display text-5xl text-espresso md:text-7xl" />
            <Parallax speed={40} className="mt-14 hidden lg:block">
              <ClipImage image={images.workshop} className="aspect-[3/4] w-4/5" sizes="35vw" from="left" />
            </Parallax>
          </div>
          <div className="space-y-8 text-base leading-relaxed text-taupe md:text-lg lg:col-span-6 lg:col-start-7 lg:pt-24">
            <Reveal>
              <p className="display text-3xl leading-snug text-espresso md:text-4xl">
                We believe furniture should be made for the people who use it — sized for their spaces, finished to their taste and built to serve them for years.
              </p>
            </Reveal>
            <Reveal>
              <p>
                {site.name} was established on {site.establishedLabel} and operates from {site.address.line1}, {site.address.line2}, {site.address.city}. We manufacture and sell furniture, and furnish interior and exterior spaces for homes and businesses.
              </p>
            </Reveal>
            <Reveal>
              <p>
                Our work spans sofas, kitchen cabinets, bed frames, wardrobes, dining sets, TV consoles and office furniture, as well as window blinds and curtains that complete a room. Because every project is different, we make to order — and we prepare a personalised quotation for each customer based on their requirements, specifications, materials and project details.
              </p>
            </Reveal>
            <Reveal>
              <p>
                We are committed to delivering quality craftsmanship. That commitment starts with sourcing excellent materials — premium wood, fabrics and plywood — so that every project meets high standards of quality and durability, and ends with careful delivery and installation by our team.
              </p>
            </Reveal>
            <Reveal className="lg:hidden">
              <ClipImage image={images.workshop} className="aspect-[4/3] w-full" />
            </Reveal>
          </div>
        </div>

        <div className="container-luxe mt-24 md:mt-32">
          <Stagger className="grid gap-px bg-espresso/10 sm:grid-cols-3">
            {facts.map((f) => (
              <StaggerItem key={f.label} className="bg-ivory p-6 md:p-10">
                <p className="display text-4xl text-espresso md:text-6xl">{f.value}</p>
                <p className="eyebrow mt-4 text-taupe">{f.label}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Editorial image band */}
      <section className="grid gap-4 bg-ivory px-4 pb-4 md:grid-cols-3 md:gap-6 md:px-6 md:pb-6" aria-label="Our work">
        <ClipImage image={images.kitchenWhite} className="aspect-[4/5] md:col-span-1" sizes="(min-width: 768px) 33vw, 100vw" from="bottom" />
        <ClipImage image={images.livingBright} className="aspect-[4/5] md:col-span-2 md:aspect-auto" sizes="(min-width: 768px) 66vw, 100vw" from="right" delay={0.1} />
      </section>

      <Craftsmanship />
      <Marquee items={["Premium Wood", "Quality Fabrics", "Durable Plywood", "Expert Finishing", "Delivery & Installation"]} className="border-y border-espresso/10 bg-ivory text-espresso/80" />
      <Services />
      <WhyChoose />
      <CustomCTA />
    </>
  );
}
