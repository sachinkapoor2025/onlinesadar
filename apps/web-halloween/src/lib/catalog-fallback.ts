import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { Product } from "@hr-ecom/shared";

interface CatalogFile {
  products: Product[];
}

let cached: Product[] | null = null;

function resolveCatalogPath(): string | null {
  const candidates = [
    join(process.cwd(), "scripts/data/usarakhi-catalog.json"),
    join(process.cwd(), "../scripts/data/usarakhi-catalog.json"),
    join(process.cwd(), "../../scripts/data/usarakhi-catalog.json"),
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}

/** Read bundled catalog JSON — reliable during CI static generation when API is rate-limited. */
export function getCatalogProducts(): Product[] {
  if (cached) return cached;
  const path = resolveCatalogPath();
  if (!path) {
    cached = [];
    return cached;
  }
  const data = JSON.parse(readFileSync(path, "utf-8")) as CatalogFile;
  cached = data.products ?? [];
  return cached;
}

export function getCatalogProduct(slug: string): Product | undefined {
  return getCatalogProducts().find((p) => p.slug === slug);
}

export function getCatalogProductsByCategory(categorySlug: string): Product[] {
  return getCatalogProducts().filter((p) => p.categorySlug === categorySlug);
}
