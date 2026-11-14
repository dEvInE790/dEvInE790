"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminApp";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { ListEditor } from "@/components/admin/ListEditor";
import { Card, Field, Input, Notice, TextArea, Toggle, btn } from "@/components/admin/ui";
import type { Category } from "@/lib/types";

export function CategoryForm({ category, onSaved }: { category: Category | null; onSaved: () => void }) {
  const router = useRouter();
  const { api } = useAdmin();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [f, setF] = useState({
    name: category?.name ?? "",
    singular: category?.singular ?? "",
    slug: category?.slug ?? "",
    tagline: category?.tagline ?? "",
    intro: category?.intro ?? "",
    cover: category?.cover ?? { src: "", alt: "" },
    customisation: category?.customisation ?? [],
    visible: category?.visible ?? true,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((s) => ({ ...s, [k]: v }));
    setSaved(false);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await api.saveCategory({ ...f, id: category?.id, customisation: f.customisation.filter((x) => x.trim()) });
      if (!res.ok) return setError(res.error);
      if (!category) router.push(`/admin/collections/${res.id}`);
      else {
        setSaved(true);
        onSaved();
      }
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-5">
      <Card className="space-y-4 lg:col-span-2">
        <Field label="Cover photo">
          <MediaPicker image={f.cover.src} onChange={({ image }) => set("cover", { ...f.cover, src: image })} />
        </Field>
        <Field label="Cover photo description" htmlFor="coveralt">
          <Input id="coveralt" value={f.cover.alt} maxLength={200} onChange={(e) => set("cover", { ...f.cover, alt: e.target.value })} />
        </Field>
      </Card>
      <Card className="space-y-5 lg:col-span-3">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name" htmlFor="name">
            <Input id="name" value={f.name} maxLength={60} required onChange={(e) => set("name", e.target.value)} placeholder="e.g. Sofas" />
          </Field>
          <Field label="Singular name" htmlFor="singular" hint="Used in labels, e.g. “Sofa”.">
            <Input id="singular" value={f.singular} maxLength={60} onChange={(e) => set("singular", e.target.value)} />
          </Field>
        </div>
        <Field label="Tagline" htmlFor="tagline">
          <Input id="tagline" value={f.tagline} maxLength={120} onChange={(e) => set("tagline", e.target.value)} placeholder="e.g. Comfort, tailored to the room." />
        </Field>
        <Field label="Introduction" htmlFor="intro">
          <TextArea id="intro" value={f.intro} maxLength={600} rows={3} onChange={(e) => set("intro", e.target.value)} />
        </Field>
        <Field label="Customisation options" hint="One option per line, e.g. “Fabric type and colour”.">
          <ListEditor items={f.customisation} onChange={(v) => set("customisation", v)} placeholder="e.g. Size & seating capacity" />
        </Field>
        <Field label="Web address" htmlFor="slug" hint={<>The page will be /collections/<strong>{f.slug || "(made from the name)"}</strong>. Changing it breaks old links.</>}>
          <Input id="slug" value={f.slug} maxLength={80} onChange={(e) => set("slug", e.target.value)} placeholder="made from the name if left empty" />
        </Field>
        <Toggle checked={f.visible} onChange={(v) => set("visible", v)} label="Show on the website" />
        {error && <Notice tone="error">{error}</Notice>}
        {saved && <Notice tone="success">Saved — the website is updated.</Notice>}
        <div className="flex flex-wrap gap-2 border-t border-espresso/10 pt-5">
          <button type="submit" className={btn.primary} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} {category ? "Save collection" : "Create collection"}
          </button>
          <Link href="/admin/collections" className={btn.secondary}>
            Back to collections
          </Link>
        </div>
      </Card>
    </form>
  );
}
