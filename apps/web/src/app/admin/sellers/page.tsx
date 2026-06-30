"use client";

import { useEffect, useState } from "react";
import { useApiClient } from "@/lib/auth-context";
import type { Seller } from "@onlinesadar/shared";

export default function AdminSellersPage() {
  const apiClient = useApiClient();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient<{ sellers: Seller[] }>("/admin/sellers")
      .then((d) => setSellers(d.sellers))
      .finally(() => setLoading(false));
  }, [apiClient]);

  async function review(sellerId: string, action: "verify" | "suspend") {
    await apiClient(`/admin/sellers/${sellerId}`, {
      method: "PATCH",
      body: JSON.stringify({ action }),
    });
    setSellers((prev) =>
      prev.map((s) =>
        s.sellerId === sellerId
          ? { ...s, status: action === "verify" ? "verified" : "suspended" }
          : s
      )
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Sellers</h1>
      {loading && <p className="text-slate-500">Loading...</p>}
      <div className="space-y-3">
        {sellers.map((s) => (
          <div key={s.sellerId} className="bg-white border rounded-xl p-4 flex flex-wrap justify-between gap-3">
            <div>
              <p className="font-semibold">{s.businessName}</p>
              <p className="text-sm text-slate-500">{s.email} · {s.city} · {s.productCount} products</p>
              <p className="text-sm capitalize">Status: {s.status.replace(/_/g, " ")}</p>
            </div>
            <div className="flex gap-2">
              {s.status === "pending_review" && (
                <button type="button" onClick={() => void review(s.sellerId, "verify")} className="text-sm bg-green-600 text-white px-3 py-1 rounded">
                  Verify
                </button>
              )}
              {s.status !== "suspended" && (
                <button type="button" onClick={() => void review(s.sellerId, "suspend")} className="text-sm border px-3 py-1 rounded">
                  Suspend
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
