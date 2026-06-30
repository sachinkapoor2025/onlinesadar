"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useApiClient } from "@/lib/auth-context";
import type { Order } from "@onlinesadar/shared";
import { ORDER_STATUS } from "@onlinesadar/shared";
import {
  statusLabel,
  badgeClass,
  nextStatuses,
  FULFILLMENT_STEPS,
} from "@/lib/order-status";
import {
  formatMoney,
  paymentStatusClass,
  paymentStatusLabel,
  shippingStatusLabel,
} from "@/lib/admin-utils";

type AdminOrder = Order & {
  adminNotes?: string;
  estimatedDeliveryAt?: string;
  deliveredAt?: string;
};

export default function AdminOrderDetailPage() {
  const apiClient = useApiClient();
  const params = useParams();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newStatus, setNewStatus] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [note, setNote] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [estimatedDeliveryAt, setEstimatedDeliveryAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient<{ order: AdminOrder }>(`/admin/orders/${orderId}`);
      setOrder(data.order);
      setTrackingNumber(data.order.trackingNumber ?? "");
      setCarrier(data.order.carrier ?? "");
      setAdminNotes(data.order.adminNotes ?? "");
      setEstimatedDeliveryAt(data.order.estimatedDeliveryAt?.slice(0, 10) ?? "");
      const next = nextStatuses(data.order.status);
      setNewStatus(next[0] ?? data.order.status);
    } catch {
      setError("Could not load order.");
    } finally {
      setLoading(false);
    }
  }, [apiClient, orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const payload: Record<string, string | undefined> = {
        trackingNumber: trackingNumber || undefined,
        carrier: carrier || undefined,
        note: note || undefined,
        adminNotes,
        estimatedDeliveryAt: estimatedDeliveryAt
          ? new Date(estimatedDeliveryAt).toISOString()
          : undefined,
      };
      const allowed = order ? nextStatuses(order.status) : [];
      if (allowed.length > 0 && newStatus) {
        payload.status = newStatus;
      }
      const data = await apiClient<{ order: AdminOrder }>(`/admin/orders/${orderId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setOrder(data.order);
      setNote("");
      setMessage("Order updated.");
      const next = nextStatuses(data.order.status);
      setNewStatus(next[0] ?? data.order.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  const quickStatus = async (status: string) => {
    setSaving(true);
    setError("");
    try {
      const data = await apiClient<{ order: AdminOrder }>(`/admin/orders/${orderId}`, {
        method: "PUT",
        body: JSON.stringify({ status, note: `Status changed to ${statusLabel(status)}` }),
      });
      setOrder(data.order);
      setMessage(`Order marked as ${statusLabel(status)}.`);
      const next = nextStatuses(data.order.status);
      setNewStatus(next[0] ?? data.order.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  const printInvoice = () => window.print();

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-10 text-slate-500">Loading…</div>;
  if (!order) return <div className="max-w-4xl mx-auto px-4 py-10 text-red-600">{error || "Order not found."}</div>;

  const currentStepIndex = FULFILLMENT_STEPS.indexOf(order.status as (typeof FULFILLMENT_STEPS)[number]);
  const transitions = nextStatuses(order.status);
  const addr = order.shippingAddress;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link href="/admin/orders" className="text-sm text-nav hover:underline">
        ← Back to orders
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Order {order.orderId}</h1>
          <p className="text-sm text-slate-500">
            Placed {new Date(order.createdAt).toLocaleString()} · Updated{" "}
            {new Date(order.updatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${badgeClass(order.status)}`}>
            {statusLabel(order.status)}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${paymentStatusClass(order.status)}`}
          >
            {paymentStatusLabel(order.status)}
          </span>
          <button
            type="button"
            onClick={printInvoice}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 print:hidden"
          >
            Download invoice
          </button>
          {order.status === ORDER_STATUS.PENDING_PAYMENT && (
            <Link
              href={`/checkout?orderId=${order.orderId}`}
              className="text-sm bg-amber-600 text-white rounded-lg px-3 py-1.5 print:hidden"
            >
              Retry payment
            </Link>
          )}
        </div>
      </div>

      <div id="invoice-print" className="hidden print:block mb-8">
        <h2 className="text-xl font-bold">Invoice — {order.orderId}</h2>
        <p className="text-sm">{addr.name} · {addr.email}</p>
        <p className="text-sm mt-4 font-bold">Total: {formatMoney(order.total, order.currency)}</p>
      </div>

      {/* Fulfillment stepper */}
      {order.status !== ORDER_STATUS.CANCELLED && order.status !== ORDER_STATUS.REFUNDED && (
        <div className="flex items-center mb-8">
          {FULFILLMENT_STEPS.map((step, i) => {
            const done = i <= currentStepIndex && currentStepIndex >= 0;
            return (
              <div key={step} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      done ? "bg-nav text-white" : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span className="text-[11px] mt-1 text-slate-500 text-center w-20">
                    {statusLabel(step)}
                  </span>
                </div>
                {i < FULFILLMENT_STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 ${i < currentStepIndex ? "bg-nav" : "bg-slate-200"}`} />
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Items + totals */}
        <div className="md:col-span-2 space-y-6">
          <section className="bg-white border rounded-xl p-5">
            <h2 className="font-semibold mb-3">Items</h2>
            <ul className="divide-y">
              {order.items.map((item) => (
                <li key={item.productSlug} className="flex items-center gap-3 py-3">
                  {item.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt={item.name} className="w-12 h-12 rounded object-cover" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-slate-500">Qty {item.quantity}</p>
                  </div>
                  <span className="text-sm">{formatMoney(item.price * item.quantity, order.currency)}</span>
                </li>
              ))}
            </ul>
            <div className="border-t mt-3 pt-3 space-y-1 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>{formatMoney(order.subtotal, order.currency)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Shipping</span>
                <span>{formatMoney(order.shipping, order.currency)}</span>
              </div>
              <div className="flex justify-between font-bold text-base">
                <span>Total ({order.currency})</span>
                <span>{formatMoney(order.total, order.currency)}</span>
              </div>
            </div>
          </section>

          {/* Status history */}
          <section className="bg-white border rounded-xl p-5">
            <h2 className="font-semibold mb-3">Status history</h2>
            {order.statusHistory?.length ? (
              <ol className="relative border-l border-slate-200 ml-2">
                {[...order.statusHistory].reverse().map((h, i) => (
                  <li key={i} className="ml-4 pb-4 last:pb-0">
                    <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-nav" />
                    <p className="text-sm font-medium">{statusLabel(h.status)}</p>
                    <p className="text-xs text-slate-400">{new Date(h.at).toLocaleString()}</p>
                    {h.note && <p className="text-xs text-slate-500 mt-0.5">{h.note}</p>}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate-500">No history yet.</p>
            )}
          </section>
        </div>

        {/* Sidebar: customer + update */}
        <div className="space-y-6">
          <section className="bg-white border rounded-xl p-5 text-sm">
            <h2 className="font-semibold mb-3">Customer</h2>
            <p className="font-medium">{addr.name}</p>
            <p className="text-slate-500">{addr.email}</p>
            {addr.phone && <p className="text-slate-500">{addr.phone}</p>}
            <div className="mt-3 text-slate-600">
              <p>{addr.line1}</p>
              {addr.line2 && <p>{addr.line2}</p>}
              <p>
                {addr.city}, {addr.state} {addr.postalCode}
              </p>
              <p>{addr.country}</p>
            </div>
          </section>

          <section className="bg-white border rounded-xl p-5 text-sm">
            <h2 className="font-semibold mb-3">Payment & shipping</h2>
            <p className="text-slate-600 capitalize">Method: {order.paymentProvider ?? "—"}</p>
            <p className="text-slate-600 mt-1">Shipping: {shippingStatusLabel(order.status)}</p>
            {order.trackingNumber && (
              <p className="text-slate-600 mt-1">
                Tracking: {order.trackingNumber}
                {order.carrier ? ` (${order.carrier})` : ""}
              </p>
            )}
            {order.estimatedDeliveryAt && (
              <p className="text-slate-600 mt-1">
                Est. delivery: {new Date(order.estimatedDeliveryAt).toLocaleDateString()}
              </p>
            )}
            {order.deliveredAt && (
              <p className="text-slate-600 mt-1">
                Delivered: {new Date(order.deliveredAt).toLocaleDateString()}
              </p>
            )}
            <p className="text-xs text-slate-400 mt-2">
              Invoice: {order.status === ORDER_STATUS.PENDING_PAYMENT ? "Pending payment" : "Generated"}
            </p>
            {order.razorpayPaymentId && (
              <p className="text-xs text-slate-400 break-all mt-1">RZP: {order.razorpayPaymentId}</p>
            )}
            {order.paymentIntentId && (
              <p className="text-xs text-slate-400 break-all mt-1">PI: {order.paymentIntentId}</p>
            )}
          </section>

          <section className="bg-white border rounded-xl p-5">
            <h2 className="font-semibold mb-3">Admin notes</h2>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
              className="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm"
              placeholder="Internal remarks (not visible to customer)"
            />
          </section>

          <section className="bg-white border rounded-xl p-5">
            <h2 className="font-semibold mb-3">Update order</h2>
            {(transitions.includes(ORDER_STATUS.CANCELLED) ||
              transitions.includes(ORDER_STATUS.REFUNDED)) && (
              <div className="flex flex-wrap gap-2 mb-3">
                {transitions.includes(ORDER_STATUS.CANCELLED) && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => quickStatus(ORDER_STATUS.CANCELLED)}
                    className="text-xs border border-red-200 text-red-700 px-2 py-1 rounded"
                  >
                    Cancel order
                  </button>
                )}
                {transitions.includes(ORDER_STATUS.REFUNDED) && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => quickStatus(ORDER_STATUS.REFUNDED)}
                    className="text-xs border border-purple-200 text-purple-700 px-2 py-1 rounded"
                  >
                    Mark refunded
                  </button>
                )}
              </div>
            )}
            {transitions.length === 0 ? (
              <p className="text-sm text-slate-500">This order is in a final state. You can still update tracking and notes.</p>
            ) : null}
            <form onSubmit={handleUpdate} className="space-y-3">
              {transitions.length > 0 && (
                <label className="block text-xs font-medium text-slate-500">
                  New status
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-2 py-2 text-sm"
                  >
                    {transitions.map((s) => (
                      <option key={s} value={s}>
                        {statusLabel(s)}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="block text-xs font-medium text-slate-500">
                Expected delivery date
                <input
                  type="date"
                  value={estimatedDeliveryAt}
                  onChange={(e) => setEstimatedDeliveryAt(e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-2 py-2 text-sm"
                />
              </label>

              <label className="block text-xs font-medium text-slate-500">
                Tracking number
                <input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-2 py-2 text-sm"
                  placeholder="e.g. 1Z999…"
                />
              </label>

              <label className="block text-xs font-medium text-slate-500">
                Carrier
                <input
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-2 py-2 text-sm"
                  placeholder="e.g. FedEx, DHL"
                />
              </label>

              <label className="block text-xs font-medium text-slate-500">
                Status note (optional)
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-2 py-2 text-sm"
                />
              </label>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-nav text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save update"}
              </button>
            </form>
            {message && <p className="text-green-600 text-xs mt-2">{message}</p>}
            {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
