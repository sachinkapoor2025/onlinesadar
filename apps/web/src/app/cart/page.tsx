"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { useCurrency } from "@/lib/currency-context";
import { SecureCheckoutBadge } from "@/components/SecureCheckoutBadge";
import { PaymentMethodIcons } from "@/components/PaymentMethodIcons";
import { CheckoutLegalNotice } from "@/components/CheckoutLegalNotice";
import { TrustBadges } from "@/components/TrustBadges";
import { resolveImageUrl } from "@/lib/images";
import { EstimatedDeliveryNote } from "@/components/EstimatedDeliveryNote";
import type { DisplayCurrency } from "@/lib/currency-context";

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 11v6M14 11v6" />
    </svg>
  );
}

function CartQuantityControls({ productSlug, quantity }: { productSlug: string; quantity: number }) {
  const { addItem, updateItem, removeItem } = useCart();
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center rounded-md bg-violet-100 border border-violet-200/80 overflow-hidden">
        <button
          type="button"
          disabled={busy}
          aria-label="Decrease quantity"
          onClick={() => void run(() => (quantity <= 1 ? removeItem(productSlug) : updateItem(productSlug, quantity - 1)))}
          className="px-3 py-2 text-primary font-bold hover:bg-violet-200/60 disabled:opacity-50 transition"
        >
          −
        </button>
        <span className="min-w-[2.25rem] text-center bg-white px-2 py-2 font-semibold text-primary border-x border-violet-200/80">
          {quantity}
        </span>
        <button
          type="button"
          disabled={busy}
          aria-label="Increase quantity"
          onClick={() => void run(() => addItem(productSlug, 1))}
          className="px-3 py-2 text-primary font-bold hover:bg-violet-200/60 disabled:opacity-50 transition"
        >
          +
        </button>
      </div>
      <button
        type="button"
        disabled={busy}
        aria-label="Remove item"
        onClick={() => void run(() => removeItem(productSlug))}
        className="text-red-500 hover:text-red-600 p-1 disabled:opacity-50 transition"
      >
        <TrashIcon />
      </button>
    </div>
  );
}

export default function CartPage() {
  const { cart, loading } = useCart();
  const { format } = useCurrency();

  if (loading) return <div className="p-10 text-center text-slate-600">Loading cart...</div>;

  const items = cart?.items ?? [];
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const currency = (items[0]?.currency ?? "USD") as DisplayCurrency;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
      {items.length === 0 ? (
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold text-primary mb-4">Your Cart</h1>
          <p className="text-slate-600 mb-4">Your cart is empty.</p>
          <Link href="/products" className="text-nav font-semibold hover:underline">
            Continue shopping →
          </Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_minmax(280px,360px)] gap-8 lg:gap-10 items-start">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">
              Your Cart ({itemCount} {itemCount === 1 ? "item" : "items"})
            </h1>

            <ul className="space-y-6">
              {items.map((item) => {
                const lineCurrency = (item.currency ?? currency) as DisplayCurrency;
                const lineTotal = item.price * item.quantity;

                return (
                  <li
                    key={item.productSlug}
                    className="flex gap-4 pb-6 border-b border-slate-200 last:border-0 last:pb-0"
                  >
                    <Link
                      href={`/products/${item.productSlug}`}
                      className="shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden bg-slate-50 border border-slate-100"
                    >
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={resolveImageUrl(item.image)} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No image</div>
                      )}
                    </Link>

                    <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="space-y-3 min-w-0">
                        <Link
                          href={`/products/${item.productSlug}`}
                          className="font-bold text-slate-900 hover:text-nav line-clamp-2 leading-snug block"
                        >
                          {item.name}
                        </Link>
                        <CartQuantityControls productSlug={item.productSlug} quantity={item.quantity} />
                      </div>

                      <div className="sm:text-right shrink-0">
                        <p className="font-bold text-accent text-base sm:text-lg">
                          {format(lineTotal, lineCurrency)}
                        </p>
                        {item.quantity > 1 && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {format(item.price, lineCurrency)} each
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <aside className="border border-slate-200 rounded-lg bg-white p-5 sm:p-6 lg:sticky lg:top-24">
            <h2 className="text-sm font-bold text-slate-900 tracking-wide mb-5">CART TOTALS</h2>

            <div className="space-y-3 text-sm border-b border-slate-200 pb-4 mb-5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-700">Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})</span>
                <span className="font-medium text-slate-900">{format(total, currency)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-700">Shipping fee</span>
                <span className="font-bold text-accent">FREE</span>
              </div>
              <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-900">Estimated total</span>
                <span className="font-bold text-accent text-base">{format(total, currency)}</span>
              </div>
            </div>

            <div className="mb-5">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                Accepted payment methods
              </p>
              <PaymentMethodIcons />
            </div>

            <TrustBadges variant="compact" className="mb-4" />

            <EstimatedDeliveryNote variant="banner" prefix="Order today →" className="mb-5" />

            <Link
              href="/checkout"
              className="block w-full text-center rounded-md bg-primary text-white font-bold text-sm uppercase tracking-wide py-3.5 hover:bg-primary/90 transition"
            >
              Proceed to checkout
            </Link>

            <CheckoutLegalNotice className="mt-4 text-center" />
            <SecureCheckoutBadge className="mt-4" />
          </aside>
        </div>
      )}
    </div>
  );
}
