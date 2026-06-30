"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { Order } from "@onlinesadar/shared";

export function BalanceProofForm({
  order,
  sessionId,
  token,
  onUpdated,
}: {
  order: Order;
  sessionId?: string;
  token?: string;
  onUpdated: (order: Order) => void;
}) {
  const [utr, setUtr] = useState("");
  const [amount, setAmount] = useState(String(order.balanceAmount ?? ""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (order.orderType !== "token") return null;
  if (order.status !== "balance_pending" && order.status !== "token_paid") return null;
  if (order.balanceProof) {
    return (
      <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm">
        <p className="font-semibold">Balance proof submitted</p>
        <p>UTR: {order.balanceProof.utrNumber} · ₹{order.balanceProof.amount}</p>
        <p className="text-slate-600 mt-1">Seller will confirm once payment is received in their bank account.</p>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api<{ order: Order }>(`/orders/${order.orderId}/balance-proof`, {
        method: "POST",
        sessionId,
        token,
        body: JSON.stringify({ utrNumber: utr, amount: Number(amount) }),
      });
      onUpdated(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 p-4 border rounded-lg space-y-3">
      <p className="font-semibold text-sm">Pay balance to seller & submit proof</p>
      <p className="text-xs text-slate-600">
        Transfer ₹{order.balanceAmount?.toLocaleString("en-IN")} directly to the seller&apos;s bank account, then enter UTR details below.
      </p>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <input required placeholder="UTR / transaction reference" value={utr} onChange={(e) => setUtr(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
      <input required type="number" placeholder="Amount transferred" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
      <button type="submit" disabled={loading} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
        {loading ? "Submitting..." : "Submit balance proof"}
      </button>
    </form>
  );
}
