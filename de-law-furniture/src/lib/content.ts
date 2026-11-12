import "server-only";
import { cache } from "react";
import { getDb } from "./db";
import { seedCategories } from "./seed-catalogue";
import { seedProjects } from "./seed-projects";
import { seedTestimonials } from "./seed-testimonials";
import type { CatalogueIndex, Category, Img, Product, Project, ProjectCategory, Testimonial, TileSize } from "./types";

/**
 * Content queries used by the public site and the admin area.
 * Without a database (e.g. plain `next start` outside Cloudflare) they fall
 * back to the original seed content, read-only.
 */

const json = <T,>(s: string | null | undefined, fallback: T): T => {
  try {
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
};
const pad = (n: number) => String(n).padStart(2, "0");

type CategoryRow = {
  id: number; slug: string; name: string; singular: string; tagline: string; intro: string;
  cover_src: string; cover_alt: string; customisation: string; sort: number; visible: number;
};
type ProductRow = {
  id: number; category_id: number; slug: string; name: string; summary: string; description: string;
  features: string; images: string; sort: number; visible: number;
};
type ProjectRow = {
  id: number; title: string; category: string; description: string; image_src: string; image_alt: string;
  video_src: string | null; size: string; focus: string | null; sort: number; visible: number;
};
type TestimonialRow = { id: number; quote: string; name: string; detail: string | null; visible: number };

const toProduct = (r: ProductRow): Product => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  summary: r.summary,
  description: r.description,
  features: json<string[]>(r.features, []),
  images: json<Img[]>(r.images, []),
  visible: !!r.visible,
});

const seededCatalogue = (): Category[] =>
  seedCategories.map((c, ci) => ({
    ...c,
    id: ci + 1,
    index: pad(ci + 1),
    visible: true,
    products: c.products.map((p, pi) => ({ ...p, id: (ci + 1) * 100 + pi, visible: true })),
  }));

/** All categories with their products, in display order. */
export const getCatalogue = cache(async (includeHidden = false): Promise<Category[]> => {
  const db = await getDb();
  if (!db) return seededCatalogue();
  const [cats, prods] = await Promise.all([
    db.prepare("SELECT * FROM categories ORDER BY sort, id").all<CategoryRow>(),
    db.prepare("SELECT * FROM products ORDER BY sort, id").all<ProductRow>(),
  ]);
  const visibleCats = cats.results.filter((c) => includeHidden || c.visible);
  return visibleCats.map((c, i) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    singular: c.singular,
    index: pad(i + 1),
    tagline: c.tagline,
    intro: c.intro,
    cover: { src: c.cover_src, alt: c.cover_alt || c.name },
    customisation: json<string[]>(c.customisation, []),
    visible: !!c.visible,
    products: prods.results.filter((p) => p.category_id === c.id && (includeHidden || p.visible)).map(toProduct),
  }));
});

export const getCategory = async (slug: string) => (await getCatalogue()).find((c) => c.slug === slug);

export const getProduct = async (categorySlug: string, productSlug: string) => {
  const category = await getCategory(categorySlug);
  const product = category?.products.find((p) => p.slug === productSlug);
  return category && product ? { category, product } : undefined;
};

/** Compact list for client components (mobile menu, context-aware WhatsApp messages). */
export const getCatalogueIndex = async (): Promise<CatalogueIndex> =>
  (await getCatalogue()).map((c) => ({ slug: c.slug, name: c.name, products: c.products.map((p) => ({ slug: p.slug, name: p.name })) }));

const toProject = (r: ProjectRow): Project => ({
  id: r.id,
  title: r.title,
  category: r.category as ProjectCategory,
  description: r.description,
  image: { src: r.image_src, alt: r.image_alt || r.title },
  video: r.video_src || undefined,
  size: (["tall", "wide", "regular"].includes(r.size) ? r.size : "regular") as TileSize,
  focus: r.focus || undefined,
  visible: !!r.visible,
});

export const getProjects = cache(async (includeHidden = false): Promise<Project[]> => {
  const db = await getDb();
  if (!db) return seedProjects.map(({ id: _key, ...p }, i) => ({ ...p, id: i + 1, visible: true }));
  const rows = await db.prepare(`SELECT * FROM projects ${includeHidden ? "" : "WHERE visible = 1"} ORDER BY sort, id`).all<ProjectRow>();
  return rows.results.map(toProject);
});

export const getTestimonials = cache(async (includeHidden = false): Promise<Testimonial[]> => {
  const db = await getDb();
  if (!db) return seedTestimonials.map((t, i) => ({ ...t, id: i + 1, visible: true }));
  const rows = await db
    .prepare(`SELECT * FROM testimonials ${includeHidden ? "" : "WHERE visible = 1"} ORDER BY sort, id`)
    .all<TestimonialRow>();
  return rows.results.map((r) => ({ id: r.id, quote: r.quote, name: r.name, detail: r.detail || undefined, visible: !!r.visible }));
});
