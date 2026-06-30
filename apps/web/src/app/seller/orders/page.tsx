"use client";

import { useEffect, useState } from "react";
import { useApiClient } from "@/lib/auth-context";
import type { Order } from "@onlinesadar/shared";

export default function SellerOrdersPage() {
  const apiClient = useApiClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient<{ orders: Order[] }>("/seller/orders")
      .then((d) => setOrders(d.orders))
      .finally(() => setLoading(false));
  }, [apiClient]);

  async function confirmBalance(orderId: string) {
    await apiClient(`/orders/${orderId}/confirm-balance`, { method: "POST" });
    setOrders((prev) =>
      prev.map((o) => (o.orderId === orderId ? { ...o, status: "balance_received" as Order["status"] } : o))
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Orders</h1>
      {loading && <p className="text-slate-500">Loading...</p>}
      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.orderId} className="bg-white border rounded-xl p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <p className="font-semibold">#{o.orderId.slice(0, 8)} · {o.orderType ?? "bulk"}</p>
                <p className="text-sm text-slate-500 capitalize">{o.status.replace(/_/g, " ")}</p>
              </div>
              <p className="font-bold">₹{o.total}</p>
            </div>
            {o.orderType === "token" && o.balanceProof && o.status === "balance_pending" && (
              <div className="mt-3 p-3 bg-amber-50 rounded-lg text-sm">
                <p>UTR: {o.balanceProof.utrNumber} · ₹{o.balanceProof.amount}</p>
                <button
                  type="button"
                  onClick={() => void confirmBalance(o.orderId)}
                  className="mt-2 text-sm bg-primary text-white px-3 py-1 rounded"
                >
                  Confirm balance received
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {!loading && orders.length === 0 && <p className="text-slate-500">No orders yet.</p>}
    </div>
  );
}
