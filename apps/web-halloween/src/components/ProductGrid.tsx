"use client";

import { useSearchParams } from "next/navigation";
import { HomeProductCard } from "@/components/HomeProductCard";
import { ProductSortBar, sortProducts, type ProductSort } from "@/components/ProductSortBar";
import type { Product } from "@hr-ecom/shared";

export function ProductGrid({ products, showSort = true }: { products: Product[]; showSort?: boolean }) {
  const searchParams = useSearchParams();
  const sort = (searchParams.get("sort") as ProductSort) || "featured";
  const sorted = sortProducts(products, sort);

  return (
    <>
      {showSort && products.length > 1 && (
        <div className="flex justify-end mb-4">
          <ProductSortBar />
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-stretch">
        {sorted.map((p) => (
          <HomeProductCard key={p.slug} product={p} />
        ))}
      </div>
    </>
  );
}
