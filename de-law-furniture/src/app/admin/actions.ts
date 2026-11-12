"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { requireDb } from "@/lib/db";
import { deleteMedia } from "@/lib/media";
import { projectCategories } from "@/lib/project-filters";
import type { Img } from "@/lib/types";

/**
 * Admin server actions. Every action checks the admin session first and
 * validates its input on the server; nothing from the browser is trusted.
 */

export type ActionResult = { ok: true; id?: number } | { ok: false; error: string };

type Table = "projects" | "categories" | "products" | "testimonials";

const fail = (error: string): ActionResult => ({ ok: false, error });

function text(v: unknown, field: string, max: number, required = false): string {
  const s = typeof v === "string" ? v.replace(/\r\n/g, "\n").trim() : "";
  if (required && !s) throw new UserError(`${field} is required.`);
  if (s.length > max) throw new UserError(`${field} is too long (max ${max} characters).`);
  return s;
}

function lines(v: unknown, field: string, maxItems = 20): string[] {
  const arr = Array.isArray(v) ? v : [];
  const out = arr.map((x, i) => text(x, `${field} ${i + 1}`, 200)).filter(Boolean);
  if (out.length > maxItems) throw new UserError(`Please keep ${field.toLowerCase()} to ${maxItems} items.`);
  return out;
}

/** Only accept images uploaded through the admin (/media/…) or the site's own files (/images/…, /videos/…). */
function mediaSrc(v: unknown, field: string, required = false): string {
  const s = text(v, field, 300, required);
  if (s && !/^\/(media|images|videos)\/[\w\-/.]+$/.test(s)) throw new UserError(`${field} must be an uploaded file.`);
  return s;
}

function imgs(v: unknown, max = 8): Img[] {
  const arr = Array.isArray(v) ? v : [];
  if (arr.length > max) throw new UserError(`Please use at most ${max} photos.`);
  return arr.map((x, i) => ({
    src: stockOrMedia((x as Img)?.src, `Photo ${i + 1}`),
    alt: text((x as Img)?.alt, `Photo ${i + 1} description`, 200),
  }));
}

/** Allows the original temporary Unsplash photos to be kept, as well as uploads. */
function stockOrMedia(v: unknown, field: string): string {
  if (typeof v === "string" && /^https:\/\/images\.unsplash\.com\/[\w\-/.?=&%]+$/.test(v)) return v;
  return mediaSrc(v, field, true);
}

class UserError extends Error {}

function assertId(id: unknown): asserts id is number {
  if (!Number.isInteger(id) || (id as number) <= 0) throw new UserError("Invalid item.");
}

const TABLES: Table[] = ["projects", "categories", "products", "testimonials"];

async function guard<T extends ActionResult>(fn: () => Promise<T>): Promise<ActionResult> {
  try {
    await requireAdmin();
    return await fn();
  } catch (e) {
    if (e instanceof UserError) return fail(e.message);
    if (e instanceof Error && e.message.startsWith("Your admin session")) return fail(e.message);
    console.error("[admin] action failed:", e);
    return fail("Something went wrong while saving. Please try again.");
  }
}

function refresh() {
  revalidatePath("/", "layout");
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";

async function uniqueSlug(db: D1Database, base: string, table: "categories" | "products", scope: { categoryId?: number; exceptId?: number }) {
  let slug = slugify(base);
  for (let n = 2; ; n++) {
    const row =
      table === "categories"
        ? await db.prepare("SELECT id FROM categories WHERE slug = ? AND id != ?").bind(slug, scope.exceptId ?? 0).first()
        : await db.prepare("SELECT id FROM products WHERE slug = ? AND category_id = ? AND id != ?").bind(slug, scope.categoryId ?? 0, scope.exceptId ?? 0).first();
    if (!row) return slug;
    slug = `${slugify(base)}-${n}`;
  }
}

async function nextSort(db: D1Database, table: Table, where = "", ...binds: unknown[]) {
  const row = await db.prepare(`SELECT COALESCE(MAX(sort), -1) + 1 AS n FROM ${table} ${where}`).bind(...binds).first<{ n: number }>();
  return row?.n ?? 0;
}

// ─── Shared: reorder & visibility ───────────────────────────────────────────

export async function moveItem(table: Table, id: number, direction: "up" | "down"): Promise<ActionResult> {
  return guard(async () => {
    if (!TABLES.includes(table)) throw new UserError("Unknown list.");
    assertId(id);
    const db = await requireDb();
    let scope = "";
    const binds: unknown[] = [];
    if (table === "products") {
      const p = await db.prepare("SELECT category_id FROM products WHERE id = ?").bind(id).first<{ category_id: number }>();
      if (!p) throw new UserError("Item not found.");
      scope = "WHERE category_id = ?";
      binds.push(p.category_id);
    }
    const rows = (await db.prepare(`SELECT id FROM ${table} ${scope} ORDER BY sort, id`).bind(...binds).all<{ id: number }>()).results;
    const i = rows.findIndex((r) => r.id === id);
    const j = direction === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= rows.length) return { ok: true };
    [rows[i], rows[j]] = [rows[j], rows[i]];
    await db.batch(rows.map((r, idx) => db.prepare(`UPDATE ${table} SET sort = ? WHERE id = ?`).bind(idx, r.id)));
    refresh();
    return { ok: true };
  });
}

export async function setVisible(table: Table, id: number, visible: boolean): Promise<ActionResult> {
  return guard(async () => {
    if (!TABLES.includes(table)) throw new UserError("Unknown list.");
    assertId(id);
    const db = await requireDb();
    await db.prepare(`UPDATE ${table} SET visible = ? WHERE id = ?`).bind(visible ? 1 : 0, id).run();
    refresh();
    return { ok: true };
  });
}

// ─── Projects ───────────────────────────────────────────────────────────────

export type ProjectInput = {
  id?: number;
  title: string;
  category: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  videoSrc?: string;
  size: string;
  focus?: string;
  visible: boolean;
};

export async function saveProject(input: ProjectInput): Promise<ActionResult> {
  return guard(async () => {
    const db = await requireDb();
    const title = text(input.title, "Title", 120, true);
    const category = text(input.category, "Category", 30, true);
    if (!projectCategories.some((c) => c.id === category)) throw new UserError("Please choose a category.");
    const description = text(input.description, "Description", 600);
    const imageSrc = mediaSrc(input.imageSrc, "Photo", true);
    const imageAlt = text(input.imageAlt, "Photo description", 200) || title;
    const videoSrc = mediaSrc(input.videoSrc, "Video") || null;
    const size = ["tall", "wide", "regular"].includes(input.size) ? input.size : "regular";
    const focus = text(input.focus, "Focus", 20) || null;
    if (focus && !/^\d{1,3}% \d{1,3}%$/.test(focus)) throw new UserError("Focus must look like “50% 30%”.");

    if (input.id !== undefined) assertId(input.id);
    if (input.id) {
      const old = await db.prepare("SELECT image_src, video_src FROM projects WHERE id = ?").bind(input.id).first<{ image_src: string; video_src: string | null }>();
      if (!old) throw new UserError("Project not found.");
      await db
        .prepare("UPDATE projects SET title=?, category=?, description=?, image_src=?, image_alt=?, video_src=?, size=?, focus=?, visible=? WHERE id=?")
        .bind(title, category, description, imageSrc, imageAlt, videoSrc, size, focus, input.visible ? 1 : 0, input.id)
        .run();
      await deleteMedia([old.image_src !== imageSrc ? old.image_src : null, old.video_src !== videoSrc ? old.video_src : null]);
      refresh();
      return { ok: true, id: input.id };
    }
    // New projects go to the top of the gallery.
    await db.prepare("UPDATE projects SET sort = sort + 1").run();
    const res = await db
      .prepare("INSERT INTO projects (title, category, description, image_src, image_alt, video_src, size, focus, sort, visible) VALUES (?,?,?,?,?,?,?,?,0,?)")
      .bind(title, category, description, imageSrc, imageAlt, videoSrc, size, focus, input.visible ? 1 : 0)
      .run();
    refresh();
    return { ok: true, id: Number(res.meta.last_row_id) };
  });
}

export async function deleteProject(id: number): Promise<ActionResult> {
  return guard(async () => {
    assertId(id);
    const db = await requireDb();
    const old = await db.prepare("SELECT image_src, video_src FROM projects WHERE id = ?").bind(id).first<{ image_src: string; video_src: string | null }>();
    await db.prepare("DELETE FROM projects WHERE id = ?").bind(id).run();
    if (old) await deleteMedia([old.image_src, old.video_src]);
    refresh();
    return { ok: true };
  });
}

// ─── Collections (categories) ───────────────────────────────────────────────

export type CategoryInput = {
  id?: number;
  name: string;
  singular: string;
  slug?: string;
  tagline: string;
  intro: string;
  cover: Img;
  customisation: string[];
  visible: boolean;
};

export async function saveCategory(input: CategoryInput): Promise<ActionResult> {
  return guard(async () => {
    const db = await requireDb();
    const name = text(input.name, "Name", 60, true);
    const singular = text(input.singular, "Singular name", 60) || name;
    const tagline = text(input.tagline, "Tagline", 120);
    const intro = text(input.intro, "Introduction", 600);
    const coverSrc = input.cover?.src ? stockOrMedia(input.cover.src, "Cover photo") : "";
    const coverAlt = text(input.cover?.alt, "Cover photo description", 200);
    const customisation = lines(input.customisation, "Customisation options");
    const slug = await uniqueSlug(db, text(input.slug, "Web address", 80) || name, "categories", { exceptId: input.id });

    if (input.id !== undefined) assertId(input.id);
    if (input.id) {
      const old = await db.prepare("SELECT cover_src FROM categories WHERE id = ?").bind(input.id).first<{ cover_src: string }>();
      if (!old) throw new UserError("Collection not found.");
      await db
        .prepare("UPDATE categories SET name=?, singular=?, slug=?, tagline=?, intro=?, cover_src=?, cover_alt=?, customisation=?, visible=? WHERE id=?")
        .bind(name, singular, slug, tagline, intro, coverSrc, coverAlt, JSON.stringify(customisation), input.visible ? 1 : 0, input.id)
        .run();
      if (old.cover_src !== coverSrc) await deleteMedia([old.cover_src]);
      refresh();
      return { ok: true, id: input.id };
    }
    const res = await db
      .prepare("INSERT INTO categories (name, singular, slug, tagline, intro, cover_src, cover_alt, customisation, sort, visible) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .bind(name, singular, slug, tagline, intro, coverSrc, coverAlt, JSON.stringify(customisation), await nextSort(db, "categories"), input.visible ? 1 : 0)
      .run();
    refresh();
    return { ok: true, id: Number(res.meta.last_row_id) };
  });
}

export async function deleteCategory(id: number): Promise<ActionResult> {
  return guard(async () => {
    assertId(id);
    const db = await requireDb();
    const cat = await db.prepare("SELECT cover_src FROM categories WHERE id = ?").bind(id).first<{ cover_src: string }>();
    const prods = (await db.prepare("SELECT images FROM products WHERE category_id = ?").bind(id).all<{ images: string }>()).results;
    await db.batch([db.prepare("DELETE FROM products WHERE category_id = ?").bind(id), db.prepare("DELETE FROM categories WHERE id = ?").bind(id)]);
    const srcs = [cat?.cover_src, ...prods.flatMap((p) => (JSON.parse(p.images || "[]") as Img[]).map((i) => i.src))];
    await deleteMedia(srcs);
    refresh();
    return { ok: true };
  });
}

// ─── Products ───────────────────────────────────────────────────────────────

export type ProductInput = {
  id?: number;
  categoryId: number;
  name: string;
  slug?: string;
  summary: string;
  description: string;
  features: string[];
  images: Img[];
  visible: boolean;
};

export async function saveProduct(input: ProductInput): Promise<ActionResult> {
  return guard(async () => {
    const db = await requireDb();
    assertId(input.categoryId);
    const cat = await db.prepare("SELECT id FROM categories WHERE id = ?").bind(input.categoryId).first();
    if (!cat) throw new UserError("Collection not found.");
    const name = text(input.name, "Name", 100, true);
    const summary = text(input.summary, "Short summary", 160);
    const description = text(input.description, "Description", 1500);
    const features = lines(input.features, "Features");
    const images = imgs(input.images).map((i) => ({ ...i, alt: i.alt || name }));
    const slug = await uniqueSlug(db, text(input.slug, "Web address", 80) || name, "products", { categoryId: input.categoryId, exceptId: input.id });

    if (input.id !== undefined) assertId(input.id);
    if (input.id) {
      const old = await db.prepare("SELECT images FROM products WHERE id = ?").bind(input.id).first<{ images: string }>();
      if (!old) throw new UserError("Product not found.");
      await db
        .prepare("UPDATE products SET name=?, slug=?, summary=?, description=?, features=?, images=?, visible=? WHERE id=?")
        .bind(name, slug, summary, description, JSON.stringify(features), JSON.stringify(images), input.visible ? 1 : 0, input.id)
        .run();
      const kept = new Set(images.map((i) => i.src));
      await deleteMedia((JSON.parse(old.images || "[]") as Img[]).map((i) => i.src).filter((s) => !kept.has(s)));
      refresh();
      return { ok: true, id: input.id };
    }
    const res = await db
      .prepare("INSERT INTO products (category_id, name, slug, summary, description, features, images, sort, visible) VALUES (?,?,?,?,?,?,?,?,?)")
      .bind(input.categoryId, name, slug, summary, description, JSON.stringify(features), JSON.stringify(images), await nextSort(db, "products", "WHERE category_id = ?", input.categoryId), input.visible ? 1 : 0)
      .run();
    refresh();
    return { ok: true, id: Number(res.meta.last_row_id) };
  });
}

export async function deleteProduct(id: number): Promise<ActionResult> {
  return guard(async () => {
    assertId(id);
    const db = await requireDb();
    const old = await db.prepare("SELECT images FROM products WHERE id = ?").bind(id).first<{ images: string }>();
    await db.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
    if (old) await deleteMedia((JSON.parse(old.images || "[]") as Img[]).map((i) => i.src));
    refresh();
    return { ok: true };
  });
}

// ─── Testimonials ───────────────────────────────────────────────────────────

export type TestimonialInput = { id?: number; quote: string; name: string; detail?: string; visible: boolean };

export async function saveTestimonial(input: TestimonialInput): Promise<ActionResult> {
  return guard(async () => {
    const db = await requireDb();
    const quote = text(input.quote, "Review", 800, true);
    const name = text(input.name, "Customer name", 80, true);
    const detail = text(input.detail, "Details", 120) || null;
    if (input.id !== undefined) assertId(input.id);
    if (input.id) {
      await db.prepare("UPDATE testimonials SET quote=?, name=?, detail=?, visible=? WHERE id=?").bind(quote, name, detail, input.visible ? 1 : 0, input.id).run();
      refresh();
      return { ok: true, id: input.id };
    }
    const res = await db
      .prepare("INSERT INTO testimonials (quote, name, detail, sort, visible) VALUES (?,?,?,?,?)")
      .bind(quote, name, detail, await nextSort(db, "testimonials"), input.visible ? 1 : 0)
      .run();
    refresh();
    return { ok: true, id: Number(res.meta.last_row_id) };
  });
}

export async function deleteTestimonial(id: number): Promise<ActionResult> {
  return guard(async () => {
    assertId(id);
    const db = await requireDb();
    await db.prepare("DELETE FROM testimonials WHERE id = ?").bind(id).run();
    refresh();
    return { ok: true };
  });
}
