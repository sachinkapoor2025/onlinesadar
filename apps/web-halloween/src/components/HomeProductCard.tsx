"use client";

import Link from "next/link";
import type { Product } from "@hr-ecom/shared";
import { isFastSelling } from "@hr-ecom/shared";
import { AddToCartControl } from "@/components/AddToCartControl";
import { WishlistButton } from "@/components/WishlistButton";
import { FastSellingBadge } from "@/components/FastSellingBadge";
import { useCurrency } from "@/lib/currency-context";
import { getDiscountPercent } from "@/lib/pricing";
import { resolveImageUrl } from "@/lib/images";

export function HomeProductCard({
  product,
  showFastSellingBadge = false,
}: {
  product: Product;
  showFastSellingBadge?: boolean;
}) {
  const { format } = useCurrency();
  const discount = getDiscountPercent(product.price, product.compareAtPrice);
  const fastSelling = showFastSellingBadge || isFastSelling(product);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white hover:shadow-md transition-shadow relative flex h-full flex-col">
      {discount !== null && (
        <span className="absolute top-3 left-3 z-10 bg-accent text-white text-xs font-bold px-2 py-1 rounded">
          {discount}% OFF
        </span>
      )}
      {fastSelling && (
        <div className={`absolute top-3 z-10 ${discount !== null ? "right-3" : "left-3"}`}>
          <FastSellingBadge />
        </div>
      )}
      <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-slate-50">
        <WishlistButton product={product} />
        <Link href={`/products/${product.slug}`} className="absolute inset-0 block">
          {product.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolveImageUrl(product.images[0])}
              alt={product.name}
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">No image</div>
          )}
        </Link>
      </div>
      <Link href={`/products/${product.slug}`} className="block flex-1">
        <div className="p-3 flex h-full flex-col">
          <h3 className="font-semibold text-sm text-slate-900 line-clamp-2 min-h-[2.75rem] hover:text-nav">
            {product.name}
          </h3>
          <div className="mt-2 flex items-center gap-2 w-full">
            <span className="text-nav font-bold">{format(product.price, product.currency)}</span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-xs text-slate-400 line-through">
                {format(product.compareAtPrice, product.currency)}
              </span>
            )}
            {discount !== null && (
              <span className="text-xs font-semibold text-green-600 ml-auto shrink-0">{discount}% OFF</span>
            )}
          </div>
        </div>
      </Link>
      <div className="mt-auto px-3 pb-3">
        <AddToCartControl productSlug={product.slug} disabled={product.inventory <= 0} />
      </div>
    </div>
  );
}
