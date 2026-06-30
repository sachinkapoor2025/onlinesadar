import Link from "next/link";
import type { Product } from "@onlinesadar/shared";
import { FAST_SELLING_THRESHOLD, isFastSelling, sortByUnitsSold } from "@onlinesadar/shared";
import { HomeProductCard } from "@/components/HomeProductCard";

type FastSellingSectionProps = {
  products: Product[];
  /** Max cards to show (default 10). */
  limit?: number;
};

export function FastSellingSection({ products, limit = 10 }: FastSellingSectionProps) {
  const fastSelling = products.filter(isFastSelling).sort(sortByUnitsSold).slice(0, limit);

  if (fastSelling.length === 0) return null;

  return (
    <section className="bg-gradient-to-br from-orange-50 via-amber-50/80 to-white border-y border-orange-100/80">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-orange-600 mb-1">Trending now</p>
            <h2 className="text-2xl md:text-3xl font-bold text-primary">Fast Selling Rakhis</h2>
            <p className="text-sm text-slate-600 mt-2 max-w-xl">
              Sisters are ordering these most — {FAST_SELLING_THRESHOLD}+ sold. Grab yours before they sell out
              for Raksha Bandhan.
            </p>
          </div>
          <Link href="/products" className="text-nav font-semibold text-sm hover:underline shrink-0">
            Shop all →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-stretch">
          {fastSelling.map((p) => (
            <HomeProductCard key={p.slug} product={p} showFastSellingBadge />
          ))}
        </div>
      </div>
    </section>
  );
}
