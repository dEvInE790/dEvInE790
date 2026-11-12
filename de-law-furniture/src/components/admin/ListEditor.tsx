"use client";

import { Plus, X } from "lucide-react";
import { btn } from "./ui";

/** Edit a short list of text lines (features, customisation options). */
export function ListEditor({ items, onChange, placeholder, max = 20 }: { items: string[]; onChange: (v: string[]) => void; placeholder?: string; max?: number }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={item}
            maxLength={200}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
            className="w-full border border-espresso/20 bg-white px-3 py-2 text-[0.95rem] outline-none focus:border-espresso"
            placeholder={placeholder}
            aria-label={`Item ${i + 1}`}
          />
          <button type="button" className={btn.icon} onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Remove item ${i + 1}`}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      {items.length < max && (
        <button type="button" className={btn.secondary} onClick={() => onChange([...items, ""])}>
          <Plus className="h-4 w-4" /> Add line
        </button>
      )}
    </div>
  );
}
