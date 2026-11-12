"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { saveProject } from "@/app/admin/actions";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { Card, Field, Input, Notice, Select, TextArea, Toggle, btn } from "@/components/admin/ui";
import { projectCategories } from "@/lib/project-filters";
import type { Project } from "@/lib/types";

const sizes = [
  { id: "regular", label: "Regular (square-ish)" },
  { id: "wide", label: "Wide (best for landscape photos)" },
  { id: "tall", label: "Tall (best for portrait photos & phone videos)" },
];

export function ProjectForm({ project }: { project: Project | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [f, setF] = useState({
    title: project?.title ?? "",
    category: project?.category ?? "sofas",
    description: project?.description ?? "",
    imageSrc: project?.image.src ?? "",
    imageAlt: project?.image.alt ?? "",
    videoSrc: project?.video ?? "",
    size: project?.size ?? "regular",
    focus: project?.focus ?? "",
    visible: project?.visible ?? true,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((s) => ({ ...s, [k]: v }));
    setSaved(false);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!f.imageSrc) return setError("Please upload a photo or video first.");
    start(async () => {
      const res = await saveProject({ ...f, id: project?.id });
      if (!res.ok) return setError(res.error);
      if (!project) router.push("/admin/projects");
      else {
        setSaved(true);
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-2">
        <Field label="Photo or video">
          <MediaPicker
            mode="image-or-video"
            image={f.imageSrc}
            video={f.videoSrc || undefined}
            onChange={({ image, video }) => {
              set("imageSrc", image);
              set("videoSrc", video ?? "");
              if (video && f.size === "regular") set("size", "tall");
            }}
          />
        </Field>
      </Card>
      <Card className="space-y-5 lg:col-span-3">
        <Field label="Title" htmlFor="title">
          <Input id="title" value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={120} required placeholder="e.g. Upholstered Bed Frames" />
        </Field>
        <Field label="Category (filter on the Projects page)" htmlFor="category">
          <Select id="category" value={f.category} onChange={(e) => set("category", e.target.value as Project["category"])}>
            {projectCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description" htmlFor="description">
          <TextArea id="description" value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={600} rows={3} placeholder="What was made, materials, colour, finish…" />
        </Field>
        <Field label="Photo description (for blind visitors & Google)" htmlFor="alt" hint="One sentence describing what's in the picture.">
          <Input id="alt" value={f.imageAlt} onChange={(e) => set("imageAlt", e.target.value)} maxLength={200} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Tile size in gallery" htmlFor="size">
            <Select id="size" value={f.size} onChange={(e) => set("size", e.target.value as Project["size"])}>
              {sizes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Crop focus (optional)" htmlFor="focus" hint="e.g. “50% 30%” keeps the upper part in view.">
            <Input id="focus" value={f.focus} onChange={(e) => set("focus", e.target.value)} maxLength={20} placeholder="50% 50%" />
          </Field>
        </div>
        <Toggle checked={f.visible} onChange={(v) => set("visible", v)} label="Show on the website" />
        {error && <Notice tone="error">{error}</Notice>}
        {saved && <Notice tone="success">Saved — the website is updated.</Notice>}
        <div className="flex flex-wrap gap-2 border-t border-espresso/10 pt-5">
          <button type="submit" className={btn.primary} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} {project ? "Save changes" : "Add project"}
          </button>
          <Link href="/admin/projects" className={btn.secondary}>
            Back to projects
          </Link>
        </div>
      </Card>
    </form>
  );
}
