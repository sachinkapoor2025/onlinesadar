"use client";

import { useEffect, useState } from "react";
import { useApiClient } from "@/lib/auth-context";

type Rfq = {
  rfqId: string;
  productName: string;
  buyerName: string;
  buyerEmail: string;
  quantity: number;
  status: string;
  message?: string;
};

export default function SellerRfqsPage() {
  const apiClient = useApiClient();
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});

  useEffect(() => {
    apiClient<{ rfqs: Rfq[] }>("/seller/rfqs").then((d) => setRfqs(d.rfqs));
  }, [apiClient]);

  async function respond(rfqId: string) {
    const response = responses[rfqId];
    if (!response?.trim()) return;
    await apiClient(`/seller/rfqs/${rfqId}/respond`, {
      method: "POST",
      body: JSON.stringify({ response }),
    });
    setRfqs((prev) => prev.map((r) => (r.rfqId === rfqId ? { ...r, status: "responded" } : r)));
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Quote requests (RFQ)</h1>
      <div className="space-y-4">
        {rfqs.map((r) => (
          <div key={r.rfqId} className="bg-white border rounded-xl p-4">
            <p className="font-semibold">{r.productName}</p>
            <p className="text-sm text-slate-600">{r.buyerName} · {r.buyerEmail} · Qty {r.quantity}</p>
            {r.message && <p className="text-sm mt-2">{r.message}</p>}
            {r.status === "open" ? (
              <div className="mt-3 flex gap-2">
                <input
                  placeholder="Your quote / response"
                  value={responses[r.rfqId] ?? ""}
                  onChange={(e) => setResponses((p) => ({ ...p, [r.rfqId]: e.target.value }))}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                />
                <button type="button" onClick={() => void respond(r.rfqId)} className="bg-primary text-white px-4 py-2 rounded-lg text-sm">
                  Send
                </button>
              </div>
            ) : (
              <p className="text-green-700 text-sm mt-2">Responded</p>
            )}
          </div>
        ))}
      </div>
      {rfqs.length === 0 && <p className="text-slate-500">No RFQs yet.</p>}
    </div>
  );
}
