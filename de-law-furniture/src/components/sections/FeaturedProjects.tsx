import Link from "next/link";
import { ClipImage } from "@/components/motion/ClipImage";
import { Parallax } from "@/components/motion/Parallax";
import { Reveal } from "@/components/motion/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ButtonLink } from "@/components/ui/Button";
import { PlaceholderNote } from "@/components/ui/PlaceholderNote";
import { projects } from "@/lib/projects";
import { projectFilters } from "@/lib/projects";

const featured = ["p1", "p2", "p5", "p4", "p6"].map((id) => projects.find((p) => p.id === id)!);
const labelOf = (cat: string) => projectFilters.find((f) => f.id === cat)?.label ?? cat;

function Caption({ title, category }: { title: string; category: string }) {
  return (
    <div className="mt-4 flex items-baseline justify-between gap-4">
      <h3 className="display text-2xl text-espresso md:text-3xl">{title}</h3>
      <span className="eyebrow shrink-0 text-taupe">{labelOf(category)}</span>
    </div>
  );
}

export function FeaturedProjects() {
  const [a, b, c, d, e] = featured;
  return (
    <section className="relative overflow-hidden bg-ivory py-28 md:py-40" aria-label="Featured projects">
      <div className="container-luxe">
        <div className="flex flex-col justify-between gap-10 md:flex-row md:items-end">
          <SectionHeading
            eyebrow="Featured Projects"
            title={["Spaces we've", "brought to life."]}
            intro="Living rooms, bedrooms, kitchens and offices — furnished, delivered and installed."
          />
          <Reveal>
            <ButtonLink href="/projects" variant="outline-dark">View all projects</ButtonLink>
          </Reveal>
        </div>

        <div className="mt-20 grid gap-x-8 gap-y-16 md:grid-cols-12">
          <Link href="/projects?filter=living" className="group md:col-span-7">
            <ClipImage image={a.image} className="aspect-[16/11] w-full" sizes="(min-width: 768px) 58vw, 100vw" label={a.title} />
            <Caption title={a.title} category={a.category} />
          </Link>
          <Parallax speed={70} className="md:col-span-4 md:col-start-9 md:mt-40">
            <Link href="/projects?filter=kitchen" className="group block">
              <ClipImage image={b.image} from="right" className="aspect-[3/4] w-full" sizes="(min-width: 768px) 33vw, 100vw" label={b.title} />
              <Caption title={b.title} category={b.category} />
            </Link>
          </Parallax>
          <Link href="/projects?filter=dining" className="group md:col-span-5 md:col-start-2">
            <ClipImage image={c.image} from="left" className="aspect-[4/5] w-full" sizes="(min-width: 768px) 42vw, 100vw" label={c.title} />
            <Caption title={c.title} category={c.category} />
          </Link>
          <div className="flex flex-col gap-16 md:col-span-5 md:col-start-8 md:pt-32">
            <Link href="/projects?filter=office" className="group">
              <ClipImage image={d.image} className="aspect-[4/3] w-full" sizes="(min-width: 768px) 42vw, 100vw" label={d.title} />
              <Caption title={d.title} category={d.category} />
            </Link>
            <Link href="/projects?filter=wardrobes" className="group md:w-4/5">
              <ClipImage image={e.image} from="right" className="aspect-[4/5] w-full" sizes="(min-width: 768px) 34vw, 100vw" label={e.title} />
              <Caption title={e.title} category={e.category} />
            </Link>
          </div>
        </div>
        <PlaceholderNote className="mt-14" />
      </div>
    </section>
  );
}
