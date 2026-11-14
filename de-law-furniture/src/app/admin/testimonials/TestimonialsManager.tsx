"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Loader2, Plus } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminApp";
import { ItemControls } from "@/components/admin/ItemControls";
import { Card, Field, Input, Notice, TextArea, Toggle, btn } from "@/components/admin/ui";
import type { Testimonial } from "@/lib/types";

const empty = { quote: "", name: "", detail: "", visible: true };

export function TestimonialsManager({ testimonials, onChanged }: { testimonials: Testimonial[]; onChanged: () => void }) {
  const { api } = useAdmin();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<number | "new" | null>(testimonials.length ? null : "new");
  const [f, setF] = useState(empty);
  const [error, setError] = useState<string | null>(null);

  const edit = (t?: Testimonial) => {
    setError(null);
    setEditing(t ? t.id : "new");
    setF(t ? { quote: t.quote, name: t.name, detail: t.detail ?? "", visible: t.visible } : empty);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await api.saveTestimonial({ ...f, id: editing === "new" ? undefined : (editing ?? undefined) });
      if (!res.ok) return setError(res.error);
      setEditing(null);
      setF(empty);
      onChanged();
    });
  };

  const form = (
    <Card className="space-y-5">
      <form onSubmit={submit} className="space-y-5">
        <h2 className="display text-2xl text-espresso">{editing === "new" ? "Add a testimonial" : "Edit testimonial"}</h2>
        <Field label="Customer's review" htmlFor="quote">
          <TextArea id="quote" required maxLength={800} rows={4} value={f.quote} onChange={(e) => setF({ ...f, quote: e.target.value })} placeholder="Their words, exactly as they gave them." />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Customer name" htmlFor="tname" hint="First name and initial is fine, e.g. “Adaeze O.”">
            <Input id="tname" required maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <Field label="Details (optional)" htmlFor="detail" hint="e.g. “Wardrobe & bed frame, Ikeja”">
            <Input id="detail" maxLength={120} value={f.detail} onChange={(e) => setF({ ...f, detail: e.target.value })} />
          </Field>
        </div>
        <Toggle checked={f.visible} onChange={(v) => setF({ ...f, visible: v })} label="Show on the website" />
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex flex-wrap gap-2">
          <button type="submit" className={btn.primary} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save testimonial
          </button>
          {testimonials.length > 0 && (
            <button type="button" className={btn.secondary} onClick={() => setEditing(null)}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </Card>
  );

  return (
    <div className="space-y-6">
      {editing === null && (
        <button type="button" className={btn.primary} onClick={() => edit()}>
          <Plus className="h-4 w-4" /> Add testimonial
        </button>
      )}
      {editing === "new" && form}
      {testimonials.length > 0 && (
        <ol className="divide-y divide-espresso/10 border border-espresso/10 bg-white">
          {testimonials.map((t, i) =>
            editing === t.id ? (
              <li key={t.id} className="p-2">
                {form}
              </li>
            ) : (
              <li key={t.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
                <div className="flex-1">
                  <p className="text-sm italic text-espresso">“{t.quote}”</p>
                  <p className="mt-2 text-xs text-taupe">
                    — {t.name}
                    {t.detail ? `, ${t.detail}` : ""}
                    {!t.visible && <span className="text-[#a4442e]"> · Hidden</span>}
                  </p>
                </div>
                <ItemControls
                  table="testimonials"
                  id={t.id}
                  visible={t.visible}
                  first={i === 0}
                  last={i === testimonials.length - 1}
                  onEdit={() => edit(t)}
                  onDelete={() => api.deleteTestimonial(t.id)}
                  deleteConfirm={`Delete the review from ${t.name}? This can't be undone.`}
                  onChanged={onChanged}
                />
              </li>
            )
          )}
        </ol>
      )}
    </div>
  );
}
