import type { Product } from "@hr-ecom/shared";
import { api } from "./api";
import {
  getCatalogProduct,
  getCatalogProducts,
  getCatalogProductsByCategory,
} from "./catalog-fallback";

export async function loadProduct(slug: string): Promise<Product | null> {
  try {
    const data = await api<{ product: Product }>(`/products/${slug}`, { revalidate: 3600 });
    return data.product;
  } catch {
    return getCatalogProduct(slug) ?? null;
  }
}

export async function loadRelatedProducts(categorySlug: string, excludeSlug: string): Promise<Product[]> {
  try {
    const data = await api<{ products: Product[] }>(`/products?category=${categorySlug}`, {
      revalidate: 3600,
    });
    return data.products.filter((p) => p.slug !== excludeSlug).slice(0, 5);
  } catch {
    return getCatalogProductsByCategory(categorySlug)
      .filter((p) => p.slug !== excludeSlug)
      .slice(0, 5);
  }
}

/** Prefer catalog slugs at build time — avoids CI/API rate-limit prerender failures. */
export function getStaticProductSlugs(): string[] {
  const fromCatalog = getCatalogProducts().map((p) => p.slug);
  if (fromCatalog.length > 0) return fromCatalog;
  return [];
}
