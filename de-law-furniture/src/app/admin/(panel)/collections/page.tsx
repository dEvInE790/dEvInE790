import Link from "next/link";
import { Plus } from "lucide-react";
import { getCatalogue } from "@/lib/content";
import { PageTitle } from "@/components/admin/ui";
import { btn } from "@/components/admin/styles";
import { RowControls } from "./RowControls";

export const metadata = { title: "Collections" };

export default async function AdminCollections() {
  const catalogue = await getCatalogue(true);
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
            <RowControls kind="category" id={c.id} name={c.name} visible={c.visible} first={i === 0} last={i === catalogue.length - 1} productCount={c.products.length} />
          </li>
        ))}
      </ol>
    </>
  );
}
