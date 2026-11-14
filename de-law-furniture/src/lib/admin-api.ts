import type { SupabaseClient } from "@supabase/supabase-js";
import { toCatalogue, toProject, toTestimonial, type CategoryRow, type ProductRow, type ProjectRow, type TestimonialRow } from "./mappers";
import { projectCategories } from "./project-filters";
import type { Img } from "./types";

/**
 * Admin operations, run in the browser as the signed-in Supabase user.
 * Supabase row-level security is what actually enforces that only admins can
 * change anything; the checks here just give friendly messages first.
 */

export type ActionResult = { ok: true; id?: number } | { ok: false; error: string };
export type Table = "projects" | "categories" | "products" | "testimonials";

const BUCKET = "media";
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

class UserError extends Error {}

function text(v: unknown, field: string, max: number, required = false): string {
  const s = typeof v === "string" ? v.replace(/\r\n/g, "\n").trim() : "";
  if (required && !s) throw new UserError(`${field} is required.`);
  if (s.length > max) throw new UserError(`${field} is too long (max ${max} characters).`);
  return s;
}

function lines(v: unknown, field: string, maxItems = 20): string[] {
  const out = (Array.isArray(v) ? v : []).map((x, i) => text(x, `${field} ${i + 1}`, 200)).filter(Boolean);
  if (out.length > maxItems) throw new UserError(`Please keep ${field.toLowerCase()} to ${maxItems} items.`);
  return out;
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "item";

function friendly(e: unknown): string {
  if (e instanceof UserError) return e.message;
  const err = e as { message?: string; code?: string };
  if (err?.code === "42501" || /row-level security|permission denied/i.test(err?.message ?? "")) {
    return "You don't have permission to do that. Make sure your account is on the admin list.";
  }
  if (/JWT|session/i.test(err?.message ?? "")) return "Your session has expired. Please sign in again.";
  if (err?.code === "23505") return "Something with that name or web address already exists.";
  if (err?.code === "23514") return "One of the fields isn't in the right format or is too long.";
  console.error("[admin]", e);
  return err?.message ? `Couldn't save: ${err.message}` : "Something went wrong. Please try again.";
}

async function run(fn: () => Promise<ActionResult>): Promise<ActionResult> {
  try {
    return await fn();
  } catch (e) {
    return { ok: false, error: friendly(e) };
  }
}

/** Throws the Supabase error, if any, so `run` can turn it into a message. */
function check<T extends { error: unknown }>(res: T): T {
  if (res.error) throw res.error;
  return res;
}

export function makeAdminApi(sb: SupabaseClient) {
  // ─── Media ────────────────────────────────────────────────────────────────
  const publicPrefix = sb.storage.from(BUCKET).getPublicUrl("").data.publicUrl.replace(/\/$/, "") + "/";
  const isUploaded = (src: string | null | undefined): src is string => !!src && src.startsWith(publicPrefix);

  async function uploadMedia(file: Blob, name: string): Promise<string> {
    const type = file.type || "application/octet-stream";
    const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "video/mp4": "mp4", "video/quicktime": "mov" }[type];
    if (!ext) throw new Error("Please upload a JPEG, PNG or WebP photo, or an MP4 video.");
    if (file.size > MAX_VIDEO_BYTES) throw new Error("That file is too large (max 50 MB).");
    const d = new Date();
    const path = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from(BUCKET).upload(path, file, { contentType: type, cacheControl: "31536000", upsert: false });
    if (error) throw new Error(friendly(error) || `Upload of ${name} failed.`);
    return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  async function removeMedia(srcs: (string | null | undefined)[]) {
    const paths = srcs.filter(isUploaded).map((s) => decodeURIComponent(s.slice(publicPrefix.length)));
    if (paths.length) await sb.storage.from(BUCKET).remove(paths).catch(() => {});
  }

  /** Accepts uploaded files, the site's own /images and /videos, and the original Unsplash stock photos. */
  function mediaSrc(v: unknown, field: string, required = false): string {
    const s = text(v, field, 400, required);
    if (s && !(isUploaded(s) || /^\/(images|videos)\/[\w\-/.]+$/.test(s) || /^https:\/\/images\.unsplash\.com\//.test(s))) {
      throw new UserError(`${field} must be an uploaded file.`);
    }
    return s;
  }

  // ─── Reading (admins see hidden items too) ────────────────────────────────
  async function listCatalogue() {
    const [cats, prods] = await Promise.all([
      check(await sb.from("categories").select("*").order("sort").order("id")),
      check(await sb.from("products").select("*").order("sort").order("id")),
    ]);
    return toCatalogue(cats.data as CategoryRow[], prods.data as ProductRow[]);
  }
  async function listProjects() {
    return ((check(await sb.from("projects").select("*").order("sort").order("id")).data ?? []) as ProjectRow[]).map(toProject);
  }
  async function listTestimonials() {
    return ((check(await sb.from("testimonials").select("*").order("sort").order("id")).data ?? []) as TestimonialRow[]).map(toTestimonial);
  }

  // ─── Shared: reorder & visibility ─────────────────────────────────────────
  async function moveItem(table: Table, id: number, direction: "up" | "down"): Promise<ActionResult> {
    return run(async () => {
      let q = sb.from(table).select("id").order("sort").order("id");
      if (table === "products") {
        const p = check(await sb.from("products").select("category_id").eq("id", id).single()).data as { category_id: number };
        q = q.eq("category_id", p.category_id);
      }
      const ids = ((check(await q).data ?? []) as { id: number }[]).map((r) => r.id);
      const i = ids.indexOf(id);
      const j = direction === "up" ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= ids.length) return { ok: true };
      [ids[i], ids[j]] = [ids[j], ids[i]];
      check(await sb.rpc("admin_reorder", { p_table: table, p_ids: ids }));
      return { ok: true };
    });
  }

  async function setVisible(table: Table, id: number, visible: boolean): Promise<ActionResult> {
    return run(async () => {
      check(await sb.from(table).update({ visible }).eq("id", id));
      return { ok: true };
    });
  }

  async function uniqueSlug(table: "categories" | "products", base: string, scope: { categoryId?: number; exceptId?: number }) {
    let q = sb.from(table).select("id, slug").like("slug", `${slugify(base)}%`);
    if (table === "products") q = q.eq("category_id", scope.categoryId!);
    const taken = new Set(((check(await q).data ?? []) as { id: number; slug: string }[]).filter((r) => r.id !== scope.exceptId).map((r) => r.slug));
    let slug = slugify(base);
    for (let n = 2; taken.has(slug); n++) slug = `${slugify(base)}-${n}`;
    return slug;
  }

  async function minSort(table: Table) {
    const r = (check(await sb.from(table).select("sort").order("sort").limit(1)).data ?? []) as { sort: number }[];
    return r[0]?.sort ?? 0;
  }
  async function maxSort(table: Table, categoryId?: number) {
    let q = sb.from(table).select("sort").order("sort", { ascending: false }).limit(1);
    if (categoryId) q = q.eq("category_id", categoryId);
    const r = (check(await q).data ?? []) as { sort: number }[];
    return r[0]?.sort ?? -1;
  }

  // ─── Projects ─────────────────────────────────────────────────────────────
  type ProjectInput = {
    id?: number; title: string; category: string; description: string; imageSrc: string; imageAlt: string;
    videoSrc?: string; size: string; focus?: string; visible: boolean;
  };
  async function saveProject(input: ProjectInput): Promise<ActionResult> {
    return run(async () => {
      const title = text(input.title, "Title", 120, true);
      if (!projectCategories.some((c) => c.id === input.category)) throw new UserError("Please choose a category.");
      const focus = text(input.focus, "Crop focus", 20) || null;
      if (focus && !/^\d{1,3}% \d{1,3}%$/.test(focus)) throw new UserError("Crop focus must look like “50% 30%”.");
      const row = {
        title,
        category: input.category,
        description: text(input.description, "Description", 600),
        image_src: mediaSrc(input.imageSrc, "Photo", true),
        image_alt: text(input.imageAlt, "Photo description", 200) || title,
        video_src: mediaSrc(input.videoSrc, "Video") || null,
        size: ["tall", "wide", "regular"].includes(input.size) ? input.size : "regular",
        focus,
        visible: !!input.visible,
      };
      if (input.id) {
        const old = check(await sb.from("projects").select("image_src, video_src").eq("id", input.id).single()).data as { image_src: string; video_src: string | null };
        check(await sb.from("projects").update(row).eq("id", input.id));
        await removeMedia([old.image_src !== row.image_src ? old.image_src : null, old.video_src !== row.video_src ? old.video_src : null]);
        return { ok: true, id: input.id };
      }
      // New projects go to the top of the gallery.
      const created = check(await sb.from("projects").insert({ ...row, sort: (await minSort("projects")) - 1 }).select("id").single()).data as { id: number };
      return { ok: true, id: created.id };
    });
  }

  async function deleteProject(id: number): Promise<ActionResult> {
    return run(async () => {
      const old = check(await sb.from("projects").select("image_src, video_src").eq("id", id).single()).data as { image_src: string; video_src: string | null };
      check(await sb.from("projects").delete().eq("id", id));
      await removeMedia([old.image_src, old.video_src]);
      return { ok: true };
    });
  }

  // ─── Collections ──────────────────────────────────────────────────────────
  type CategoryInput = {
    id?: number; name: string; singular: string; slug?: string; tagline: string; intro: string;
    cover: Img; customisation: string[]; visible: boolean;
  };
  async function saveCategory(input: CategoryInput): Promise<ActionResult> {
    return run(async () => {
      const name = text(input.name, "Name", 60, true);
      const row = {
        name,
        singular: text(input.singular, "Singular name", 60) || name,
        tagline: text(input.tagline, "Tagline", 120),
        intro: text(input.intro, "Introduction", 600),
        cover_src: input.cover?.src ? mediaSrc(input.cover.src, "Cover photo") : "",
        cover_alt: text(input.cover?.alt, "Cover photo description", 200),
        customisation: lines(input.customisation, "Customisation options"),
        visible: !!input.visible,
        slug: await uniqueSlug("categories", text(input.slug, "Web address", 80) || name, { exceptId: input.id }),
      };
      if (input.id) {
        const old = check(await sb.from("categories").select("cover_src").eq("id", input.id).single()).data as { cover_src: string };
        check(await sb.from("categories").update(row).eq("id", input.id));
        if (old.cover_src !== row.cover_src) await removeMedia([old.cover_src]);
        return { ok: true, id: input.id };
      }
      const created = check(await sb.from("categories").insert({ ...row, sort: (await maxSort("categories")) + 1 }).select("id").single()).data as { id: number };
      return { ok: true, id: created.id };
    });
  }

  async function deleteCategory(id: number): Promise<ActionResult> {
    return run(async () => {
      const cat = check(await sb.from("categories").select("cover_src").eq("id", id).single()).data as { cover_src: string };
      const prods = (check(await sb.from("products").select("images").eq("category_id", id)).data ?? []) as { images: Img[] }[];
      check(await sb.from("categories").delete().eq("id", id)); // products are removed by the database (cascade)
      await removeMedia([cat.cover_src, ...prods.flatMap((p) => (p.images ?? []).map((i) => i.src))]);
      return { ok: true };
    });
  }

  // ─── Products ─────────────────────────────────────────────────────────────
  type ProductInput = {
    id?: number; categoryId: number; name: string; slug?: string; summary: string; description: string;
    features: string[]; images: Img[]; visible: boolean;
  };
  async function saveProduct(input: ProductInput): Promise<ActionResult> {
    return run(async () => {
      const name = text(input.name, "Name", 100, true);
      if (input.images.length > 8) throw new UserError("Please use at most 8 photos.");
      const images = input.images.map((img, i) => ({ src: mediaSrc(img.src, `Photo ${i + 1}`, true), alt: text(img.alt, `Photo ${i + 1} description`, 200) || name }));
      const row = {
        name,
        summary: text(input.summary, "Short summary", 160),
        description: text(input.description, "Description", 1500),
        features: lines(input.features, "Features"),
        images,
        visible: !!input.visible,
        slug: await uniqueSlug("products", text(input.slug, "Web address", 80) || name, { categoryId: input.categoryId, exceptId: input.id }),
      };
      if (input.id) {
        const old = check(await sb.from("products").select("images").eq("id", input.id).single()).data as { images: Img[] };
        check(await sb.from("products").update(row).eq("id", input.id));
        const kept = new Set(images.map((i) => i.src));
        await removeMedia((old.images ?? []).map((i) => i.src).filter((s) => !kept.has(s)));
        return { ok: true, id: input.id };
      }
      const created = check(
        await sb.from("products").insert({ ...row, category_id: input.categoryId, sort: (await maxSort("products", input.categoryId)) + 1 }).select("id").single()
      ).data as { id: number };
      return { ok: true, id: created.id };
    });
  }

  async function deleteProduct(id: number): Promise<ActionResult> {
    return run(async () => {
      const old = check(await sb.from("products").select("images").eq("id", id).single()).data as { images: Img[] };
      check(await sb.from("products").delete().eq("id", id));
      await removeMedia((old.images ?? []).map((i) => i.src));
      return { ok: true };
    });
  }

  // ─── Testimonials ─────────────────────────────────────────────────────────
  type TestimonialInput = { id?: number; quote: string; name: string; detail?: string; visible: boolean };
  async function saveTestimonial(input: TestimonialInput): Promise<ActionResult> {
    return run(async () => {
      const row = {
        quote: text(input.quote, "Review", 800, true),
        name: text(input.name, "Customer name", 80, true),
        detail: text(input.detail, "Details", 120) || null,
        visible: !!input.visible,
      };
      if (input.id) {
        check(await sb.from("testimonials").update(row).eq("id", input.id));
        return { ok: true, id: input.id };
      }
      const created = check(await sb.from("testimonials").insert({ ...row, sort: (await maxSort("testimonials")) + 1 }).select("id").single()).data as { id: number };
      return { ok: true, id: created.id };
    });
  }

  async function deleteTestimonial(id: number): Promise<ActionResult> {
    return run(async () => {
      check(await sb.from("testimonials").delete().eq("id", id));
      return { ok: true };
    });
  }

  return {
    uploadMedia, listCatalogue, listProjects, listTestimonials, moveItem, setVisible,
    saveProject, deleteProject, saveCategory, deleteCategory, saveProduct, deleteProduct, saveTestimonial, deleteTestimonial,
  };
}

export type AdminApi = ReturnType<typeof makeAdminApi>;
