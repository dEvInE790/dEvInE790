"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminApp";
import { useLoad } from "@/components/admin/useLoad";
import { LoadState } from "@/components/admin/LoadState";
import { ItemControls } from "@/components/admin/ItemControls";
import { PageTitle } from "@/components/admin/ui";
import { btn } from "@/components/admin/styles";

export default function AdminCollections() {
  const { api } = useAdmin();
  const { data: catalogue, error, loading, reload } = useLoad(() => api.listCatalogue(), [api]);
  return (
    <>
      <PageTitle
        title="Collections"
        intro="The furniture categories on the Collections page, each with its products. Open a collection to edit it and its products."
        actions={
          <Link href="/admin/collections/new" className={btn.primary}>
            <Plus className="h-4 w-4" /> Add collection
          </Link>
        }
      />
      {!catalogue ? (
        <LoadState loading={loading} error={error} onRetry={reload} />
      ) : (
        <ol className="divide-y divide-espresso/10 border border-espresso/10 bg-white">
          {catalogue.map((c, i) => (
            <li key={c.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <Link href={`/admin/collections/${c.id}`} className="flex flex-1 items-center gap-4">
                <div className="h-16 w-20 shrink-0 overflow-hidden bg-cream">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {c.cover.src && <img src={c.cover.src} alt="" className="h-full w-full object-cover" loading="lazy" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-espresso">{c.name}</p>
                  <p className="text-xs text-taupe">
                    {c.products.length} product{c.products.length === 1 ? "" : "s"} · /collections/{c.slug}
                    {!c.visible && <span className="text-[#a4442e]"> · Hidden</span>}
                  </p>
                </div>
              </Link>
              <ItemControls
                table="categories"
                id={c.id}
                visible={c.visible}
                first={i === 0}
                last={i === catalogue.length - 1}
                editHref={`/admin/collections/${c.id}`}
                onDelete={() => api.deleteCategory(c.id)}
                deleteConfirm={`Delete the “${c.name}” collection${c.products.length ? ` and its ${c.products.length} product${c.products.length > 1 ? "s" : ""}` : ""}? This can't be undone.`}
                onChanged={reload}
              />
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
