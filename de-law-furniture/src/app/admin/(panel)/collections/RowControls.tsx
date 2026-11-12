"use client";

import { ItemControls } from "@/components/admin/ItemControls";
import { deleteCategory, deleteProduct } from "@/app/admin/actions";

export function RowControls({
  kind,
  id,
  categoryId,
  name,
  visible,
  first,
  last,
  productCount = 0,
}: {
  kind: "category" | "product";
  id: number;
  categoryId?: number;
  name: string;
  visible: boolean;
  first: boolean;
  last: boolean;
  productCount?: number;
}) {
  return kind === "category" ? (
    <ItemControls
      table="categories"
      id={id}
      visible={visible}
      first={first}
      last={last}
      editHref={`/admin/collections/${id}`}
      onDelete={() => deleteCategory(id)}
      deleteConfirm={`Delete the “${name}” collection${productCount ? ` and its ${productCount} product${productCount > 1 ? "s" : ""}` : ""}? This can't be undone.`}
    />
  ) : (
    <ItemControls
      table="products"
      id={id}
      visible={visible}
      first={first}
      last={last}
      editHref={`/admin/collections/${categoryId}/products/${id}`}
      onDelete={() => deleteProduct(id)}
      deleteConfirm={`Delete “${name}”? Its uploaded photos will be removed too. This can't be undone.`}
    />
  );
}
