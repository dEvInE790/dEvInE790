"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArrowRight } from "lucide-react";
import { Photo } from "@/components/ui/Photo";
import { SplitText } from "@/components/motion/SplitText";
import { Reveal } from "@/components/motion/Reveal";
import type { Category } from "@/lib/types";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * On large screens the section pins and the collection cards glide sideways
 * as the visitor scrolls (GSAP ScrollTrigger). On phones and tablets it
 * becomes a native swipeable row with scroll snapping.
 */
export function FeaturedCollections({ categories }: { categories: Pick<Category, "slug" | "name" | "index" | "tagline" | "cover">[] }) {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const el = track.current!;
        const distance = () => el.scrollWidth - window.innerWidth;
        const tween = gsap.to(el, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: section.current,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 0.8,
            invalidateOnRefresh: true,
            anticipatePin: 1,
          },
        });
        // Gentle inner-image drift for depth while the row moves
        gsap.utils.toArray<HTMLElement>("[data-card-media]").forEach((m) => {
          gsap.fromTo(
            m,
            { xPercent: -8 },
            { xPercent: 8, ease: "none", scrollTrigger: { trigger: m, containerAnimation: tween, start: "left right", end: "right left", scrub: true } }
          );
        });
      });
      return () => mm.revert();
    },
    { scope: section }
  );

  return (
    <section ref={section} className="relative overflow-hidden bg-cream lg:h-screen" aria-labelledby="collections-heading">
      <div
        ref={track}
        className="flex h-full snap-x snap-mandatory items-center gap-5 overflow-x-auto px-5 py-24 [scrollbar-width:none] md:px-10 lg:snap-none lg:gap-8 lg:overflow-visible lg:px-16 lg:py-0 [&::-webkit-scrollbar]:hidden"
        data-lenis-prevent-touch
      >
        <div className="flex w-[82vw] shrink-0 snap-start flex-col justify-center sm:w-[60vw] lg:w-[34vw] lg:pr-10">
          <Reveal y={16}>
            <p className="eyebrow mb-6 flex items-center gap-4 text-gold-deep">
              <span className="rule" /> Featured Collections
            </p>
          </Reveal>
          <SplitText id="collections-heading" as="h2" lines={["Every collection,", "one standard."]} className="display text-5xl text-espresso md:text-6xl xl:text-7xl" />
          <Reveal delay={0.2}>
            <p className="mt-6 max-w-md text-base leading-relaxed text-taupe">
              Every collection is made to order — sized, finished and upholstered to suit your space. Prices are tailored to your specification, so every quote is personal.
            </p>
            <Link href="/collections" className="link-underline mt-8 inline-flex items-center gap-3 pb-1 text-xs font-semibold uppercase tracking-[0.24em] text-espresso">
              View all collections <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
            <p className="eyebrow mt-12 hidden text-taupe/70 lg:block">Scroll to browse →</p>
          </Reveal>
        </div>

        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/collections/${c.slug}`}
            className="group relative block h-[62vh] max-h-[640px] min-h-[420px] w-[78vw] shrink-0 snap-start overflow-hidden bg-sand sm:w-[52vw] lg:h-[72vh] lg:max-h-none lg:w-[30vw]"
          >
            <div data-card-media className="absolute -inset-x-[10%] inset-y-0">
              <Photo
                src={c.cover.src}
                alt={c.cover.alt}
                fill
                sizes="(min-width: 1024px) 34vw, 80vw"
                className="object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
                label={c.name}
              />
            </div>
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-espresso/85 via-espresso/10 to-transparent transition-opacity duration-700 group-hover:opacity-90" />
            <div className="absolute inset-x-0 top-0 flex justify-between p-6 text-ivory">
              <span className="display text-2xl italic text-gold-light">{c.index}</span>
            </div>
            <div className="absolute inset-x-0 bottom-0 p-6 text-ivory md:p-8">
              <h3 className="display text-4xl md:text-5xl">{c.name}</h3>
              <div className="grid grid-rows-[1fr] transition-[grid-template-rows] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] [@media(hover:hover)]:grid-rows-[0fr] [@media(hover:hover)]:group-hover:grid-rows-[1fr]">
                <div className="overflow-hidden">
                  <p className="pt-3 text-sm text-ivory/75">{c.tagline}</p>
                </div>
              </div>
              <span className="mt-5 inline-flex items-center gap-3 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-gold-light">
                Explore
                <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1.5" strokeWidth={1.5} />
              </span>
            </div>
          </Link>
        ))}
        <div className="w-1 shrink-0 lg:w-8" aria-hidden />
      </div>
    </section>
  );
}
