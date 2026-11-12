import { notFound } from "next/navigation";
import { getCatalogue } from "@/lib/content";
import { PageTitle } from "@/components/admin/ui";
import { ProductForm } from "./ProductForm";

export const metadata = { title: "Edit product" };

export default async function EditProduct({ params }: { params: Promise<{ id: string; pid: string }> }) {
  const { id, pid } = await params;
  const category = (await getCatalogue(true)).find((c) => c.id === Number(id));
  if (!category) notFound();
  const product = pid === "new" ? null : category.products.find((p) => p.id === Number(pid));
  if (pid !== "new" && !product) notFound();
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
