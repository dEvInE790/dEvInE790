"use client";

import { useParams } from "next/navigation";
import { useAdmin } from "@/components/admin/AdminApp";
import { useLoad } from "@/components/admin/useLoad";
import { LoadState } from "@/components/admin/LoadState";
import { PageTitle } from "@/components/admin/ui";
import { ProductForm } from "./ProductForm";

export default function EditProduct() {
  const { id, pid } = useParams<{ id: string; pid: string }>();
  const { api } = useAdmin();
  const { data: category, error, loading, reload } = useLoad(async () => (await api.listCatalogue()).find((c) => c.id === Number(id)) ?? null, [api, id]);
  if (!category) return loading || error ? <LoadState loading={loading} error={error} onRetry={reload} /> : <p className="text-sm text-taupe">This collection no longer exists.</p>;
  const product = pid === "new" ? null : category.products.find((p) => p.id === Number(pid));
  if (pid !== "new" && !product) return <p className="text-sm text-taupe">This product no longer exists.</p>;
  return (
    <>
      <PageTitle
        title={product ? product.name : `Add product to ${category.name}`}
        intro={
          product ? (
            <a className="underline underline-offset-4" href={`/collections/${category.slug}/${product.slug}`} target="_blank" rel="noopener noreferrer">
              View on website ↗
            </a>
          ) : (
            "No prices are shown on the website — every product leads to a personalised quotation."
          )
        }
      />
      <ProductForm categoryId={category.id} categoryName={category.name} product={product ?? null} />
    </>
  );
}
