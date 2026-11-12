"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Photo } from "@/components/ui/Photo";
import { ButtonLink } from "@/components/ui/Button";
import { useIntro } from "@/components/providers/IntroProvider";
import { images } from "@/lib/images";
import { site } from "@/lib/site";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const lines = [
  ["Crafting", "Comfort."],
  ["Defining", "Spaces."],
];

/**
 * Homepage hero, choreographed with a GSAP timeline once the intro loader lifts:
 * image zoom + fade, masked headline words, then copy and calls to action.
 * Scroll-linked parallax pushes the image and copy at different speeds.
 */
export function HomeHero() {
  const root = useRef<HTMLElement>(null);
  const { introDone } = useIntro();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        { motion: "(prefers-reduced-motion: no-preference)", reduce: "(prefers-reduced-motion: reduce)" },
        (ctx) => {
          const { reduce } = ctx.conditions as { reduce: boolean };
          if (reduce) {
            gsap.set("[data-hero-fade], [data-hero-word], [data-hero-media]", { clearProps: "all", opacity: 1 });
            return;
          }
          gsap.set("[data-hero-media]", { scale: 1.3, opacity: 0 });
          gsap.set("[data-hero-word]", { yPercent: 115, rotate: 3 });
          gsap.set("[data-hero-fade]", { opacity: 0, y: 28 });
          gsap.set("[data-hero-line]", { scaleX: 0 });

          if (!introDone) return;

          const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
          tl.to("[data-hero-media]", { scale: 1, opacity: 1, duration: 2.6 }, 0)
            .to("[data-hero-word]", { yPercent: 0, rotate: 0, duration: 1.5, stagger: 0.1 }, 0.25)
            .to("[data-hero-line]", { scaleX: 1, duration: 1.4, ease: "power3.inOut" }, 0.6)
            .to("[data-hero-fade]", { opacity: 1, y: 0, duration: 1.3, stagger: 0.1 }, 0.85);

          // Scroll parallax
          gsap.to("[data-hero-parallax]", {
            yPercent: 18,
            ease: "none",
            scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
          });
          gsap.to("[data-hero-content]", {
            yPercent: -12,
            opacity: 0.1,
            ease: "none",
            scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
          });
        }
      );
      return () => mm.revert();
    },
    { scope: root, dependencies: [introDone] }
  );

  return (
    <section ref={root} className="grain relative min-h-[100svh] overflow-hidden bg-espresso text-ivory">
      <div data-hero-parallax className="absolute inset-0 will-change-transform">
        <div data-hero-media className="absolute inset-0">
          <Photo src={images.hero.src} alt={images.hero.alt} fill priority sizes="100vw" className="object-cover" label="Hero photograph" />
        </div>
      </div>
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-espresso/45 via-espresso/25 to-espresso/90" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-espresso/70 via-transparent to-transparent" />

      <div data-hero-content className="container-luxe relative flex min-h-[100svh] flex-col justify-end pb-24 pt-32 md:min-h-[max(100svh,640px)] md:pb-32">
        <p data-hero-fade className="eyebrow mb-7 flex items-center gap-4 text-gold-light">
          <span className="rule" /> Est. {site.establishedYear} · Egbe, Lagos
        </p>

        <h1 className="display text-[2.9rem] leading-[0.95] xs:text-[3.6rem] sm:text-7xl md:text-8xl lg:text-[8.75rem]" aria-label={site.tagline}>
          {lines.map((line, li) => (
            <span key={li} aria-hidden className="block">
              {line.map((word, wi) => (
                <span key={wi} className="mr-[0.22em] inline-block overflow-hidden pb-[0.2em] -mb-[0.2em] align-bottom last:mr-0">
                  <span data-hero-word className={`inline-block will-change-transform ${li === 1 && wi === 1 ? "italic text-gold-light" : ""}`}>
                    {word}
                  </span>
                </span>
              ))}
            </span>
          ))}
        </h1>

        <div className="mt-8 grid gap-8 md:mt-10 md:grid-cols-12 md:items-end md:gap-10">
          <p data-hero-fade className="max-w-xl text-[0.95rem] leading-relaxed text-ivory/80 md:col-span-6 md:text-lg">
            Exceptional furniture, thoughtfully crafted to transform your spaces. Discover quality, elegance and bespoke craftsmanship with {site.name}.
          </p>
          <div data-hero-fade className="flex flex-wrap gap-3 md:col-span-6 md:justify-end">
            <ButtonLink href="/collections" variant="gold">Explore Our Collections</ButtonLink>
            <ButtonLink href="/quote" variant="outline-light">Request a Quote</ButtonLink>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0">
        <div className="container-luxe">
          <div data-hero-line className="h-px origin-left bg-ivory/25" />
          <div data-hero-fade className="flex items-center justify-between gap-6 py-5 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-ivory/60">
            <ul className="hidden gap-10 md:flex">
              <li>Interior &amp; Exterior Furniture</li>
              <li>Made to Order</li>
              <li>Delivery &amp; Installation</li>
            </ul>
            <span className="md:hidden">Scroll to explore</span>
            <span className="flex items-center gap-3">
              <span className="hidden md:inline">Scroll</span>
              <span aria-hidden className="relative block h-8 w-px overflow-hidden bg-ivory/20">
                <span className="absolute inset-x-0 top-0 h-1/2 animate-[scrollcue_2.2s_ease-in-out_infinite] bg-gold-light" />
              </span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
