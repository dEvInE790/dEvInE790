import type { Category, Img, Product, Project, ProjectCategory, Testimonial, TileSize } from "./types";

/** Database row shapes (Supabase) and their conversion to the site's types. Safe for server and browser. */

export type CategoryRow = {
  id: number; slug: string; name: string; singular: string; tagline: string; intro: string;
  cover_src: string; cover_alt: string; customisation: string[] | null; sort: number; visible: boolean;
};
export type ProductRow = {
  id: number; category_id: number; slug: string; name: string; summary: string; description: string;
  features: string[] | null; images: Img[] | null; sort: number; visible: boolean;
};
export type ProjectRow = {
  id: number; title: string; category: string; description: string; image_src: string; image_alt: string;
  video_src: string | null; size: string; focus: string | null; sort: number; visible: boolean;
};
export type TestimonialRow = { id: number; quote: string; name: string; detail: string | null; sort: number; visible: boolean };

const pad = (n: number) => String(n).padStart(2, "0");

export const toProduct = (r: ProductRow): Product => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  summary: r.summary,
  description: r.description,
  features: Array.isArray(r.features) ? r.features : [],
  images: Array.isArray(r.images) ? r.images : [],
  visible: r.visible,
});

export const toCatalogue = (cats: CategoryRow[], prods: ProductRow[]): Category[] =>
  cats.map((c, i) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    singular: c.singular,
    index: pad(i + 1),
    tagline: c.tagline,
    intro: c.intro,
    cover: { src: c.cover_src, alt: c.cover_alt || c.name },
    customisation: Array.isArray(c.customisation) ? c.customisation : [],
    visible: c.visible,
    products: prods.filter((p) => p.category_id === c.id).map(toProduct),
  }));

export const toProject = (r: ProjectRow): Project => ({
  id: r.id,
  title: r.title,
  category: r.category as ProjectCategory,
  description: r.description,
  image: { src: r.image_src, alt: r.image_alt || r.title },
  video: r.video_src || undefined,
  size: (["tall", "wide", "regular"].includes(r.size) ? r.size : "regular") as TileSize,
  focus: r.focus || undefined,
  visible: r.visible,
});

export const toTestimonial = (r: TestimonialRow): Testimonial => ({
  id: r.id,
  quote: r.quote,
  name: r.name,
  detail: r.detail || undefined,
  visible: r.visible,
});
