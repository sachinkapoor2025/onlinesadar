"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApiClient } from "@/lib/auth-context";
import { ORDER_STATUS } from "@onlinesadar/shared";
import { statusLabel, badgeClass } from "@/lib/order-status";
import {
  downloadCsv,
  formatMoney,
  paginate,
  paymentStatusClass,
  paymentStatusLabel,
  shippingStatusLabel,
  sortItems,
  type SortDir,
} from "@/lib/admin-utils";
import { TableControls } from "@/components/admin/TableControls";

interface Order {
  orderId: string;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  trackingNumber?: string;
  paymentProvider?: string;
  shippingAddress: { name: string; email: string; phone?: string };
  estimatedDeliveryAt?: string;
  deliveredAt?: string;
}

type SortKey = "date" | "amount" | "status" | "customer";

const STATUS_TABS: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: ORDER_STATUS.PENDING_PAYMENT, label: "Pending payment" },
  { id: ORDER_STATUS.PAID, label: "Paid" },
  { id: ORDER_STATUS.PROCESSING, label: "Processing" },
  { id: ORDER_STATUS.SHIPPED, label: "Shipped" },
  { id: ORDER_STATUS.DELIVERED, label: "Delivered" },
  { id: ORDER_STATUS.CANCELLED, label: "Cancelled" },
  { id: ORDER_STATUS.REFUNDED, label: "Refunded" },
];

const PAYMENT_FILTERS = [
  { id: "all", label: "All payments" },
  { id: "pending", label: "Pending" },
  { id: "paid", label: "Paid" },
  { id: "failed", label: "Failed / Cancelled" },
  { id: "refunded", label: "Refunded" },
];

export default function AdminOrdersPage() {
  const apiClient = useApiClient();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const loadOrders = useCallback(() => {
    setLoading(true);
    const qs = tab !== "all" ? `?status=${encodeURIComponent(tab)}` : "";
    apiClient<{ orders: Order[] }>(`/admin/orders${qs}`)
      .then((d) => setOrders(d.orders))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [apiClient, tab]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    setPage(1);
  }, [tab, paymentFilter, paymentMethod, search, dateFrom, dateTo, sortKey, sortDir]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = orders.filter((o) => {
      if (paymentFilter === "pending" && o.status !== ORDER_STATUS.PENDING_PAYMENT) return false;
      if (paymentFilter === "paid" && o.status === ORDER_STATUS.PENDING_PAYMENT) return false;
      if (
        paymentFilter === "failed" &&
        o.status !== ORDER_STATUS.CANCELLED &&
        o.status !== ORDER_STATUS.PENDING_PAYMENT
      )
        return false;
      if (paymentFilter === "refunded" && o.status !== ORDER_STATUS.REFUNDED) return false;
      if (paymentMethod !== "all" && o.paymentProvider !== paymentMethod) return false;
      if (dateFrom && o.createdAt.slice(0, 10) < dateFrom) return false;
      if (dateTo && o.createdAt.slice(0, 10) > dateTo) return false;
      if (!q) return true;
      return (
        o.orderId.toLowerCase().includes(q) ||
        o.shippingAddress?.name?.toLowerCase().includes(q) ||
        o.shippingAddress?.email?.toLowerCase().includes(q) ||
        o.shippingAddress?.phone?.toLowerCase().includes(q)
      );
    });

    const sorter =
      sortKey === "amount"
        ? (o: Order) => o.total
        : sortKey === "status"
          ? (o: Order) => o.status
          : sortKey === "customer"
            ? (o: Order) => o.shippingAddress?.name ?? ""
            : (o: Order) => o.createdAt;

    list = sortItems(list, sorter, sortDir);
    return list;
  }, [orders, paymentFilter, paymentMethod, search, dateFrom, dateTo, sortKey, sortDir]);

  const { items: pageItems, totalPages, total } = paginate(filtered, page, pageSize);

  const toggleSort = () => {
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  };

  const cycleSortKey = () => {
    const keys: SortKey[] = ["date", "amount", "status", "customer"];
    const idx = keys.indexOf(sortKey);
    setSortKey(keys[(idx + 1) % keys.length]);
  };

  const exportOrders = () => {
    const rows = [
      [
        "Order ID",
        "Date",
        "Customer",
        "Email",
        "Phone",
        "Order Status",
        "Payment Status",
        "Payment Method",
        "Shipping Status",
        "Total",
        "Currency",
        "Tracking",
        "Last Updated",
      ],
      ...filtered.map((o) => [
        o.orderId,
        o.createdAt,
        o.shippingAddress?.name ?? "",
        o.shippingAddress?.email ?? "",
        o.shippingAddress?.phone ?? "",
        statusLabel(o.status),
        paymentStatusLabel(o.status),
        o.paymentProvider ?? "",
        shippingStatusLabel(o.status),
        String(o.total),
        o.currency,
        o.trackingNumber ?? "",
        o.updatedAt,
      ]),
    ];
    downloadCsv(`orders-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkExport = () => {
    const subset = filtered.filter((o) => selected.has(o.orderId));
    if (!subset.length) return;
    const rows = [
      ["Order ID", "Customer", "Email", "Total", "Currency", "Status"],
      ...subset.map((o) => [
        o.orderId,
        o.shippingAddress?.name ?? "",
        o.shippingAddress?.email ?? "",
        String(o.total),
        o.currency,
        o.status,
      ]),
    ];
    downloadCsv(`orders-selected-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const sortLabels: Record<SortKey, string> = {
    date: "Date",
    amount: "Amount",
    status: "Status",
    customer: "Customer",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Orders</h1>
        <button
          type="button"
          onClick={loadOrders}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-full text-sm border ${
              tab === t.id
                ? "bg-nav text-white border-nav"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <input
          type="search"
          placeholder="Search order ID, name, email, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
        />
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
        >
          {PAYMENT_FILTERS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">All payment methods</option>
          <option value="stripe">Stripe</option>
          <option value="razorpay">Razorpay</option>
        </select>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="flex-1 border border-slate-300 rounded-lg px-2 py-2 text-sm"
            title="From date"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="flex-1 border border-slate-300 rounded-lg px-2 py-2 text-sm"
            title="To date"
          />
        </div>
      </div>

      <TableControls
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        sortLabel={sortLabels[sortKey]}
        sortDir={sortDir}
        onSortToggle={() => {
          cycleSortKey();
          toggleSort();
        }}
        onExport={exportOrders}
      >
        {selected.size > 0 && (
          <button
            type="button"
            onClick={bulkExport}
            className="text-sm bg-slate-800 text-white px-3 py-1.5 rounded-lg"
          >
            Export {selected.size} selected
          </button>
        )}
      </TableControls>

      {loading ? (
        <p className="text-slate-500">Loading orders…</p>
      ) : pageItems.length === 0 ? (
        <p className="text-slate-600">No orders found.</p>
      ) : (
        <div className="bg-white rounded-lg overflow-hidden border overflow-x-auto">
          <table className="w-full text-sm min-w-[1100px]">
            <thead className="bg-slate-50">
              <tr className="text-left">
                <th className="py-3 px-3 w-8">
                  <input
                    type="checkbox"
                    checked={pageItems.every((o) => selected.has(o.orderId))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelected(new Set([...selected, ...pageItems.map((o) => o.orderId)]));
                      } else {
                        setSelected(
                          new Set([...selected].filter((id) => !pageItems.some((o) => o.orderId === id)))
                        );
                      }
                    }}
                  />
                </th>
                <th className="py-3 px-3">Order ID</th>
                <th className="py-3 px-3">Date & time</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Payment</th>
                <th className="py-3 px-3">Order status</th>
                <th className="py-3 px-3">Shipping</th>
                <th className="py-3 px-3">Total</th>
                <th className="py-3 px-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((o) => (
                <tr key={o.orderId} className="border-t hover:bg-blue-50/40 align-top">
                  <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(o.orderId)}
                      onChange={() => toggleSelect(o.orderId)}
                    />
                  </td>
                  <td
                    className="py-3 px-3 font-mono text-xs text-nav cursor-pointer"
                    onClick={() => router.push(`/admin/orders/${o.orderId}`)}
                  >
                    {o.orderId.slice(0, 8)}…
                  </td>
                  <td
                    className="py-3 px-3 text-slate-500 whitespace-nowrap cursor-pointer"
                    onClick={() => router.push(`/admin/orders/${o.orderId}`)}
                  >
                    {new Date(o.createdAt).toLocaleString()}
                  </td>
                  <td
                    className="py-3 px-3 cursor-pointer"
                    onClick={() => router.push(`/admin/orders/${o.orderId}`)}
                  >
                    <div className="font-medium">{o.shippingAddress?.name ?? "—"}</div>
                    <div className="text-xs text-slate-400">{o.shippingAddress?.email ?? ""}</div>
                    {o.shippingAddress?.phone && (
                      <div className="text-xs text-slate-400">{o.shippingAddress.phone}</div>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${paymentStatusClass(o.status)}`}
                    >
                      {paymentStatusLabel(o.status)}
                    </span>
                    <div className="text-xs text-slate-400 mt-1 capitalize">
                      {o.paymentProvider ?? "—"}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${badgeClass(o.status)}`}>
                      {statusLabel(o.status)}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-xs text-slate-600">
                    <div>{shippingStatusLabel(o.status)}</div>
                    {o.trackingNumber && (
                      <div className="text-slate-400 truncate max-w-[100px]" title={o.trackingNumber}>
                        {o.trackingNumber}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3 font-medium whitespace-nowrap">
                    {formatMoney(o.total, o.currency)}
                  </td>
                  <td className="py-3 px-3 text-xs text-slate-400 whitespace-nowrap">
                    {new Date(o.updatedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
