"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApiClient } from "@/lib/auth-context";
import type { Product } from "@onlinesadar/shared";

interface PublicSeller {
  sellerId: string;
  slug: string;
  businessName: string;
  businessType: string;
  city: string;
  state: string;
  status: string;
  productCount: number;
}

export default function SellerProfilePage({ slug }: { slug: string }) {
  const apiClient = useApiClient();
  const [seller, setSeller] = useState<PublicSeller | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient<{ seller: PublicSeller }>(`/sellers/${slug}`),
      apiClient<{ products: Product[] }>(`/products?seller=${slug}`).catch(() => ({ products: [] })),
    ])
      .then(([s, p]) => {
        setSeller(s.seller);
        setProducts(p.products ?? []);
      })
      .catch(() => setSeller(null))
      .finally(() => setLoading(false));
  }, [apiClient, slug]);

  if (loading) return <p className="text-slate-500 p-8">Loading seller...</p>;
  if (!seller) return <p className="p-8">Seller not found.</p>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8">
        <p className="text-sm text-orange-600 font-semibold uppercase">Verified seller</p>
        <h1 className="text-3xl font-bold text-primary">{seller.businessName}</h1>
        <p className="text-slate-600 capitalize">
          {seller.businessType} · {seller.city}, {seller.state} · {seller.productCount} products
        </p>
      </div>

      <h2 className="text-xl font-bold mb-4">Products from this seller</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((p) => (
          <Link key={p.slug} href={`/products/${p.slug}`} className="border rounded-xl p-3 hover:shadow-md bg-white">
            {p.images?.[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.images[0]} alt={p.name} className="aspect-square object-cover rounded-lg mb-2 w-full" />
            )}
            <p className="font-semibold text-sm line-clamp-2">{p.name}</p>
            <p className="text-sm text-orange-700 mt-1">MOQ {p.moq} · ₹{p.price}</p>
          </Link>
        ))}
      </div>
      {products.length === 0 && <p className="text-slate-500">No published products yet.</p>}
    </div>
  );
}
