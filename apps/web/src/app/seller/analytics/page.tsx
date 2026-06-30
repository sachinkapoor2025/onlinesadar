"use client";

import { useEffect, useState } from "react";
import { useApiClient } from "@/lib/auth-context";

export default function SellerAnalyticsPage() {
  const apiClient = useApiClient();
  const [data, setData] = useState<{
    productCount: number;
    totalUnitsSold: number;
    orderCount: number;
    revenueInr: number;
    topProducts: { slug: string; name: string; unitsSold: number }[];
  } | null>(null);

  useEffect(() => {
    apiClient<{ analytics: typeof data }>("/seller/analytics").then((d) => setData(d.analytics));
  }, [apiClient]);

  if (!data) return <p className="text-slate-500">Loading analytics...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Products", value: data.productCount },
          { label: "Units sold", value: data.totalUnitsSold },
          { label: "Orders", value: data.orderCount },
          { label: "Revenue", value: `₹${data.revenueInr.toLocaleString("en-IN")}` },
        ].map((k) => (
          <div key={k.label} className="bg-white border rounded-xl p-5">
            <p className="text-xs uppercase text-slate-400">{k.label}</p>
            <p className="text-2xl font-bold">{k.value}</p>
          </div>
        ))}
      </div>
      <h2 className="font-semibold mb-3">Top products</h2>
      <div className="space-y-2">
        {data.topProducts.map((p) => (
          <div key={p.slug} className="flex justify-between bg-white border rounded-lg px-4 py-3 text-sm">
            <span>{p.name}</span>
            <span>{p.unitsSold} sold</span>
          </div>
        ))}
      </div>
    </div>
  );
}
