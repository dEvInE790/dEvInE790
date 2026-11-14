"use client";

import Link from "next/link";
import { useTransition } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import type { ActionResult, Table } from "@/lib/admin-api";
import { useAdmin } from "./AdminApp";
import { btn } from "./ui";


/** Reorder / show-hide / edit / delete buttons for one row of an admin list. */
export function ItemControls({
  table,
  id,
  visible,
  first,
  last,
  editHref,
  onEdit,
  onDelete,
  deleteConfirm,
  onChanged,
}: {
  table: Table;
  id: number;
  visible: boolean;
  first: boolean;
  last: boolean;
  editHref?: string;
  onEdit?: () => void;
  onDelete: () => Promise<ActionResult>;
  deleteConfirm: string;
  /** Called after any change so the list can reload */
  onChanged: () => void;
}) {
  const { api } = useAdmin();
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) alert(res.error);
      onChanged();
    });

  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-busy={pending}>
      <button type="button" className={btn.icon} disabled={pending || first} onClick={() => run(() => api.moveItem(table, id, "up"))} aria-label="Move up" title="Move up">
        <ArrowUp className="h-4 w-4" />
      </button>
      <button type="button" className={btn.icon} disabled={pending || last} onClick={() => run(() => api.moveItem(table, id, "down"))} aria-label="Move down" title="Move down">
        <ArrowDown className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={btn.icon}
        disabled={pending}
        onClick={() => run(() => api.setVisible(table, id, !visible))}
        aria-label={visible ? "Hide from website" : "Show on website"}
        title={visible ? "Visible — click to hide" : "Hidden — click to show"}
      >
        {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-[#a4442e]" />}
      </button>
      {editHref ? (
        <Link href={editHref} className={btn.icon} aria-label="Edit" title="Edit">
          <Pencil className="h-4 w-4" />
        </Link>
      ) : (
        onEdit && (
          <button type="button" className={btn.icon} onClick={onEdit} aria-label="Edit" title="Edit">
            <Pencil className="h-4 w-4" />
          </button>
        )
      )}
      <button
        type="button"
        className={btn.icon}
        disabled={pending}
        onClick={() => confirm(deleteConfirm) && run(onDelete)}
        aria-label="Delete"
        title="Delete"
      >
        <Trash2 className="h-4 w-4 text-[#a4442e]" />
      </button>
    </div>
  );
}
