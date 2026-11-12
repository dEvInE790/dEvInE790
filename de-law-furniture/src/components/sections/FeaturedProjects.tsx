import Link from "next/link";
import { ClipImage } from "@/components/motion/ClipImage";
import { Parallax } from "@/components/motion/Parallax";
import { Reveal } from "@/components/motion/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ButtonLink } from "@/components/ui/Button";
import { labelOfFilter } from "@/lib/project-filters";
import type { Project } from "@/lib/types";

function Caption({ p }: { p: Project }) {
  return (
    <div className="mt-4 flex items-baseline justify-between gap-4">
      <h3 className="display text-2xl text-espresso md:text-3xl">{p.title}</h3>
      <span className="eyebrow shrink-0 text-taupe">{labelOfFilter(p.category)}</span>
    </div>
  );
}

const href = (p: Project) => `/projects?filter=${p.category}`;

/**
 * Editorial layout for the first five projects in the gallery order
 * (reorder projects in /admin to choose what appears here).
 */
export function FeaturedProjects({ projects }: { projects: Project[] }) {
  if (projects.length === 0) return null;
  const [a, b, c, d, e] = projects;
  return (
    <section className="relative overflow-hidden bg-ivory py-28 md:py-40" aria-label="Featured projects">
      <div className="container-luxe">
        <div className="flex flex-col justify-between gap-10 md:flex-row md:items-end">
          <SectionHeading
            eyebrow="Featured Projects"
            title={["Recent work,", "made by DE. LAW."]}
            intro="A few of the pieces we've recently made for our customers."
          />
          <Reveal>
            <ButtonLink href="/projects" variant="outline-dark">View all projects</ButtonLink>
          </Reveal>
        </div>

        <div className="mt-20 grid gap-x-8 gap-y-16 md:grid-cols-12">
          <Link href={href(a)} className="group md:col-span-7">
            <ClipImage image={a.image} video={a.video} className="aspect-[16/9] w-full" sizes="(min-width: 768px) 58vw, 100vw" label={a.title} />
            <Caption p={a} />
          </Link>
          {b && (
            <Parallax speed={70} className="md:col-span-4 md:col-start-9 md:mt-40">
              <Link href={href(b)} className="group block">
                <ClipImage image={b.image} video={b.video} from="right" className="aspect-[3/4] w-full" sizes="(min-width: 768px) 33vw, 100vw" label={b.title} />
                <Caption p={b} />
              </Link>
            </Parallax>
          )}
          {c && (
            <Link href={href(c)} className="group md:col-span-5 md:col-start-2">
              <ClipImage image={c.image} video={c.video} from="left" className="aspect-[4/5] w-full" sizes="(min-width: 768px) 42vw, 100vw" label={c.title} />
              <Caption p={c} />
            </Link>
          )}
          {(d || e) && (
            <div className="flex flex-col gap-16 md:col-span-5 md:col-start-8 md:pt-32">
              {d && (
                <Link href={href(d)} className="group">
                  <ClipImage image={d.image} video={d.video} className="aspect-[4/3] w-full" sizes="(min-width: 768px) 42vw, 100vw" label={d.title} />
                  <Caption p={d} />
                </Link>
              )}
              {e && (
                <Link href={href(e)} className="group md:w-4/5">
                  <ClipImage image={e.image} video={e.video} from="right" className="aspect-[4/5] w-full" sizes="(min-width: 768px) 34vw, 100vw" label={e.title} />
                  <Caption p={e} />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
