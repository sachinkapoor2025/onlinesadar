import type { Metadata } from "next";
import Link from "next/link";
import { api } from "@/lib/api";
import { HomeProductCard } from "@/components/HomeProductCard";
import { Suspense } from "react";
import { ProductGrid } from "@/components/ProductGrid";
import { SearchTracker } from "@/components/SearchTracker";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { pageMetadata } from "@/lib/seo";
import type { Product, Category } from "@onlinesadar/shared";
import { homeCategoryOrder, orderCategories } from "@/lib/site";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ search?: string; category?: string }>;
}

const CATEGORY_SEO: Record<string, { title: string; description: string }> = {
  "single-rakhi": {
    title: "Single Rakhi USA — Send to Brother Online",
    description: "Shop single rakhis with roli chawal. Send Rakhi to USA — traditional, Om, pearl & designer styles. 5–7 day delivery.",
  },
  "rakhi-combo": {
    title: "Rakhi Combo USA — Rakhi with Chocolates",
    description: "Rakhi combo sets with Ferrero Rocher, Lindt & Hershey's. Send Rakhi combo to USA with free shipping on selected orders.",
  },
  "kids-rakhi": {
    title: "Kids Rakhi USA — Cartoon & Fun Designs",
    description: "Cute kids rakhis for little brothers in USA. Soft, colorful, child-friendly designs with fast US delivery.",
  },
  "bhaiya-bhabhi-rakhi": {
    title: "Bhaiya Bhabhi Rakhi USA — Matching Sets",
    description: "Elegant Bhaiya Bhabhi Rakhi sets with Lumba for sister-in-law. Send to USA for Raksha Bandhan.",
  },
  "lumba-rakhi": {
    title: "Lumba Rakhi USA — Bracelet Rakhi for Bhabhi",
    description: "Beautiful Lumba rakhis for Bhabhi. Send Lumba Rakhi to USA with premium packaging and fast delivery.",
  },
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  if (params.search) {
    return pageMetadata({
      title: `Search: ${params.search} — Rakhi USA`,
      description: `Search results for "${params.search}" — premium Rakhis with USA delivery from UsaRakhi.`,
      path: `/products?search=${encodeURIComponent(params.search)}`,
    });
  }
  if (params.category && CATEGORY_SEO[params.category]) {
    const seo = CATEGORY_SEO[params.category];
    return pageMetadata({
      title: seo.title,
      description: seo.description,
      path: `/products?category=${params.category}`,
    });
  }
  return pageMetadata({
    title: "Shop Rakhi — Send Rakhi to USA Online",
    description:
      "Browse 126+ premium Rakhis — single, combo, kids, Bhaiya Bhabhi & Lumba. Send Rakhi to all 50 US states. Order from India worldwide.",
    path: "/products",
  });
}

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;
  const search = params.search;
  const category = params.category;

  let products: Product[] = [];
  let categories: Category[] = [];

  try {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (category) query.set("category", category);
    const qs = query.toString() ? `?${query.toString()}` : "";

    const [productsData, categoriesData] = await Promise.all([
      api<{ products: Product[] }>(`/products${qs}`),
      api<{ categories: Category[] }>("/categories"),
    ]);
    products = productsData.products;
    categories = categoriesData.categories;
  } catch {
    products = [];
    categories = [];
  }

  const h1 = search
    ? `Search: ${search}`
    : category
      ? categories.find((c) => c.slug === category)?.name ?? category.replace(/-/g, " ")
      : "Shop Rakhi — Send to USA";

  const sortedCategories = orderCategories(categories);
  const categoryMap = new Map(categories.map((c) => [c.slug, c]));
  const productsByCategory = homeCategoryOrder.map((slug) => ({
    slug,
    name: categoryMap.get(slug)?.name ?? slug.replace(/-/g, " "),
    products: products.filter((p) => p.categorySlug === slug),
  }));
  const showGrouped = !search && !category;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {search ? <SearchTracker query={search} resultCount={products.length} /> : null}
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          ...(category ? [{ label: h1 }] : [{ label: "Shop" }]),
        ]}
      />
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-primary">{h1}</h1>
      </div>
      {!search && !category && (
        <p className="text-slate-600 mb-8 max-w-2xl">
          Premium Rakhis for Raksha Bandhan — delivered to all 50 US states. Order from India, UK, Canada, or
          anywhere; enter your brother&apos;s US address at checkout.
        </p>
      )}

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <Link
            href="/products"
            className={`px-3 py-1 rounded-full text-sm border ${!category ? "bg-nav text-white border-nav" : "border-slate-300 hover:border-nav"}`}
          >
            All
          </Link>
          {sortedCategories.map((c) => (
            <Link
              key={c.slug}
              href={`/categories/${c.slug}`}
              className={`px-3 py-1 rounded-full text-sm border ${category === c.slug ? "bg-nav text-white border-nav" : "border-slate-300 hover:border-nav"}`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      {products.length === 0 ? (
        <p className="text-slate-600">No products found. Try another category or search term.</p>
      ) : showGrouped ? (
        <div className="space-y-10">
          {productsByCategory.map((section) =>
            section.products.length > 0 ? (
              <section key={section.slug}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-primary capitalize">{section.name}</h2>
                  <Link href={`/categories/${section.slug}`} className="text-nav font-semibold text-sm hover:underline">
                    View All →
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-stretch">
                  {section.products.map((p) => (
                    <HomeProductCard key={p.slug} product={p} />
                  ))}
                </div>
              </section>
            ) : null
          )}
        </div>
      ) : (
        <Suspense fallback={<p className="text-slate-500">Loading products…</p>}>
          <ProductGrid products={products} />
        </Suspense>
      )}
    </div>
  );
}
