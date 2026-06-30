"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApiClient } from "@/lib/auth-context";
import type { Seller } from "@onlinesadar/shared";

export default function SellerDashboardPage() {
  const apiClient = useApiClient();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient<{ seller: Seller }>("/sellers/me")
      .then((d) => setSeller(d.seller))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load profile"))
      .finally(() => setLoading(false));
  }, [apiClient]);

  if (loading) return <p className="text-slate-500">Loading dashboard...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!seller) return null;

  const trialDaysLeft = seller.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(seller.trialEndsAt).getTime() - Date.now()) / (86400000)))
    : null;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">{seller.businessName}</h1>
      <p className="text-slate-600 mb-8">
        {seller.city}, {seller.state} · {seller.businessType} · Status:{" "}
        <span className="font-medium capitalize">{seller.status.replace(/_/g, " ")}</span>
      </p>

      <div className="grid md:grid-cols-3 gap-4 mb-10">
        <div className="bg-white border rounded-xl p-5">
          <p className="text-xs uppercase text-slate-400">Products listed</p>
          <p className="text-3xl font-bold">{seller.productCount ?? 0}</p>
        </div>
        <div className="bg-white border rounded-xl p-5">
          <p className="text-xs uppercase text-slate-400">Trial days left</p>
          <p className="text-3xl font-bold">{trialDaysLeft ?? "—"}</p>
        </div>
        <div className="bg-white border rounded-xl p-5">
          <p className="text-xs uppercase text-slate-400">Plan</p>
          <p className="text-3xl font-bold capitalize">{seller.subscriptionPlan}</p>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-6">
        <h2 className="font-semibold mb-4">Quick actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/seller/products/new" className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
            Add product
          </Link>
          <Link href="/seller/products" className="border px-4 py-2 rounded-lg text-sm font-semibold">
            Manage products
          </Link>
        </div>
      </div>

      <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-900">
        <strong>Next steps:</strong> Upload GST certificate and bank details in your profile before accepting
        orders. Document upload will be available in Phase 2 — contact support@onlinesadar.com for early verification.
      </div>
    </div>
  );
}
