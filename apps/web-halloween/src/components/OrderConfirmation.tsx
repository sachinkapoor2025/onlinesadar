"use client";

import Image from "next/image";
import Link from "next/link";
import { site, whatsappChatUrl } from "@/lib/site";
import { SiteLogoLink } from "@/components/SiteLogo";
import { TrustBadges } from "@/components/TrustBadges";
import { resolveImageUrl } from "@/lib/images";
import type { Order } from "@hr-ecom/shared";

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
}

function CheckCircleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
      <path
        fillRule="evenodd"
        d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}

type OrderConfirmationProps = {
  order: Order;
  paid: boolean;
};

export function OrderConfirmation({ order, paid }: OrderConfirmationProps) {
  const addr = order.shippingAddress;
  const shortOrderId = order.orderId.slice(0, 8).toUpperCase();

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-slate-50 to-white">
      {/* Branded header band */}
      <div className="bg-primary text-white">
        <div className="max-w-2xl mx-auto px-4 pt-8 pb-20 text-center">
          <div className="flex justify-center mb-6">
            <SiteLogoLink className="brightness-0 invert" priority />
          </div>

          <div
            className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full ${
              paid ? "bg-emerald-500 text-white shadow-lg shadow-emerald-900/20" : "bg-amber-400 text-primary"
            }`}
          >
            {paid ? <CheckCircleIcon /> : <ClockIcon />}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            {paid ? "Thank you — your order is confirmed!" : "Awaiting payment"}
          </h1>
          <p className="text-white/85 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
            {paid
              ? "Your Rakhi gift is on its way. We've sent a confirmation email and our team will dispatch your order soon."
              : "Complete payment to confirm your order and start USA delivery."}
          </p>

          {paid && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold tracking-wide">
              Order #{shortOrderId}
            </p>
          )}
        </div>
      </div>

      {/* Main card */}
      <div className="max-w-2xl mx-auto px-4 -mt-12 pb-16">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 overflow-hidden">
          {/* Order summary header */}
          <div className="border-b border-slate-100 bg-slate-50/80 px-5 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Order summary</p>
              <p className="text-sm text-slate-600 font-mono mt-0.5">{order.orderId}</p>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                paid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
              }`}
            >
              {paid ? "Paid" : order.status.replace(/_/g, " ")}
            </span>
          </div>

          {/* Line items */}
          <ul className="divide-y divide-slate-100 px-5 sm:px-6">
            {order.items.map((item) => (
              <li key={item.productSlug} className="flex gap-4 py-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                  {item.image ? (
                    <Image
                      src={resolveImageUrl(item.image)}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl">🎀</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 line-clamp-2">{item.name}</p>
                  <p className="text-sm text-slate-500 mt-0.5">Qty: {item.quantity}</p>
                </div>
                <p className="font-semibold text-slate-900 shrink-0">
                  {formatMoney(item.price * item.quantity, item.currency)}
                </p>
              </li>
            ))}
          </ul>

          {/* Totals */}
          <div className="border-t border-slate-100 px-5 sm:px-6 py-4 space-y-2 text-sm">
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Coupon{order.couponCode ? ` (${order.couponCode})` : ""}</span>
                <span>−{formatMoney(order.discount, order.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Shipping</span>
              <span className="font-semibold text-accent">FREE</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-100 text-base">
              <span className="font-bold text-slate-900">Total paid</span>
              <span className="font-bold text-nav text-lg">{formatMoney(order.total, order.currency)}</span>
            </div>
            {order.paymentProvider && (
              <p className="text-xs text-slate-400 pt-1 capitalize">
                Paid via {order.paymentProvider === "stripe" ? "Stripe (USD)" : "Razorpay (INR)"}
              </p>
            )}
          </div>

          {/* Shipping address */}
          {addr && (
            <div className="border-t border-slate-100 px-5 sm:px-6 py-4 bg-slate-50/50">
              <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">
                Delivering to
              </p>
              <p className="font-semibold text-slate-900">{addr.name}</p>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                {addr.line1}
                {addr.line2 ? `, ${addr.line2}` : ""}
                <br />
                {addr.city}, {addr.state} {addr.postalCode}
                <br />
                {addr.country}
              </p>
              {addr.email && <p className="text-sm text-slate-500 mt-2">{addr.email}</p>}
            </div>
          )}
        </div>

        {/* Delivery info — only when paid */}
        {paid && (
          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 flex gap-3 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-nav/10 text-nav">
                <TruckIcon />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">USA delivery</p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Ships domestically within America. Express 2–3 days to major metros; 5–7 days nationwide.
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 flex gap-3 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent text-lg">
                ✉
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">Confirmation email</p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  A receipt was sent to {addr?.email || "your email"}. Check spam if you don&apos;t see it.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        {paid && (
          <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50/80 p-4 text-center">
            <p className="text-sm font-semibold text-amber-950 mb-1">Help other sisters find us</p>
            <p className="text-xs text-amber-900/90 mb-3 leading-relaxed">
              We&apos;re in our first Halloween season — your review builds trust for sisters sending Rakhi to the USA.
            </p>
            <Link
              href="/reviews"
              className="inline-flex text-sm font-bold text-nav hover:underline"
            >
              Share your experience →
            </Link>
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          {!paid && (
            <Link
              href={`/checkout?orderId=${order.orderId}`}
              className="inline-flex items-center justify-center rounded-lg bg-amber-600 text-white font-bold text-sm px-8 py-3.5 hover:bg-amber-700 transition shadow-md"
            >
              Retry payment
            </Link>
          )}
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-lg bg-primary text-white font-bold text-sm uppercase tracking-wide px-8 py-3.5 hover:bg-primary/90 transition shadow-md shadow-primary/20"
          >
            Continue shopping
          </Link>
          <a
            href={whatsappChatUrl(`Hi HalloweenReady, I placed order #${shortOrderId}. Can you confirm dispatch timing?`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg border-2 border-nav text-nav font-bold text-sm px-8 py-3.5 hover:bg-nav/5 transition"
          >
            WhatsApp support
          </a>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Questions? Email{" "}
          <a href={`mailto:${site.supportEmail}`} className="text-nav hover:underline">
            {site.supportEmail}
          </a>
        </p>

        <TrustBadges variant="compact" className="justify-center mt-8" />
      </div>
    </div>
  );
}
