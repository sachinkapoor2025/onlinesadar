"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApiClient } from "@/lib/auth-context";
import type { Product } from "@onlinesadar/shared";

export default function SellerProductsPage() {
  const apiClient = useApiClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient<{ products: Product[] }>("/seller/products")
      .then((d) => setProducts(d.products))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load products"))
      .finally(() => setLoading(false));
  }, [apiClient]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your products</h1>
        <Link href="/seller/products/new" className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          + Add product
        </Link>
      </div>

      {loading && <p className="text-slate-500">Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && products.length === 0 && (
        <div className="bg-white border rounded-xl p-10 text-center">
          <p className="text-slate-600 mb-4">No products yet. Use the listing wizard to add your first product.</p>
          <Link href="/seller/products/new" className="text-orange-600 font-semibold">
            Start listing wizard →
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {products.map((p) => (
          <div key={p.slug} className="bg-white border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{p.name}</p>
              <p className="text-sm text-slate-500">
                MOQ {p.moq} {p.moqUnit} · ₹{p.price}/unit · {p.published ? "Published" : "Draft"}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/products/${p.slug}`} className="text-sm text-primary hover:underline">
                View
              </Link>
              <Link href={`/seller/products/new?edit=${p.slug}`} className="text-sm text-slate-600 hover:underline">
                Edit
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
