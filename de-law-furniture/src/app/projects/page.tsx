import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHero } from "@/components/ui/PageHero";
import { ProjectGallery } from "@/components/sections/ProjectGallery";
import { CustomCTA } from "@/components/sections/CustomCTA";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PlaceholderNote } from "@/components/ui/PlaceholderNote";
import { images } from "@/lib/images";

export const metadata: Metadata = {
  title: "Our Projects — Furniture & Furnishing Portfolio",
  description:
    "Recent furniture made by DE. LAW FURNITURE LTD in Lagos — channel-tufted sofa sets, chaise lounges, upholstered bed frames, wardrobes and TV wall units.",
  alternates: { canonical: "/projects" },
};

export default function ProjectsPage() {
  return (
    <>
      <PageHero
        eyebrow="Our Projects"
        title={["Spaces,", "transformed."]}
        image={images.hero}
        crumbs={[{ href: "/", label: "Home" }, { href: "/projects", label: "Projects" }]}
        intro="Recent furniture made by DE. LAW FURNITURE LTD — sofas, beds, wardrobes and TV wall units."
      />
      <section className="bg-ivory py-20 md:py-28" aria-label="Project gallery">
        <div className="container-luxe">
          <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <SectionHeading eyebrow="Portfolio" title={["Browse by space"]} />
            <PlaceholderNote className="max-w-sm md:text-right" />
          </div>
          <Suspense fallback={<div className="h-[60vh]" />}>
            <ProjectGallery />
          </Suspense>
        </div>
      </section>
      <CustomCTA title={["Imagine your space", "finished by DE. LAW."]} />
    </>
  );
}
