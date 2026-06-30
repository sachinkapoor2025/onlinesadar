"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import type { Product } from "@onlinesadar/shared";
import { canUseTokenPayment, TOKEN_ORDER_DEFAULTS } from "@onlinesadar/shared";

interface Props {
  product: Product;
  disabled?: boolean;
  className?: string;
}

export function BulkOrderActions({ product, disabled, className = "" }: Props) {
  const { addItem, sessionReady } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (fn: () => Promise<void>) => {
    setError("");
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const bulkTotal = product.price * (product.moq ?? 10);
  const tokenEligible = canUseTokenPayment(bulkTotal);

  return (
    <div className={`space-y-3 ${className}`}>
      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="button"
        disabled={disabled || busy || !sessionReady}
        onClick={() => void run(() => addItem(product.slug, product.moq ?? 10))}
        className="w-full rounded-md bg-nav text-white font-bold text-sm uppercase tracking-wide py-3.5 hover:bg-primary transition disabled:opacity-50"
      >
        {busy ? "Adding..." : `Add bulk (MOQ ${product.moq})`}
      </button>

      {product.sampleAvailable && product.samplePrice && (
        <button
          type="button"
          disabled={disabled || busy || !sessionReady}
          onClick={() => void run(() => addItem(product.slug, 1, { isSample: true }))}
          className="w-full rounded-md border-2 border-orange-500 text-orange-700 font-semibold text-sm py-3 hover:bg-orange-50 transition disabled:opacity-50"
        >
          Order sample — ₹{product.samplePrice} + shipping
        </button>
      )}

      {tokenEligible && (
        <Link
          href={`/checkout?orderType=token&product=${product.slug}`}
          className="block w-full text-center rounded-md bg-slate-800 text-white font-semibold text-sm py-3 hover:bg-slate-900"
        >
          Book with token ({TOKEN_ORDER_DEFAULTS.tokenPercent}%) — large orders
        </Link>
      )}
    </div>
  );
}
