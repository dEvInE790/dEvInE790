"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Loader2, Trash2 } from "lucide-react";
import { saveProduct } from "@/app/admin/actions";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { ListEditor } from "@/components/admin/ListEditor";
import { Card, Field, Input, Notice, TextArea, Toggle, btn } from "@/components/admin/ui";
import type { Img, Product } from "@/lib/types";

const MAX_PHOTOS = 8;

export function ProductForm({ categoryId, categoryName, product }: { categoryId: number; categoryName: string; product: Product | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [f, setF] = useState({
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    summary: product?.summary ?? "",
    description: product?.description ?? "",
    features: product?.features ?? [],
    images: product?.images ?? ([] as Img[]),
    visible: product?.visible ?? true,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((s) => ({ ...s, [k]: v }));
    setSaved(false);
  };
  const setImages = (fn: (imgs: Img[]) => Img[]) => {
    setF((s) => ({ ...s, images: fn(s.images) }));
    setSaved(false);
  };
  const move = (i: number, d: -1 | 1) =>
    setImages((imgs) => {
      const next = [...imgs];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await saveProduct({ ...f, id: product?.id, categoryId, features: f.features.filter((x) => x.trim()) });
      if (!res.ok) return setError(res.error);
      if (!product) router.push(`/admin/collections/${categoryId}`);
      else {
        setSaved(true);
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <h2 className="display mb-1 text-2xl text-espresso">Photos</h2>
        <p className="mb-5 text-sm text-taupe">The first photo is the main one on product cards. Up to {MAX_PHOTOS} photos.</p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {f.images.map((img, i) => (
            <div key={img.src + i} className="space-y-2 border border-espresso/10 p-3">
              <div className="aspect-[4/5] overflow-hidden bg-cream">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.src} alt="" className="h-full w-full object-cover" />
              </div>
              <Input value={img.alt} maxLength={200} placeholder="Photo description" aria-label={`Photo ${i + 1} description`} onChange={(e) => setImages((imgs) => imgs.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} />
              <div className="flex gap-1.5">
                <button type="button" className={btn.icon} disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move earlier">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button type="button" className={btn.icon} disabled={i === f.images.length - 1} onClick={() => move(i, 1)} aria-label="Move later">
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button type="button" className={btn.icon} onClick={() => setImages((imgs) => imgs.filter((_, j) => j !== i))} aria-label={`Remove photo ${i + 1}`}>
                  <Trash2 className="h-4 w-4 text-[#a4442e]" />
                </button>
                {i === 0 && <span className="self-center pl-1 text-xs font-semibold uppercase tracking-wider text-gold-deep">Main</span>}
              </div>
            </div>
          ))}
          {f.images.length < MAX_PHOTOS && (
            <div className="border border-dashed border-espresso/20 p-3">
              <MediaPicker key={f.images.length} onChange={({ image }) => setImages((imgs) => [...imgs, { src: image, alt: f.name }])} />
            </div>
          )}
        </div>
      </Card>

      <Card className="space-y-5">
        <Field label="Product name" htmlFor="name">
          <Input id="name" value={f.name} maxLength={100} required onChange={(e) => set("name", e.target.value)} placeholder={`e.g. ${categoryName === "Sofas" ? "Three-Seater Sofa" : "Product name"}`} />
        </Field>
        <Field label="Short summary" htmlFor="summary" hint="One line shown under the product card.">
          <Input id="summary" value={f.summary} maxLength={160} onChange={(e) => set("summary", e.target.value)} />
        </Field>
        <Field label="Description" htmlFor="description">
          <TextArea id="description" value={f.description} maxLength={1500} rows={4} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <Field label="Features" hint="Short points, one per line.">
          <ListEditor items={f.features} onChange={(v) => set("features", v)} placeholder="e.g. Made to your room's measurements" />
        </Field>
        <Field label="Web address" htmlFor="slug" hint="Made from the name if left empty. Changing it breaks old links.">
          <Input id="slug" value={f.slug} maxLength={80} onChange={(e) => set("slug", e.target.value)} />
        </Field>
        <Toggle checked={f.visible} onChange={(v) => set("visible", v)} label="Show on the website" />
        {error && <Notice tone="error">{error}</Notice>}
        {saved && <Notice tone="success">Saved — the website is updated.</Notice>}
        <div className="flex flex-wrap gap-2 border-t border-espresso/10 pt-5">
          <button type="submit" className={btn.primary} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} {product ? "Save product" : "Add product"}
          </button>
          <Link href={`/admin/collections/${categoryId}`} className={btn.secondary}>
            Back to {categoryName}
          </Link>
        </div>
      </Card>
    </form>
  );
}
