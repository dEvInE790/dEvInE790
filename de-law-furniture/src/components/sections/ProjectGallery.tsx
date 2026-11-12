"use client";

import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { Photo } from "@/components/ui/Photo";
import { InViewVideo } from "@/components/ui/InViewVideo";
import { useLenis } from "@/components/providers/SmoothScroll";
import { labelOfFilter as labelOf, projectFilters, projects, type ProjectFilter } from "@/lib/projects";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;
const isFilter = (v: string | null): v is ProjectFilter => !!v && activeFilters.some((f) => f.id === v);
// Only show filters that have at least one project.
const activeFilters = projectFilters.filter((f) => f.id === "all" || projects.some((p) => p.category === f.id));

export function ProjectGallery() {
  const params = useSearchParams();
  const initial = params.get("filter");
  const [filter, setFilter] = useState<ProjectFilter>(isFilter(initial) ? initial : "all");
  const [open, setOpen] = useState<number | null>(null);
  const lenis = useLenis();

  useEffect(() => {
    const f = params.get("filter");
    if (isFilter(f)) setFilter(f);
  }, [params]);

  const visible = useMemo(() => (filter === "all" ? projects : projects.filter((p) => p.category === filter)), [filter]);

  const choose = (f: ProjectFilter) => {
    setFilter(f);
    const url = new URL(window.location.href);
    if (f === "all") url.searchParams.delete("filter");
    else url.searchParams.set("filter", f);
    window.history.replaceState(null, "", url);
  };

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + visible.length) % visible.length)), [visible.length]);

  useEffect(() => {
    if (open === null) return;
    lenis?.stop();
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      lenis?.start();
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close, step, lenis]);

  const current = open !== null ? visible[open] : null;

  return (
    <div>
      <LayoutGroup>
        <div role="group" aria-label="Filter projects" className="-mx-5 flex gap-1 overflow-x-auto px-5 pb-2 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0 [&::-webkit-scrollbar]:hidden">
          {activeFilters.map((f) => {
            const count = f.id === "all" ? projects.length : projects.filter((p) => p.category === f.id).length;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => choose(f.id)}
                aria-pressed={filter === f.id}
                className={cn(
                  "relative shrink-0 px-4 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.2em] transition-colors duration-500",
                  filter === f.id ? "text-ivory" : "text-espresso hover:text-gold-deep"
                )}
              >
                {filter === f.id && (
                  <motion.span layoutId="filter-pill" className="absolute inset-0 -z-0 bg-espresso" transition={{ duration: 0.6, ease: EASE }} />
                )}
                <span className="relative">
                  {f.label} <sup className="ml-0.5 opacity-60">{count}</sup>
                </span>
              </button>
            );
          })}
        </div>

        <motion.ul layout className="mt-10 grid auto-rows-[260px] grid-flow-dense gap-4 sm:grid-cols-2 md:auto-rows-[300px] md:gap-6 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {visible.map((p, i) => (
              <motion.li
                key={p.id}
                layout
                initial={{ opacity: 0, scale: 0.94, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.8, ease: EASE, delay: Math.min(i, 8) * 0.05 }}
                className={cn(p.size === "wide" && "sm:col-span-2", p.size === "tall" && "row-span-2")}
              >
                <button
                  type="button"
                  onClick={() => setOpen(i)}
                  className="group relative block h-full w-full overflow-hidden bg-sand text-left"
                  aria-label={`${p.video ? "Play" : "Open"} ${p.title} in gallery viewer`}
                >
                  {p.video ? (
                    <InViewVideo src={p.video} poster={p.image.src} label={p.image.alt} className="transition-transform duration-[1.6s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]" />
                  ) : (
                    <Photo
                      src={p.image.src}
                      alt={p.image.alt}
                      fill
                      sizes={p.size === "wide" ? "(min-width: 1024px) 66vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"}
                      className="object-cover transition-transform duration-[1.6s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
                      label={p.title}
                    />
                  )}
                  <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-espresso/80 via-espresso/0 to-transparent opacity-80 transition-opacity duration-700 group-hover:opacity-100" />
                  <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-ivory md:p-6">
                    <span>
                      <span className="eyebrow block text-gold-light">{labelOf(p.category)}</span>
                      <span className="display mt-2 block text-2xl md:text-3xl">{p.title}</span>
                    </span>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-ivory/40 transition-all duration-500 group-hover:bg-ivory group-hover:text-espresso [@media(hover:hover)]:translate-y-2 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100">
                      <Maximize2 className="h-4 w-4" strokeWidth={1.4} />
                    </span>
                  </span>
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      </LayoutGroup>

      <AnimatePresence>
        {current && open !== null && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${current.title} — image viewer`}
            className="fixed inset-0 z-[80] flex flex-col bg-charcoal/95 text-ivory backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            data-lenis-prevent
          >
            <div className="container-luxe flex items-center justify-between py-5">
              <span className="eyebrow text-ivory/60">
                {String(open + 1).padStart(2, "0")} / {String(visible.length).padStart(2, "0")}
              </span>
              <button type="button" onClick={close} autoFocus className="flex h-12 w-12 items-center justify-center border border-ivory/25 transition-colors hover:bg-ivory hover:text-espresso" aria-label="Close viewer">
                <X className="h-5 w-5" strokeWidth={1.4} />
              </button>
            </div>
            <div className="relative flex-1">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={current.id}
                  className="absolute inset-x-4 inset-y-0 md:inset-x-24"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.6, ease: EASE }}
                  drag={current.video ? false : "x"}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.25}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -80) step(1);
                    else if (info.offset.x > 80) step(-1);
                  }}
                >
                  {current.video ? (
                    <video
                      key={current.video}
                      src={current.video}
                      poster={current.image.src}
                      aria-label={current.image.alt}
                      controls
                      autoPlay
                      playsInline
                      className="absolute inset-0 h-full w-full object-contain"
                    />
                  ) : (
                    <Photo src={current.image.src} alt={current.image.alt} fill sizes="100vw" className="object-contain" label={current.title} draggable={false} />
                  )}
                </motion.div>
              </AnimatePresence>
              <button type="button" onClick={() => step(-1)} className="absolute left-2 top-1/2 hidden h-14 w-14 -translate-y-1/2 items-center justify-center border border-ivory/25 transition-colors hover:bg-ivory hover:text-espresso md:left-6 md:flex" aria-label="Previous image">
                <ChevronLeft className="h-5 w-5" strokeWidth={1.4} />
              </button>
              <button type="button" onClick={() => step(1)} className="absolute right-2 top-1/2 hidden h-14 w-14 -translate-y-1/2 items-center justify-center border border-ivory/25 transition-colors hover:bg-ivory hover:text-espresso md:right-6 md:flex" aria-label="Next image">
                <ChevronRight className="h-5 w-5" strokeWidth={1.4} />
              </button>
            </div>
            <div className="container-luxe flex flex-col gap-2 py-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="eyebrow text-gold-light">{labelOf(current.category)}</p>
                <p className="display mt-2 text-3xl">{current.title}</p>
                <p className="mt-1 text-sm text-ivory/60">{current.description}</p>
              </div>
              <div className="flex gap-2 md:hidden">
                <button type="button" onClick={() => step(-1)} className="flex h-12 w-12 items-center justify-center border border-ivory/25" aria-label="Previous image">
                  <ChevronLeft className="h-5 w-5" strokeWidth={1.4} />
                </button>
                <button type="button" onClick={() => step(1)} className="flex h-12 w-12 items-center justify-center border border-ivory/25" aria-label="Next image">
                  <ChevronRight className="h-5 w-5" strokeWidth={1.4} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
