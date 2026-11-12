import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import type { Category } from "@/lib/types";
import { Reveal, Stagger } from "@/components/motion/Reveal";
import { SplitText } from "@/components/motion/SplitText";
import { ProductCard } from "@/components/ui/ProductCard";

export function CustomisationList({ category, tone = "light" }: { category: Category; tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <div>
      <p className={`eyebrow mb-4 ${dark ? "text-gold" : "text-gold-deep"}`}>Customise your {category.singular.toLowerCase()}</p>
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {category.customisation.map((c) => (
          <li key={c} className={`flex items-start gap-3 text-sm ${dark ? "text-ivory/75" : "text-taupe"}`}>
            <Check className={`mt-0.5 h-4 w-4 shrink-0 ${dark ? "text-gold" : "text-gold-deep"}`} strokeWidth={1.6} aria-hidden />
            {c}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A full catalogue section for one category: heading, customisation info and product cards. */
export function CategoryBlock({ category, showLink = true }: { category: Category; showLink?: boolean }) {
  return (
    <section id={category.slug} className="scroll-mt-28 border-t border-espresso/10 py-20 md:py-28" aria-labelledby={`${category.slug}-title`}>
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Reveal y={16}>
            <span className="display text-5xl italic text-gold">{category.index}</span>
          </Reveal>
          <SplitText id={`${category.slug}-title`} lines={[category.name]} className="display mt-3 text-5xl text-espresso md:text-6xl" />
          <Reveal delay={0.1}>
            <p className="display mt-3 text-2xl italic text-taupe">{category.tagline}</p>
          </Reveal>
        </div>
        <Reveal delay={0.15} className="space-y-8 lg:col-span-7">
          <p className="text-base leading-relaxed text-taupe md:text-lg">{category.intro}</p>
          <CustomisationList category={category} />
          <p className="text-xs italic text-taupe/80">Prices are quoted individually according to size, materials and finish.</p>
          {showLink && (
            <Link href={`/collections/${category.slug}`} className="link-underline inline-flex items-center gap-3 pb-1 text-xs font-semibold uppercase tracking-[0.22em] text-espresso">
              Explore {category.name} <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          )}
        </Reveal>
      </div>
      <Stagger className="mt-14 grid gap-x-6 gap-y-14 sm:grid-cols-2 xl:grid-cols-3" stagger={0.14}>
        {category.products.map((p, i) => (
          <ProductCard key={p.slug} product={p} category={category} index={i} />
        ))}
      </Stagger>
    </section>
  );
}
