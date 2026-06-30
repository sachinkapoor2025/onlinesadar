"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useSessionId } from "@/lib/session";
import { formatCouponExpiry } from "@/lib/welcome-coupon";

type Props = {
  email: string;
  subtotal: number;
  currency: "USD" | "INR";
  formatMoney: (amount: number, currency: "USD" | "INR") => string;
  initialCode?: string;
  onApplied: (discount: number, code: string) => void;
  onCleared: () => void;
};

export function CouponInput({
  email,
  subtotal,
  currency,
  formatMoney,
  initialCode = "",
  onApplied,
  onCleared,
}: Props) {
  const sessionId = useSessionId();
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState<{
    code: string;
    discountPercent: number;
    expiresAt: string;
    discountAmount: number;
  } | null>(null);

  const apply = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    if (!email.trim() || !email.includes("@")) {
      setError("Enter your email in the shipping form first");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await api<{
        valid: boolean;
        code?: string;
        discountPercent?: number;
        expiresAt?: string;
        error?: string;
      }>("/coupons/validate", {
        method: "POST",
        sessionId: sessionId ?? undefined,
        body: JSON.stringify({ code: trimmed, email: email.trim() }),
      });

      if (!result.valid || !result.discountPercent || !result.code) {
        throw new Error(result.error ?? "Invalid coupon");
      }

      const discountAmount = Math.round(subtotal * (result.discountPercent / 100) * 100) / 100;
      setApplied({
        code: result.code,
        discountPercent: result.discountPercent,
        expiresAt: result.expiresAt ?? "",
        discountAmount,
      });
      onApplied(discountAmount, result.code);
    } catch (err) {
      setApplied(null);
      onCleared();
      setError(err instanceof Error ? err.message : "Could not apply coupon");
    } finally {
      setLoading(false);
    }
  };

  const remove = () => {
    setApplied(null);
    setError("");
    onCleared();
  };

  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
      <p className="text-sm font-semibold text-slate-900">Coupon code</p>
      {applied ? (
        <div className="text-sm space-y-1">
          <p className="text-green-700 font-medium">
            {applied.code} applied — {applied.discountPercent}% off (−{formatMoney(applied.discountAmount, currency)})
          </p>
          {applied.expiresAt && (
            <p className="text-xs text-slate-500">Expires {formatCouponExpiry(applied.expiresAt)}</p>
          )}
          <button type="button" onClick={remove} className="text-xs text-nav hover:underline">
            Remove coupon
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="RAKHI-XXXXXX"
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm uppercase"
            />
            <button
              type="button"
              onClick={() => void apply()}
              disabled={loading || !code.trim()}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50"
            >
              {loading ? "…" : "Apply"}
            </button>
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
        </>
      )}
    </div>
  );
}
