"use client";

import { useEffect, useState } from "react";
import { useApiClient } from "@/lib/auth-context";
import type { PaymentConfig } from "@onlinesadar/shared";

export default function AdminPaymentsPage() {
  const apiClient = useApiClient();
  const [config, setConfig] = useState<(PaymentConfig & { updatedAt?: string }) | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiClient<{ config: PaymentConfig & { updatedAt?: string } }>("/config/payments").then((d) =>
      setConfig(d.config)
    );
  }, [apiClient]);

  const save = async () => {
    if (!config) return;
    try {
      await apiClient("/config/payments", { method: "PUT", body: JSON.stringify(config) });
      setMessage("Payment config saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    }
  };

  const resetDefaults = () => {
    setConfig({
      defaultRegion: "US",
      regions: {
        US: { provider: "stripe", currency: "USD", enabled: true },
        IN: { provider: "razorpay", currency: "INR", enabled: true },
      },
    });
    setMessage("Reset to defaults — click Save to apply.");
  };

  if (!config) return <div className="p-10">Loading...</div>;

  const activeGateway =
    config.defaultRegion === "IN"
      ? config.regions.IN.enabled
        ? "Razorpay (INR)"
        : "None"
      : config.regions.US.enabled
        ? "Stripe (USD)"
        : "None";

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Payment Configuration</h1>
      <p className="text-slate-600 text-sm mb-6">
        Region-based gateway selection. API keys are managed via AWS environment variables / SSM — not
        stored in this UI for security.
      </p>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-sm">
        <p>
          <span className="font-medium">Active default gateway:</span> {activeGateway}
        </p>
        <p className="mt-1 text-slate-600">
          Stripe: {config.regions.US.enabled ? "Active" : "Inactive"} · Razorpay:{" "}
          {config.regions.IN.enabled ? "Active" : "Inactive"}
        </p>
        {config.updatedAt && (
          <p className="mt-1 text-xs text-slate-500">
            Last updated: {new Date(config.updatedAt).toLocaleString()}
          </p>
        )}
      </div>

      <div className="space-y-4 bg-white border rounded-xl p-6">
        <div>
          <label className="block text-sm font-medium mb-1">Default region</label>
          <select
            value={config.defaultRegion}
            onChange={(e) => setConfig({ ...config, defaultRegion: e.target.value as "US" | "IN" })}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="US">United States — Stripe (USD)</option>
            <option value="IN">India — Razorpay (INR)</option>
          </select>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-medium text-sm mb-3">Region-wise gateway mapping</h3>
          <label className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              checked={config.regions.US.enabled}
              onChange={(e) =>
                setConfig({
                  ...config,
                  regions: { ...config.regions, US: { ...config.regions.US, enabled: e.target.checked } },
                })
              }
            />
            Stripe enabled (USA) — Cards, Apple Pay
          </label>
          <p className="text-xs text-slate-500 ml-6 mb-3">Currency: USD</p>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.regions.IN.enabled}
              onChange={(e) =>
                setConfig({
                  ...config,
                  regions: { ...config.regions, IN: { ...config.regions.IN, enabled: e.target.checked } },
                })
              }
            />
            Razorpay enabled (India) — UPI, Cards, Net Banking, Wallets
          </label>
          <p className="text-xs text-slate-500 ml-6">Currency: INR</p>
        </div>

        <div className="border-t pt-4 text-sm text-slate-600 space-y-2">
          <h3 className="font-medium text-slate-800">Setup reference</h3>
          <ul className="list-disc ml-5 space-y-1 text-xs">
            <li>
              <strong>Stripe:</strong> Set GitHub secrets <code>STRIPE_SECRET_KEY</code>,{" "}
              <code>STRIPE_WEBHOOK_SECRET</code> (deployed to Lambda on push). Publishable key:{" "}
              <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> in Amplify. Webhook URL:{" "}
              <code>/webhooks/stripe</code>
            </li>
            <li>
              <strong>Razorpay:</strong> Set <code>RAZOR_KEY_ID</code>, <code>RAZOR_KEY_SECRET</code> in API
              env. Webhook URL: <code>/webhooks/razorpay</code>
            </li>
            <li>Test vs live mode is determined by which API keys are deployed (test keys vs live keys).</li>
            <li>Transaction logs: view in Stripe/Razorpay dashboards; order payment IDs appear on order detail.</li>
            <li>Refunds: mark order as Refunded in Orders admin; process refund in gateway dashboard.</li>
          </ul>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button onClick={save} className="bg-accent text-white px-6 py-2 rounded-lg">
            Save configuration
          </button>
          <button onClick={resetDefaults} className="border px-4 py-2 rounded-lg text-sm">
            Reset to defaults
          </button>
        </div>
      </div>

      {message && <p className="mt-4 text-sm text-green-600">{message}</p>}
    </div>
  );
}
