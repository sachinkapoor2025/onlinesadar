"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApiClient } from "@/lib/auth-context";
import type { Category, MoqUnit, PriceTier } from "@onlinesadar/shared";

const STEPS = ["Category", "Details", "MOQ & pricing", "Media", "Review"];

export default function SellerProductWizardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const apiClient = useApiClient();
  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [categorySlug, setCategorySlug] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [moq, setMoq] = useState("10");
  const [moqUnit, setMoqUnit] = useState<MoqUnit>("piece");
  const [orderIncrement, setOrderIncrement] = useState("1");
  const [sampleAvailable, setSampleAvailable] = useState(false);
  const [samplePrice, setSamplePrice] = useState("");
  const [originCity, setOriginCity] = useState("Delhi");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [published, setPublished] = useState(false);
  const [tier1Min, setTier1Min] = useState("");
  const [tier1Price, setTier1Price] = useState("");
  const [tier2Min, setTier2Min] = useState("");
  const [tier2Price, setTier2Price] = useState("");

  useEffect(() => {
    apiClient<{ categories: Category[] }>("/categories")
      .then((d) => setCategories(d.categories))
      .catch(() => setCategories([]));
  }, [apiClient]);

  function buildTiers(): PriceTier[] {
    const tiers: PriceTier[] = [];
    const t1Min = Number(tier1Min);
    const t1P = Number(tier1Price);
    const t2Min = Number(tier2Min);
    const t2P = Number(tier2Price);
    if (t1Min > 0 && t1P > 0) tiers.push({ minQty: t1Min, unitPrice: t1P });
    if (t2Min > 0 && t2P > 0) tiers.push({ minQty: t2Min, unitPrice: t2P });
    return tiers.sort((a, b) => a.minQty - b.minQty);
  }

  async function submit() {
    setError("");
    setLoading(true);
    try {
      const payload = {
        name,
        description,
        price: Number(price),
        currency: "INR" as const,
        categorySlug,
        images: imageUrl ? [imageUrl] : [],
        videos: videoUrl ? [videoUrl] : [],
        moq: Number(moq),
        moqUnit,
        orderIncrement: Number(orderIncrement) || 1,
        priceTiers: buildTiers(),
        sampleAvailable,
        samplePrice: sampleAvailable && samplePrice ? Number(samplePrice) : undefined,
        originCity,
        shipsInternational: true,
        published,
        inventory: 10000,
        tags: ["wholesale", "bulk"],
      };
      await apiClient("/seller/products", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      router.push("/seller/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create product");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Product listing wizard</h1>
      <p className="text-slate-600 mb-6">
        Step {step + 1} of {STEPS.length}: {STEPS[step]}
      </p>

      <div className="flex gap-1 mb-8">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`h-1 flex-1 rounded ${i <= step ? "bg-orange-600" : "bg-slate-200"}`}
            title={label}
          />
        ))}
      </div>

      {error && <p className="mb-4 text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

      {step === 0 && (
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Category *</span>
            <select
              required
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2"
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Product name *</span>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Description *</span>
            <textarea required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Origin city</span>
            <input value={originCity} onChange={(e) => setOriginCity(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" />
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium">Base price (₹/unit) *</span>
              <input required type="number" min="0.01" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" />
            </label>
            <label className="block">
              <span className="text-sm font-medium">MOQ *</span>
              <input required type="number" min="1" value={moq} onChange={(e) => setMoq(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium">MOQ unit</span>
              <select value={moqUnit} onChange={(e) => setMoqUnit(e.target.value as MoqUnit)} className="mt-1 w-full border rounded-lg px-3 py-2">
                <option value="piece">Piece</option>
                <option value="pack">Pack</option>
                <option value="carton">Carton</option>
                <option value="kg">Kg</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium">Order in multiples of</span>
              <input type="number" min="1" value={orderIncrement} onChange={(e) => setOrderIncrement(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" />
            </label>
          </div>
          <fieldset className="border rounded-lg p-4">
            <legend className="text-sm font-medium px-1">Bulk price tiers (optional)</legend>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <input placeholder="Min qty tier 1" type="number" value={tier1Min} onChange={(e) => setTier1Min(e.target.value)} className="border rounded-lg px-3 py-2" />
              <input placeholder="₹/unit tier 1" type="number" value={tier1Price} onChange={(e) => setTier1Price(e.target.value)} className="border rounded-lg px-3 py-2" />
              <input placeholder="Min qty tier 2" type="number" value={tier2Min} onChange={(e) => setTier2Min(e.target.value)} className="border rounded-lg px-3 py-2" />
              <input placeholder="₹/unit tier 2" type="number" value={tier2Price} onChange={(e) => setTier2Price(e.target.value)} className="border rounded-lg px-3 py-2" />
            </div>
          </fieldset>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={sampleAvailable} onChange={(e) => setSampleAvailable(e.target.checked)} />
            <span className="text-sm">Offer sample order</span>
          </label>
          {sampleAvailable && (
            <label className="block">
              <span className="text-sm font-medium">Sample price (₹)</span>
              <input type="number" value={samplePrice} onChange={(e) => setSamplePrice(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" />
            </label>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Product image URL</span>
            <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="mt-1 w-full border rounded-lg px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Product video URL (optional)</span>
            <input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." className="mt-1 w-full border rounded-lg px-3 py-2" />
          </label>
          <p className="text-xs text-slate-500">Image/video upload via S3 presign will be wired in Phase 2. Paste URLs for now.</p>
        </div>
      )}

      {step === 4 && (
        <div className="bg-white border rounded-xl p-5 space-y-2 text-sm">
          <p><strong>Name:</strong> {name}</p>
          <p><strong>Category:</strong> {categorySlug}</p>
          <p><strong>Price:</strong> ₹{price} · MOQ {moq} {moqUnit}</p>
          {buildTiers().length > 0 && (
            <p><strong>Tiers:</strong> {buildTiers().map((t) => `${t.minQty}+ @ ₹${t.unitPrice}`).join(", ")}</p>
          )}
          <label className="flex items-center gap-2 mt-4">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            <span>Publish immediately (visible on storefront)</span>
          </label>
        </div>
      )}

      <div className="flex justify-between mt-8">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((s) => s - 1)}
          className="px-4 py-2 border rounded-lg disabled:opacity-40"
        >
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={step === 0 && !categorySlug}
            className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-40"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={loading || !name || !price || !categorySlug}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create product"}
          </button>
        )}
      </div>
    </div>
  );
}
