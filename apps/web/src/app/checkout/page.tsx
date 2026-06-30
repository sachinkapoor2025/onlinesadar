"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { useCurrency, type DisplayCurrency } from "@/lib/currency-context";
import { useSessionId, useDebouncedLeadCapture, useLeadCapture } from "@/lib/session";
import { trackCheckoutStart, trackPurchase } from "@/lib/track";
import Script from "next/script";
import { PaymentMethodPicker, type PaymentMethod } from "@/components/PaymentMethodPicker";
import { ShippingAddressForm } from "@/components/ShippingAddressForm";
import { SecureCheckoutBadge } from "@/components/SecureCheckoutBadge";
import { CheckoutLegalNotice } from "@/components/CheckoutLegalNotice";
import { TrustBadges } from "@/components/TrustBadges";
import { CouponInput } from "@/components/CouponInput";
import { StripePaymentForm } from "@/components/StripePaymentForm";
import { EstimatedDeliveryNote } from "@/components/EstimatedDeliveryNote";
import { loadWelcomeCoupon } from "@/lib/welcome-coupon";
import {
  emptyShippingAddress,
  loadSavedAddresses,
  saveShippingAddress,
} from "@/lib/shipping-address";
import { fetchAccount, createAccountAddress } from "@/lib/account";
import { ORDER_STATUS, ORDER_TYPES, type Order, type OrderType, type ShippingAddress } from "@onlinesadar/shared";
import { CheckoutOrderTypePicker } from "@/components/CheckoutOrderTypePicker";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void;
    };
  }
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="max-w-lg mx-auto px-4 py-16 text-center text-slate-600">Loading checkout…</div>}>
      <CheckoutPageInner />
    </Suspense>
  );
}

function CheckoutPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const retryOrderId = searchParams.get("orderId");
  const initialOrderType = (searchParams.get("orderType") as OrderType) || ORDER_TYPES.BULK;
  const [orderType, setOrderType] = useState<OrderType>(initialOrderType);
  const [shippingCost, setShippingCost] = useState(0);
  const [shippingLabel, setShippingLabel] = useState("");
  const { cart, loading: cartLoading, refresh } = useCart();
  const { user, token } = useAuth();
  const { format, displayCurrency, convert, usdInrRate } = useCurrency();
  const sessionId = useSessionId();
  const captureLeadDebounced = useDebouncedLeadCapture(sessionId);
  const captureLeadNow = useLeadCapture(sessionId);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("razorpay");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [discount, setDiscount] = useState(0);
  const [appliedCouponCode, setAppliedCouponCode] = useState("");
  const [savedCouponCode, setSavedCouponCode] = useState("");
  const [stripeCheckout, setStripeCheckout] = useState<{ clientSecret: string; orderId: string } | null>(
    null
  );
  const [retryOrder, setRetryOrder] = useState<Order | null>(null);
  const [retryLoading, setRetryLoading] = useState(Boolean(retryOrderId));
  const [address, setAddress] = useState<ShippingAddress>(emptyShippingAddress);
  const [saveForLater, setSaveForLater] = useState(true);
  const addressPrefilled = useRef(false);
  const addressRef = useRef(address);
  addressRef.current = address;

  useEffect(() => {
    const pin = address.postalCode?.trim();
    const itemCount = cart?.items?.length ?? 0;
    if (!pin || pin.length < 4 || itemCount === 0) return;
    api<{ quote: { shippingInr: number; shippingUsd: number; label: string } }>("/shipping/quote", {
      method: "POST",
      body: JSON.stringify({
        postalCode: pin,
        country: address.country || "IN",
        weightKg: Math.max(1, itemCount),
        itemCount,
      }),
    })
      .then((d) => {
        setShippingCost(displayCurrency === "USD" ? d.quote.shippingUsd : d.quote.shippingInr);
        setShippingLabel(d.quote.label);
      })
      .catch(() => {
        setShippingCost(0);
        setShippingLabel("");
      });
  }, [address.postalCode, address.country, displayCurrency, cart?.items?.length]);

  useEffect(() => {
    if (displayCurrency === "INR") setPaymentMethod("razorpay");
    else if (displayCurrency === "USD") setPaymentMethod("stripe");
    setStripeCheckout(null);
  }, [displayCurrency]);

  useEffect(() => {
    const stored = loadWelcomeCoupon();
    if (stored?.code) setSavedCouponCode(stored.code);
  }, []);

  useEffect(() => {
    if (!retryOrderId || !sessionId) {
      setRetryLoading(false);
      return;
    }
    setRetryLoading(true);
    api<{ order: Order }>(`/orders/${retryOrderId}`, { sessionId, token })
      .then((data) => {
        if (data.order.status !== ORDER_STATUS.PENDING_PAYMENT) {
          router.replace(`/orders/${retryOrderId}`);
          return;
        }
        setRetryOrder(data.order);
        if (data.order.shippingAddress) setAddress(data.order.shippingAddress);
        if (data.order.paymentProvider === "razorpay") setPaymentMethod("razorpay");
        else if (data.order.paymentProvider === "stripe") setPaymentMethod("stripe");
        if (data.order.discount > 0) {
          setDiscount(data.order.discount);
          if (data.order.couponCode) setAppliedCouponCode(data.order.couponCode);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load order for retry"))
      .finally(() => setRetryLoading(false));
  }, [retryOrderId, sessionId, token, router]);

  const checkoutTracked = useRef(false);
  useEffect(() => {
    if (checkoutTracked.current || !cart?.items.length) return;
    checkoutTracked.current = true;
    const value = cart.items.reduce((sum, item) => {
      const lineCurrency = (item.currency ?? "USD") as DisplayCurrency;
      return sum + convert(item.price * item.quantity, lineCurrency);
    }, 0);
    trackCheckoutStart(value);
  }, [cart, convert]);

  useEffect(() => {
    if (addressPrefilled.current || !sessionId) return;

    const prefill = async () => {
      if (token) {
        try {
          const account = await fetchAccount(token, sessionId);
          if (account.profile.preferredPaymentMethod) {
            setPaymentMethod(account.profile.preferredPaymentMethod);
          }
          const defaultAddress =
            account.addresses.find((a) => a.isDefault) ?? account.addresses[0];
          if (defaultAddress) {
            setAddress({
              name: defaultAddress.name,
              line1: defaultAddress.line1,
              line2: defaultAddress.line2,
              city: defaultAddress.city,
              state: defaultAddress.state,
              postalCode: defaultAddress.postalCode,
              country: defaultAddress.country,
              phone: defaultAddress.phone,
              email: defaultAddress.email || user?.email || "",
            });
            addressPrefilled.current = true;
            return;
          }
        } catch {
          // fall through to local storage
        }
      }

      const saved = loadSavedAddresses();
      if (saved.length > 0) {
        const latest = saved[0];
        setAddress({
          name: latest.name,
          line1: latest.line1,
          line2: latest.line2,
          city: latest.city,
          state: latest.state,
          postalCode: latest.postalCode,
          country: latest.country,
          phone: latest.phone,
          email: latest.email || user?.email || "",
        });
        addressPrefilled.current = true;
        return;
      }

      if (token) {
        try {
          const data = await api<{ orders: Order[] }>("/orders", { sessionId, token });
          const latest = data.orders[0];
          if (latest?.shippingAddress) {
            setAddress(latest.shippingAddress);
            addressPrefilled.current = true;
            return;
          }
        } catch {
          // ignore
        }
      }

      if (user?.email) {
        setAddress((a) => ({ ...a, email: user.email }));
      }
      addressPrefilled.current = true;
    };

    void prefill();
  }, [user, token, sessionId]);

  const captureField = (field: string, value: string) => {
    const a = addressRef.current;
    captureLeadDebounced({
      name: field === "name" ? value : a.name,
      email: field === "email" ? value : a.email,
      phone: field === "phone" ? value : a.phone,
      page: "/checkout",
      source: "checkout",
    });
  };

  const openRazorpayCheckout = async (order: Order, razorpayOrderId: string, razorpayKeyId?: string) => {
    const key = razorpayKeyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!key || razorpayOrderId.includes("_dev_")) {
      trackPurchase(order.total, {
        orderId: order.orderId,
        provider: "razorpay_dev",
        currency: order.currency,
      });
      await refresh();
      router.push(`/orders/${order.orderId}?dev=1`);
      return;
    }

    if (typeof window.Razorpay === "undefined") {
      throw new Error("Razorpay checkout failed to load. Please refresh and try again.");
    }

    await new Promise<void>((resolve, reject) => {
      const rzp = new window.Razorpay({
        key,
        amount: Math.round(order.total * 100),
        currency: order.currency,
        name: "UsaRakhi",
        description: `Order ${order.orderId.slice(0, 8)}`,
        order_id: razorpayOrderId,
        prefill: {
          name: address.name,
          email: address.email,
          contact: address.phone || undefined,
        },
        theme: { color: "#183a68" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await api("/payments/razorpay/verify", {
              method: "POST",
              sessionId,
              token,
              body: JSON.stringify({
                orderId: order.orderId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });
            trackPurchase(order.total, {
              orderId: order.orderId,
              provider: "razorpay",
              currency: order.currency,
            });
            await refresh();
            resolve();
            router.push(`/orders/${order.orderId}`);
          } catch (verifyErr) {
            reject(verifyErr);
          }
        },
        modal: {
          ondismiss: () => reject(new Error("Payment cancelled")),
        },
      });

      rzp.on("payment.failed", (response) => {
        reject(new Error(response.error?.description ?? "Payment failed"));
      });

      rzp.open();
    });
  };

  const persistAddressIfNeeded = async () => {
    if (!saveForLater) return;

    const payload = {
      ...address,
      country: "US" as const,
      label: address.name,
      isDefault: true,
      ...(address.phone?.trim() ? { phone: address.phone.trim() } : {}),
      ...(address.line2?.trim() ? { line2: address.line2.trim() } : { line2: undefined }),
    };

    if (token && sessionId) {
      try {
        const account = await fetchAccount(token, sessionId);
        const exists = account.addresses.some(
          (a) =>
            a.line1 === address.line1 &&
            a.city === address.city &&
            a.state === address.state &&
            a.postalCode === address.postalCode &&
            a.name === address.name
        );
        if (!exists) {
          await createAccountAddress(token, sessionId, payload);
        }
        return;
      } catch {
        // fall back to local storage
      }
    }

    saveShippingAddress(address);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (retryOrder) {
        const data = await api<{
          order: Order;
          clientSecret?: string;
          razorpayOrderId?: string;
          razorpayKeyId?: string;
        }>(`/orders/${retryOrder.orderId}/retry-payment`, {
          method: "POST",
          sessionId,
          token,
          body: JSON.stringify({ paymentMethod }),
        });

        if (paymentMethod === "stripe") {
          const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
          if (!stripeKey) throw new Error("Stripe is not configured.");
          if (!data.clientSecret || data.clientSecret.includes("_dev_")) {
            throw new Error("Stripe payment could not be started.");
          }
          setStripeCheckout({ clientSecret: data.clientSecret, orderId: data.order.orderId });
          setRetryOrder(data.order);
          return;
        }

        if (!data.razorpayOrderId) throw new Error("Razorpay could not be started.");
        await openRazorpayCheckout(data.order, data.razorpayOrderId, data.razorpayKeyId);
        return;
      }

      const payload: ShippingAddress = {
        ...address,
        country: "US",
        ...(address.phone?.trim() ? { phone: address.phone.trim() } : {}),
        ...(address.line2?.trim() ? { line2: address.line2.trim() } : { line2: undefined }),
      };

      await captureLeadNow({
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        page: "/checkout",
        source: "checkout",
      });

      const data = await api<{
        order: Order;
        clientSecret?: string;
        razorpayOrderId?: string;
        razorpayKeyId?: string;
      }>("/checkout", {
        method: "POST",
        sessionId,
        token,
        body: JSON.stringify({
          paymentMethod,
          checkoutCurrency: displayCurrency,
          ...(displayCurrency === "INR" ? { usdInrRate } : {}),
          shippingAddress: payload,
          orderType,
          ...(appliedCouponCode ? { couponCode: appliedCouponCode } : {}),
        }),
      });

      await persistAddressIfNeeded();

      if (paymentMethod === "stripe") {
        const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
        if (!stripeKey) {
          throw new Error("Stripe is not configured. Contact support or pay with Razorpay (INR).");
        }
        if (!data.clientSecret || data.clientSecret.includes("_dev_")) {
          throw new Error(
            "Stripe payment could not be started. Ensure STRIPE_SECRET_KEY is set on the API and redeploy."
          );
        }
        setStripeCheckout({ clientSecret: data.clientSecret, orderId: data.order.orderId });
        return;
      }

      if (!data.razorpayOrderId) {
        throw new Error("Razorpay could not be started. Check payment configuration and try again.");
      }

      await openRazorpayCheckout(data.order, data.razorpayOrderId, data.razorpayKeyId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  if (cartLoading || retryLoading) {
    return <div className="max-w-lg mx-auto px-4 py-16 text-center text-slate-600">Loading checkout...</div>;
  }

  const isRetry = Boolean(retryOrder);
  const checkoutItems = isRetry ? retryOrder!.items : cart?.items ?? [];

  if (!checkoutItems.length) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-slate-600 mb-4">Your cart is empty.</p>
        <Link href="/products" className="text-nav font-semibold hover:underline">
          Continue shopping →
        </Link>
      </div>
    );
  }

  const cartCurrency = (checkoutItems[0]?.currency ?? "USD") as DisplayCurrency;
  /** Subtotal in the shopper's selected display currency (matches cart page). */
  const displaySubtotal = isRetry
    ? retryOrder!.subtotal
    : checkoutItems.reduce((sum, item) => {
        const lineCurrency = (item.currency ?? cartCurrency) as DisplayCurrency;
        return sum + convert(item.price * item.quantity, lineCurrency);
      }, 0);
  const itemCount = checkoutItems.reduce((sum, i) => sum + i.quantity, 0);
  const orderTotal = isRetry
    ? retryOrder!.total
    : Math.max(0, displaySubtotal - discount + shippingCost);

  const hasSampleItems = checkoutItems.some((i) => i.isSample);

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Checkout</h1>
        {isRetry && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4">
            Retrying payment for order <span className="font-mono">{retryOrder!.orderId.slice(0, 8)}…</span>
          </p>
        )}
        <EstimatedDeliveryNote variant="banner" prefix="Estimated delivery:" className="mb-6" />

        <form
          onSubmit={handleCheckout}
          className="grid lg:grid-cols-[1fr_minmax(280px,360px)] gap-8 lg:gap-10 items-start"
        >
          <div className="space-y-6">
            {!isRetry && (
              <CheckoutOrderTypePicker
                value={orderType}
                onChange={setOrderType}
                hasSampleItems={hasSampleItems}
              />
            )}
            <ShippingAddressForm
              value={address}
              onChange={setAddress}
              onFieldLeadCapture={captureField}
              saveForLater={saveForLater}
              onSaveForLaterChange={setSaveForLater}
            />
          </div>

          <aside className="border border-slate-200 rounded-lg bg-white p-5 sm:p-6 lg:sticky lg:top-24 space-y-5">
            <h2 className="text-sm font-bold text-slate-900 tracking-wide">ORDER SUMMARY</h2>

            <ul className="space-y-3 text-sm border-b border-slate-200 pb-4">
              {checkoutItems.map((item) => {
                const lineCurrency = (item.currency ?? cartCurrency) as DisplayCurrency;
                return (
                <li key={item.productSlug} className="flex justify-between gap-3">
                  <span className="text-slate-700 line-clamp-2">
                    {item.name} × {item.quantity}
                  </span>
                  <span className="font-medium text-slate-900 shrink-0">
                    {format(item.price * item.quantity, lineCurrency)}
                  </span>
                </li>
              );
              })}
            </ul>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-700">Items ({itemCount})</span>
                <span className="font-medium">{format(displaySubtotal, displayCurrency)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between gap-4 text-green-700">
                  <span>Coupon ({appliedCouponCode})</span>
                  <span>−{format(discount, displayCurrency)}</span>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <span className="text-slate-700">Shipping{shippingLabel ? ` (${shippingLabel})` : ""}</span>
                <span className="font-medium">
                  {shippingCost > 0 ? format(shippingCost, displayCurrency) : "Calculating…"}
                </span>
              </div>
              {orderType === ORDER_TYPES.TOKEN && (
                <p className="text-xs text-orange-700 bg-orange-50 p-2 rounded">
                  Token booking: you pay 20% now via Razorpay. Balance transfers directly to seller bank account.
                </p>
              )}
              <div className="flex justify-between gap-4 pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-900">Total</span>
                <span className="font-bold text-nav text-base">
                  {format(orderTotal, displayCurrency)}
                </span>
              </div>
            </div>

            {!isRetry && (
              <CouponInput
                email={address.email}
                subtotal={displaySubtotal}
                currency={displayCurrency}
                formatMoney={format}
                initialCode={savedCouponCode}
                onApplied={(amount, code) => {
                  setDiscount(amount);
                  setAppliedCouponCode(code);
                }}
                onCleared={() => {
                  setDiscount(0);
                  setAppliedCouponCode("");
                }}
              />
            )}

            <div>
              <p className="text-sm font-semibold text-slate-700 mb-3">Payment method</p>
              <PaymentMethodPicker
                value={paymentMethod}
                onChange={(method) => {
                  setPaymentMethod(method);
                  setStripeCheckout(null);
                }}
                checkoutCurrency={displayCurrency}
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            {stripeCheckout && paymentMethod === "stripe" && (
              <StripePaymentForm
                clientSecret={stripeCheckout.clientSecret}
                returnUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/orders/${stripeCheckout.orderId}`}
                amountLabel={format(orderTotal, displayCurrency)}
                onError={setError}
              />
            )}

            {!stripeCheckout && (
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-primary text-white font-bold text-sm uppercase tracking-wide py-3.5 hover:bg-primary/90 transition disabled:opacity-50"
            >
              {loading
                ? "Processing..."
                : paymentMethod === "razorpay"
                  ? "Pay with Razorpay"
                  : "Continue to Stripe payment"}
            </button>
            )}

            <CheckoutLegalNotice className="text-center" />

            <TrustBadges variant="compact" className="pt-2" />

            <SecureCheckoutBadge />

            <Link href="/cart" className="block text-center text-sm text-nav hover:underline">
              ← Back to cart
            </Link>
          </aside>
        </form>
      </div>
    </>
  );
}
