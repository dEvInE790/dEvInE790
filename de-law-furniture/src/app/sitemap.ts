import type { MetadataRoute } from "next";
import { categories } from "@/lib/catalogue";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages = ["", "/about", "/collections", "/projects", "/contact", "/quote"].map((p) => ({
    url: `${site.url}${p}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: p === "" ? 1 : 0.8,
  }));
  const cats = categories.flatMap((c) => [
    { url: `${site.url}/collections/${c.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 },
    ...c.products.map((p) => ({ url: `${site.url}/collections/${c.slug}/${p.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 })),
  ]);
  return [...pages, ...cats];
}
