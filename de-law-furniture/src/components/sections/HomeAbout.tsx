import Link from "next/link";
import { ScrollText } from "@/components/motion/ScrollText";
import { ClipImage } from "@/components/motion/ClipImage";
import { Reveal } from "@/components/motion/Reveal";
import { Parallax } from "@/components/motion/Parallax";
import { images } from "@/lib/images";
import { site } from "@/lib/site";

export function HomeAbout() {
  return (
    <section className="relative overflow-hidden bg-ivory py-28 md:py-40" aria-labelledby="about-heading">
      <div className="container-luxe">
        <Reveal y={16}>
          <h2 id="about-heading" className="eyebrow mb-10 flex items-center gap-4 text-gold-deep">
            <span className="rule" /> About {site.shortName}
          </h2>
        </Reveal>
        <ScrollText
          className="max-w-6xl text-[2rem] leading-[1.15] text-espresso xs:text-4xl md:text-6xl md:leading-[1.08]"
          text="Since 2015, DE. LAW FURNITURE LTD has manufactured furniture and furnished interior and exterior spaces — sourcing premium wood, fabrics and plywood so every piece meets a higher standard of quality and durability."
        />

        <div className="mt-20 grid gap-10 md:mt-28 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-7">
            <ClipImage image={images.livingWarm} className="aspect-[4/3] w-full" sizes="(min-width: 768px) 58vw, 100vw" />
          </div>
          <div className="flex flex-col justify-between gap-10 md:col-span-5">
            <Parallax speed={50} className="hidden md:block">
              <ClipImage image={images.workshop} from="left" className="ml-auto aspect-[3/4] w-3/4" sizes="30vw" parallax={6} delay={0.15} />
            </Parallax>
            <Reveal>
              <p className="text-base leading-relaxed text-taupe md:text-lg">
                We are a furniture manufacturing and furnishing company specialising in all kinds of interior and exterior furniture designs. From a single statement sofa to a fully furnished home or office, every project is made to your specifications — then delivered and installed by our team.
              </p>
              <Link href="/about" className="link-underline mt-8 inline-block pb-1 text-xs font-semibold uppercase tracking-[0.24em] text-espresso">
                Discover our story
              </Link>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
