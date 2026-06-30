"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { Product } from "@onlinesadar/shared";

export function RfqForm({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [quantity, setQuantity] = useState(String(product.moq ?? 10));
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");

  if (!product.sellerId) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      await api("/rfq", {
        method: "POST",
        body: JSON.stringify({
          productSlug: product.slug,
          buyerName: name,
          buyerEmail: email,
          buyerPhone: phone,
          quantity: Number(quantity),
          message,
        }),
      });
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not submit RFQ");
    }
  }

  if (status === "done") {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
        RFQ submitted! The seller will respond to your email shortly.
      </div>
    );
  }

  return (
    <div className="border rounded-xl p-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-sm font-semibold text-primary hover:underline"
      >
        {open ? "Hide quote request" : "Request custom quote (RFQ)"}
      </button>
      {open && (
        <form onSubmit={submit} className="mt-4 space-y-3">
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <input required placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <input required placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <input required type="number" min={product.moq ?? 1} placeholder="Quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <textarea placeholder="Message (optional)" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <button type="submit" disabled={status === "loading"} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
            {status === "loading" ? "Sending..." : "Submit RFQ"}
          </button>
        </form>
      )}
    </div>
  );
}
