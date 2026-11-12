import type { Category } from "@/lib/types";

/** Sticky in-page index of the nine collections. */
export function CategoryNav({ categories }: { categories: Pick<Category, "slug" | "name" | "index">[] }) {
  return (
    <nav aria-label="Collections" className="sticky top-0 z-30 border-b border-espresso/10 bg-ivory/90 backdrop-blur-xl">
      <ul className="container-luxe flex gap-2 overflow-x-auto py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" data-lenis-prevent-touch>
        {categories.map((c) => (
          <li key={c.slug} className="shrink-0">
            <a
              href={`#${c.slug}`}
              className="inline-flex items-center gap-2 border border-espresso/15 px-4 py-2 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-espresso transition-colors duration-500 hover:border-espresso hover:bg-espresso hover:text-ivory"
            >
              <span className="text-gold-deep">{c.index}</span> {c.name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
