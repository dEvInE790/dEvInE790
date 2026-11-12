"use client";

import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { PointerEvent } from "react";
import { Photo } from "./Photo";
import { WhatsAppIcon } from "./WhatsAppIcon";
import type { Category, Product } from "@/lib/catalogue";
import { staggerItem } from "@/components/motion/Reveal";
import { whatsappLink, waMessages } from "@/lib/site";

/**
 * Product card with depth: the image tilts subtly toward the pointer and zooms
 * on hover; the title lifts and the enquiry actions slide into view. On touch
 * devices (no hover) the actions are always visible.
 */
export function ProductCard({ product, category, index }: { product: Product; category: Category; index: number }) {
  const href = `/collections/${category.slug}/${product.slug}`;
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [3, -3]), { stiffness: 150, damping: 20 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-3, 3]), { stiffness: 150, damping: 20 });
  const ix = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), { stiffness: 150, damping: 20 });
  const iy = useSpring(useTransform(my, [-0.5, 0.5], [-10, 10]), { stiffness: 150, damping: 20 });

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const reset = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <motion.article variants={staggerItem} className="group">
      <motion.div
        onPointerMove={onMove}
        onPointerLeave={reset}
        style={{ rotateX: rx, rotateY: ry, transformPerspective: 1200 }}
        className="relative aspect-[4/5] overflow-hidden bg-sand"
      >
        <Link href={href} aria-label={`${product.name} — view details`} className="absolute inset-0 block">
          <motion.div className="absolute -inset-4" style={{ x: ix, y: iy }}>
            <Photo
              src={product.images[0].src}
              alt={product.images[0].alt}
              fill
              sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw"
              className="object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.07]"
              label={product.name}
            />
          </motion.div>
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-espresso/70 via-transparent to-transparent opacity-70 transition-opacity duration-700 group-hover:opacity-100" />
        </Link>
        <span className="pointer-events-none absolute left-5 top-5 bg-ivory/90 px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-espresso">
          {category.singular}
        </span>
        <span className="display pointer-events-none absolute right-5 top-4 text-xl italic text-ivory/80">{String(index + 1).padStart(2, "0")}</span>

        <div className="absolute inset-x-0 bottom-0 flex gap-2 p-4 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] [@media(hover:hover)]:translate-y-full [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:translate-y-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100">
          <Link
            href={`/quote?category=${encodeURIComponent(category.name)}&product=${encodeURIComponent(product.name)}`}
            className="flex min-h-11 flex-1 items-center justify-center bg-ivory px-3 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-espresso transition-colors hover:bg-gold-light"
          >
            Request a Quote
          </Link>
          <a
            href={whatsappLink(waMessages.product(product.name, category.name))}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Enquire about the ${product.name} on WhatsApp`}
            className="flex min-h-11 w-11 items-center justify-center bg-[#1f7a4d] text-white transition-colors hover:bg-[#186640]"
          >
            <WhatsAppIcon className="h-5 w-5" />
          </a>
        </div>
      </motion.div>

      <Link href={href} className="mt-5 block">
        <div className="overflow-hidden">
          <h3 className="display text-3xl text-espresso transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5">
            {product.name}
          </h3>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-taupe">{product.summary}</p>
        <span className="mt-4 inline-flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-espresso">
          <span className="link-underline pb-0.5 group-hover:[background-size:100%_1px]">Enquire about this product</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1" strokeWidth={1.6} />
        </span>
      </Link>
    </motion.article>
  );
}
