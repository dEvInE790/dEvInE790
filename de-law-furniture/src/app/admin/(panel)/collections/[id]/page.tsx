import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { getCatalogue } from "@/lib/content";
import { Card, PageTitle } from "@/components/admin/ui";
import { btn } from "@/components/admin/styles";
import { CategoryForm } from "./CategoryForm";
import { RowControls } from "../RowControls";

export const metadata = { title: "Edit collection" };

export default async function EditCollection({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const category = id === "new" ? null : (await getCatalogue(true)).find((c) => c.id === Number(id));
  if (id !== "new" && !category) notFound();
  return (
    <>
      <PageTitle
        title={category ? category.name : "Add collection"}
        intro={category ? <a className="underline underline-offset-4" href={`/collections/${category.slug}`} target="_blank" rel="noopener noreferrer">View on website ↗</a> : "Create a new furniture collection. You can add products after saving."}
      />
      <CategoryForm category={category ?? null} />
      {category && (
        <Card className="mt-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="display text-3xl text-espresso">Products</h2>
            <Link href={`/admin/collections/${category.id}/products/new`} className={btn.primary}>
              <Plus className="h-4 w-4" /> Add product
            </Link>
          </div>
          {category.products.length === 0 ? (
            <p className="text-sm text-taupe">No products in this collection yet.</p>
          ) : (
            <ol className="divide-y divide-espresso/10 border border-espresso/10">
              {category.products.map((p, i) => (
                <li key={p.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                  <Link href={`/admin/collections/${category.id}/products/${p.id}`} className="flex flex-1 items-center gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden bg-cream">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.images[0] && <img src={p.images[0].src} alt="" className="h-full w-full object-cover" loading="lazy" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-espresso">{p.name}</p>
                      <p className="truncate text-xs text-taupe">
                        {p.summary || "No summary"}
                        {!p.visible && <span className="text-[#a4442e]"> · Hidden</span>}
                      </p>
                    </div>
                  </Link>
                  <RowControls kind="product" id={p.id} categoryId={category.id} name={p.name} visible={p.visible} first={i === 0} last={i === category.products.length - 1} />
                </li>
              ))}
            </ol>
          )}
        </Card>
      )}
    </>
  );
}
