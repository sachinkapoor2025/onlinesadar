"use client";

import { useEffect, useState } from "react";
import { useApiClient } from "@/lib/auth-context";

export default function SellerSubscriptionPage() {
  const apiClient = useApiClient();
  const [info, setInfo] = useState<{
    seller: { subscriptionPlan: string; trialEndsAt?: string; monthlyGmvInr: number };
    recommendedPlan: string;
    priceInr: number | null;
  } | null>(null);

  useEffect(() => {
    apiClient<typeof info>("/seller/subscription").then(setInfo);
  }, [apiClient]);

  async function activate(plan: "starter" | "growth") {
    const data = await apiClient<{ seller: unknown; amountInr: number }>("/seller/subscription/activate", {
      method: "POST",
      body: JSON.stringify({ plan }),
    });
    alert(`Plan activated — ₹${data.amountInr}/month (Razorpay billing in production)`);
    apiClient<typeof info>("/seller/subscription").then(setInfo);
  }

  if (!info) return <p className="text-slate-500">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Subscription</h1>
      <div className="bg-white border rounded-xl p-5 mb-6">
        <p>Current plan: <strong className="capitalize">{info.seller.subscriptionPlan}</strong></p>
        {info.seller.trialEndsAt && (
          <p className="text-sm text-slate-600">Trial ends: {new Date(info.seller.trialEndsAt).toLocaleDateString()}</p>
        )}
        <p className="text-sm text-slate-600">30-day GMV: ₹{(info.seller.monthlyGmvInr ?? 0).toLocaleString("en-IN")}</p>
        <p className="text-sm mt-2">Recommended: <strong className="capitalize">{info.recommendedPlan}</strong></p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="border rounded-xl p-5">
          <p className="text-2xl font-bold">₹2,500<span className="text-sm font-normal">/mo</span></p>
          <p className="text-slate-600 text-sm mb-4">Sales up to ₹5 lakh/month</p>
          <button type="button" onClick={() => void activate("starter")} className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
            Activate Starter
          </button>
        </div>
        <div className="border rounded-xl p-5">
          <p className="text-2xl font-bold">₹5,000<span className="text-sm font-normal">/mo</span></p>
          <p className="text-slate-600 text-sm mb-4">Sales ₹5L – ₹50L/month</p>
          <button type="button" onClick={() => void activate("growth")} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold">
            Activate Growth
          </button>
        </div>
      </div>
    </div>
  );
}
