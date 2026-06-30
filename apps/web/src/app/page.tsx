import type { Metadata } from "next";
import Link from "next/link";
import { api } from "@/lib/api";
import { BannerCarousel } from "@/components/BannerCarousel";
import { HomeProductCard } from "@/components/HomeProductCard";
import { TrustStrip } from "@/components/TrustStrip";
import { JsonLd } from "@/components/JsonLd";
import { site, homeBanners, homeCategoryOrder, faqs } from "@/lib/site";
import { faqJsonLd, pageMetadata } from "@/lib/seo";
import type { Product, Category } from "@onlinesadar/shared";

export const metadata: Metadata = pageMetadata({
  title: "Wholesale Bulk Products — Sadar Market Online",
  description: site.description,
  path: "/",
});

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let products: Product[] = [];
  let categories: Category[] = [];

  try {
    const [productsData, categoriesData] = await Promise.all([
      api<{ products: Product[] }>("/products"),
      api<{ categories: Category[] }>("/categories"),
    ]);
    products = productsData.products;
    categories = categoriesData.categories;
  } catch {
    products = [];
    categories = [];
  }

  const categoryMap = new Map(categories.map((c) => [c.slug, c]));
  const productsByCategory = homeCategoryOrder.map((slug) => ({
    slug,
    name: categoryMap.get(slug)?.name ?? slug.replace(/-/g, " "),
    products: products.filter((p) => p.categorySlug === slug).slice(0, 4),
  }));

  return (
    <div>
      <JsonLd data={[faqJsonLd(faqs)]} />
      <BannerCarousel banners={homeBanners} />
      <TrustStrip />

      <section className="max-w-4xl mx-auto px-4 py-10 text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-primary mb-4">
          Sadar Market Wholesale — Online
        </h1>
        <p className="text-slate-600 leading-relaxed mb-4">
          {site.name} connects bulk buyers with verified Delhi Sadar Market sellers. Transparent MOQ,
          tier pricing, sample orders, token payment for large bookings, and shipping across India and
          worldwide.
        </p>
        <div className="flex flex-wrap justify-center gap-3 text-sm">
          <Link href="/products" className="text-nav font-semibold hover:underline">
            Browse all products →
          </Link>
          <Link href="/seller" className="text-nav font-semibold hover:underline">
            Sell on OnlineSadar →
          </Link>
        </div>
      </section>

      {productsByCategory.map((section) =>
        section.products.length > 0 ? (
          <section key={section.slug} className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold capitalize">{section.name}</h2>
              <Link href={`/categories/${section.slug}`} className="text-sm text-nav font-semibold hover:underline">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {section.products.map((p) => (
                <HomeProductCard key={p.slug} product={p} />
              ))}
            </div>
          </section>
        ) : null
      )}

      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-xl font-bold mb-6 text-center">Frequently asked questions</h2>
        <div className="space-y-4">
          {faqs.slice(0, 5).map((f) => (
            <details key={f.q} className="bg-white border rounded-xl p-4">
              <summary className="font-semibold cursor-pointer">{f.q}</summary>
              <p className="mt-2 text-sm text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
