import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { Suspense } from "react";
import { ProductGrid } from "@/components/ProductGrid";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CategoryContentSection } from "@/components/CategoryContentSection";
import { JsonLd } from "@/components/JsonLd";
import { getCategoryContent } from "@/lib/content/category-content";
import { getCategoryRichContent } from "@/lib/content/category-rich-content";
import { categoryOrder } from "@/lib/site";
import { breadcrumbJsonLd, faqJsonLd, itemListJsonLd, pageMetadata } from "@/lib/seo";
import type { Product, Category } from "@onlinesadar/shared";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return categoryOrder.map((slug) => ({ slug }));
}

export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const data = await api<{ category: Category }>(`/categories/${slug}`, { revalidate: 3600 });
    const c = data.category;
    return pageMetadata({
      title: `${c.name} — Send to USA | Free Shipping`,
      description:
        c.seoDescription ??
        c.description?.slice(0, 160) ??
        `Shop ${c.name} with fast USA delivery from UsaRakhi. Premium designs, roli chawal included.`,
      path: `/categories/${slug}`,
    });
  } catch {
    return pageMetadata({
      title: `${slug.replace(/-/g, " ")} Rakhi USA`,
      description: `Shop ${slug.replace(/-/g, " ")} with USA delivery from UsaRakhi.`,
      path: `/categories/${slug}`,
    });
  }
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;

  let category: Category | null = null;
  let products: Product[] = [];

  try {
    const [catData, prodData] = await Promise.all([
      api<{ category: Category }>(`/categories/${slug}`, { revalidate: 3600 }),
      api<{ products: Product[] }>(`/products?category=${slug}`, { revalidate: 3600 }),
    ]);
    category = catData.category;
    products = prodData.products;
  } catch {
    if (!categoryOrder.includes(slug as (typeof categoryOrder)[number])) notFound();
  }

  const name = category?.name ?? slug.replace(/-/g, " ");
  const baseDescription =
    category?.description?.trim() ||
    `Browse our ${name} collection — premium Rakhis delivered to all 50 US states. Order online from India, UK, Canada, or anywhere worldwide.`;
  const extra = getCategoryContent(slug);
  const rich = getCategoryRichContent(slug);

  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/products" },
    { label: name },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs.map((c) => ({ name: c.label, path: c.href ?? `/categories/${slug}` }))),
          itemListJsonLd(
            `${name} — UsaRakhi USA`,
            products.map((p) => ({ name: p.name, path: `/products/${p.slug}` }))
          ),
          ...(rich ? [faqJsonLd(rich.faqs)] : []),
        ]}
      />
      <Breadcrumbs items={crumbs} />
      <h1 className="text-3xl font-bold text-primary mb-8">{name} — Send to USA</h1>

      {products.length > 0 ? (
        <Suspense fallback={<p className="text-slate-500">Loading products…</p>}>
          <ProductGrid products={products} />
        </Suspense>
      ) : (
        <p className="text-slate-500">
          Products loading soon.{" "}
          <Link href="/products" className="text-nav hover:underline">
            Browse all Rakhis
          </Link>
        </p>
      )}

      {rich ? (
        <CategoryContentSection content={rich} categoryName={name} />
      ) : (
        <>
          <section className="mt-12 pt-10 border-t border-slate-200">
            <div className="grid lg:grid-cols-2 gap-x-12 gap-y-6 text-slate-700 leading-relaxed">
              <div className="space-y-4">
                {baseDescription.split(/(?<=\.)\s+/).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
                {extra?.extraParagraphs.map((para, i) => (
                  <p key={`extra-${i}`}>{para}</p>
                ))}
              </div>
              {extra?.sections && extra.sections.length > 0 && (
                <div className="space-y-6">
                  {extra.sections.map((section) => (
                    <div key={section.heading}>
                      <h2 className="text-lg font-bold text-primary mb-3">{section.heading}</h2>
                      <ul className="space-y-2 text-sm">
                        {section.paragraphs.map((item, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-nav mt-1 shrink-0">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="mt-10 p-6 bg-slate-50 rounded-xl">
            <h2 className="font-semibold text-primary mb-3">Why order {name} from UsaRakhi?</h2>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-2 text-sm text-slate-600">
              <li className="flex gap-2">
                <span className="text-nav shrink-0">✓</span>
                Fast Rakhi delivery to all 50 US states (5–7 business days)
              </li>
              <li className="flex gap-2">
                <span className="text-nav shrink-0">✓</span>
                Order from India, UK, Canada, Australia — we deliver inside USA
              </li>
              <li className="flex gap-2">
                <span className="text-nav shrink-0">✓</span>
                Complimentary roli and chawal with most rakhis
              </li>
              <li className="flex gap-2">
                <span className="text-nav shrink-0">✓</span>
                Secure checkout with Razorpay and Stripe
              </li>
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
