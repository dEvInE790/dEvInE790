import { HomeHero } from "@/components/sections/HomeHero";
import { HomeAbout } from "@/components/sections/HomeAbout";
import { FeaturedCollections } from "@/components/sections/FeaturedCollections";
import { WhyChoose } from "@/components/sections/WhyChoose";
import { Craftsmanship } from "@/components/sections/Craftsmanship";
import { FeaturedProjects } from "@/components/sections/FeaturedProjects";
import { CustomCTA } from "@/components/sections/CustomCTA";
import { Testimonials } from "@/components/sections/Testimonials";
import { ContactSection } from "@/components/sections/ContactSection";
import { Marquee } from "@/components/ui/Marquee";
import { getCatalogue, getProjects, getTestimonials } from "@/lib/content";

export default async function HomePage() {
  const [categories, projects, testimonials] = await Promise.all([getCatalogue(), getProjects(), getTestimonials()]);
  return (
    <>
      <HomeHero />
      <HomeAbout />
      <FeaturedCollections categories={categories} />
      <Marquee items={categories.map((c) => c.name)} className="border-y border-espresso/10 bg-ivory text-espresso/80" />
      <WhyChoose />
      <Craftsmanship />
      <FeaturedProjects projects={projects.slice(0, 5)} />
      <CustomCTA />
      <Testimonials testimonials={testimonials} />
      <ContactSection />
    </>
  );
}
