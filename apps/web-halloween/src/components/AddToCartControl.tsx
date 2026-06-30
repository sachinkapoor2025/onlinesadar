"use client";

import Link from "next/link";
import { useState } from "react";
import { estimatedDeliveryShort } from "@hr-ecom/shared";
import { useCart } from "@/lib/cart-context";

function TrashIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 11v6M14 11v6" />
    </svg>
  );
}

function MinusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
    </svg>
  );
}

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}

const stepBtnClass =
  "flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 active:scale-95 disabled:opacity-50 transition";

const detailPillBtnClass =
  "flex h-9 w-9 shrink-0 items-center justify-center hover:bg-white/15 rounded-full disabled:opacity-50 transition";

interface AddToCartControlProps {
  productSlug: string;
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
  variant?: "default" | "detail";
}

export function AddToCartControl({
  productSlug,
  disabled,
  className = "",
  fullWidth = true,
  variant = "default",
}: AddToCartControlProps) {
  const { cart, sessionReady, addItem, updateItem, removeItem } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [addedNote, setAddedNote] = useState("");

  const quantity = cart?.items.find((i) => i.productSlug === productSlug)?.quantity ?? 0;
  const inCart = quantity > 0;

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

  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const isDetail = variant === "detail";
  const addLabel = disabled ? "Out of Stock" : busy ? "Adding..." : isDetail ? "Add to cart" : "Add to cart";

  if (!inCart) {
    return (
      <div className={className}>
        {error && <p className="text-xs text-red-600 mb-1">{error}</p>}
        {addedNote && <p className="text-xs text-green-700 mb-1">{addedNote}</p>}
        <button
          type="button"
          onClick={(e) => {
            stop(e);
            void run(async () => {
              await addItem(productSlug);
              setAddedNote(`Added! Est. delivery ${estimatedDeliveryShort()}`);
              window.setTimeout(() => setAddedNote(""), 5000);
            });
          }}
          disabled={disabled || busy || !sessionReady}
          className={
            isDetail
              ? `w-full rounded-md bg-nav text-white font-bold text-sm uppercase tracking-wide py-3.5 hover:bg-primary transition disabled:opacity-50`
              : `btn-cart ${fullWidth ? "w-full" : ""} text-xs sm:text-sm px-3 py-2 sm:px-5 sm:py-2.5`
          }
        >
          {isDetail ? addLabel.toUpperCase() : addLabel}
        </button>
      </div>
    );
  }

  const quantityControls = (
    <>
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={busy}
        onClick={(e) => {
          stop(e);
          void run(() => (quantity <= 1 ? removeItem(productSlug) : updateItem(productSlug, quantity - 1)));
        }}
        className={stepBtnClass}
      >
        <MinusIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </button>
      <span className="min-w-[1.25rem] sm:min-w-[1.5rem] text-center text-sm sm:text-base font-bold tabular-nums px-0.5">
        {quantity}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={busy || disabled}
        onClick={(e) => {
          stop(e);
          void run(() => addItem(productSlug, 1));
        }}
        className={stepBtnClass}
      >
        <PlusIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </button>
    </>
  );

  const removeButton = (
    <button
      type="button"
      aria-label="Remove from cart"
      disabled={busy}
      onClick={(e) => {
        stop(e);
        void run(() => removeItem(productSlug));
      }}
      className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full hover:bg-white/10 active:scale-95 disabled:opacity-50 transition"
    >
      <TrashIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
    </button>
  );

  return (
    <div className={className} onClick={stop}>
      {error && <p className="text-xs text-red-600 mb-1">{error}</p>}
      {isDetail ? (
        <div className="flex items-center justify-between gap-3 rounded-full bg-nav text-white font-semibold text-sm px-4 py-2.5 w-full">
          <button
            type="button"
            aria-label="Decrease quantity"
            disabled={busy}
            onClick={(e) => {
              stop(e);
              void run(() => (quantity <= 1 ? removeItem(productSlug) : updateItem(productSlug, quantity - 1)));
            }}
            className={detailPillBtnClass}
          >
            <MinusIcon className="w-4 h-4" />
          </button>
          <span className="min-w-[1.5rem] text-center text-base font-bold tabular-nums">{quantity}</span>
          <button
            type="button"
            aria-label="Increase quantity"
            disabled={busy || disabled}
            onClick={(e) => {
              stop(e);
              void run(() => addItem(productSlug, 1));
            }}
            className={detailPillBtnClass}
          >
            <PlusIcon className="w-4 h-4" />
          </button>
          {removeButton}
        </div>
      ) : (
        <div
          className={`flex items-center justify-between gap-1 rounded-full bg-nav text-white font-semibold text-sm px-1.5 py-1.5 sm:px-3 sm:py-2 ${fullWidth ? "w-full" : "min-w-[10rem] sm:min-w-[12rem]"}`}
        >
          {quantityControls}
          {removeButton}
        </div>
      )}
      {!isDetail && (
        <Link
          href="/cart"
          onClick={(e) => e.stopPropagation()}
          className="block text-center text-nav text-sm font-semibold mt-2 hover:underline"
        >
          View Cart
        </Link>
      )}
    </div>
  );
}
