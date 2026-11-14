import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./supabase-config";
import { toCatalogue, toProject, toTestimonial, type CategoryRow, type ProductRow, type ProjectRow, type TestimonialRow } from "./mappers";
import { seedCategories } from "./seed-catalogue";
import { seedProjects } from "./seed-projects";
import { seedTestimonials } from "./seed-testimonials";
import type { CatalogueIndex, Category, Project, Testimonial } from "./types";

/**
 * Public content, read from Supabase with the public (anon) key — row-level
 * security only returns visible items. If Supabase isn't configured or can't
 * be reached, the site falls back to its built-in starting content so it
 * never goes down.
 */

function client() {
  const cfg = supabaseConfig();
  if (!cfg) return null;
  return createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}

const pad = (n: number) => String(n).padStart(2, "0");

const seededCatalogue = (): Category[] =>
  seedCategories.map((c, ci) => ({
    ...c,
    id: ci + 1,
    index: pad(ci + 1),
    visible: true,
    products: c.products.map((p, pi) => ({ ...p, id: (ci + 1) * 100 + pi, visible: true })),
  }));

function warn(what: string, err: unknown) {
  console.error(`[content] Could not load ${what} from Supabase — showing built-in content instead.`, err);
}

/** All visible categories with their visible products, in display order. */
export const getCatalogue = cache(async (): Promise<Category[]> => {
  const sb = client();
  if (!sb) return seededCatalogue();
  const [cats, prods] = await Promise.all([
    sb.from("categories").select("*").order("sort").order("id"),
    sb.from("products").select("*").order("sort").order("id"),
  ]);
  if (cats.error || prods.error) {
    warn("collections", cats.error || prods.error);
    return seededCatalogue();
  }
  return toCatalogue(cats.data as CategoryRow[], prods.data as ProductRow[]);
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

export const getProjects = cache(async (): Promise<Project[]> => {
  const sb = client();
  const fallback = () => seedProjects.map(({ id: _key, ...p }, i) => ({ ...p, id: i + 1, visible: true }));
  if (!sb) return fallback();
  const { data, error } = await sb.from("projects").select("*").order("sort").order("id");
  if (error) {
    warn("projects", error);
    return fallback();
  }
  return (data as ProjectRow[]).map(toProject);
});

export const getTestimonials = cache(async (): Promise<Testimonial[]> => {
  const sb = client();
  const fallback = () => seedTestimonials.map((t, i) => ({ ...t, id: i + 1, visible: true }));
  if (!sb) return fallback();
  const { data, error } = await sb.from("testimonials").select("*").order("sort").order("id");
  if (error) {
    warn("testimonials", error);
    return fallback();
  }
  return (data as TestimonialRow[]).map(toTestimonial);
});
