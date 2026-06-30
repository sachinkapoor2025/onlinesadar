"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useApiClient } from "@/lib/auth-context";
import type { Product } from "@onlinesadar/shared";
import { DEFAULT_PRODUCT_INVENTORY, LOW_STOCK_THRESHOLD } from "@onlinesadar/shared";
import { getUnitsSold, isFastSelling } from "@onlinesadar/shared";
import { formatMoney, paginate, downloadCsv } from "@/lib/admin-utils";
import { TableControls } from "@/components/admin/TableControls";

export default function AdminProductsPage() {
  const apiClient = useApiClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ slug: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    categorySlug: "",
    inventory: String(DEFAULT_PRODUCT_INVENTORY),
    currency: "USD" as "USD" | "INR",
    sku: "",
    compareAtPrice: "",
    tags: "",
    published: true,
  });
  const [csv, setCsv] = useState("");
  const [message, setMessage] = useState("");
  const [lastSlug, setLastSlug] = useState("");
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<"list" | "create">("list");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiClient<{ products: Product[] }>("/admin/products"),
      apiClient<{ categories: { slug: string; name: string }[] }>("/categories"),
    ])
      .then(([p, c]) => {
        setProducts(p.products);
        setCategories(c.categories);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [apiClient]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.slug.includes(q) ||
        p.sku?.toLowerCase().includes(q)
    );
  }, [products, search]);

  const { items: pageItems, totalPages, total } = paginate(filtered, page, pageSize);

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      price: "",
      categorySlug: categories[0]?.slug ?? "",
      inventory: String(DEFAULT_PRODUCT_INVENTORY),
      currency: "USD",
      sku: "",
      compareAtPrice: "",
      tags: "",
      published: true,
    });
    setEditing(null);
  };

  const createProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await apiClient<{ product: { slug: string } }>("/products", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          price: parseFloat(form.price),
          compareAtPrice: form.compareAtPrice ? parseFloat(form.compareAtPrice) : undefined,
          inventory: parseInt(form.inventory, 10),
          categorySlug: form.categorySlug,
          currency: form.currency,
          sku: form.sku || undefined,
          tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
          published: form.published,
        }),
      });
      setLastSlug(result.product.slug);
      setMessage(`Product "${form.name}" created!`);
      resetForm();
      load();
      setTab("list");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed");
    }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      await apiClient(`/products/${editing.slug}`, {
        method: "PUT",
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          price: parseFloat(form.price),
          compareAtPrice: form.compareAtPrice ? parseFloat(form.compareAtPrice) : undefined,
          inventory: parseInt(form.inventory, 10),
          categorySlug: form.categorySlug,
          currency: form.currency,
          sku: form.sku || undefined,
          tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
          published: form.published,
        }),
      });
      setMessage(`Product "${form.name}" updated.`);
      resetForm();
      load();
      setTab("list");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Update failed");
    }
  };

  const startEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description,
      price: String(p.price),
      categorySlug: p.categorySlug,
      inventory: String(p.inventory),
      currency: p.currency,
      sku: p.sku ?? "",
      compareAtPrice: p.compareAtPrice ? String(p.compareAtPrice) : "",
      tags: p.tags?.join(", ") ?? "",
      published: p.published !== false,
    });
    setTab("create");
  };

  const deleteProduct = async (slug: string) => {
    if (!confirm("Delete this product?")) return;
    await apiClient(`/products/${slug}`, { method: "DELETE" });
    load();
  };

  const saveStock = async (slug: string, inventory: number) => {
    if (!Number.isFinite(inventory) || inventory < 0) {
      setMessage("Stock must be 0 or greater.");
      return;
    }
    try {
      await apiClient(`/products/${slug}`, {
        method: "PUT",
        body: JSON.stringify({ inventory: Math.floor(inventory) }),
      });
      setMessage(`Stock updated for ${slug}.`);
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Stock update failed");
    }
  };

  const stockBadge = (inventory: number) => {
    if (inventory <= 0) {
      return (
        <span className="ml-2 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-800">
          Sold out
        </span>
      );
    }
    if (inventory <= LOW_STOCK_THRESHOLD) {
      return (
        <span className="ml-2 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
          Low
        </span>
      );
    }
    return null;
  };

  const bulkUpload = async () => {
    const lines = csv.trim().split("\n");
    if (lines.length < 2) {
      setMessage("CSV needs header + at least one row");
      return;
    }
    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim());
      return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
    });

    try {
      const result = await apiClient<{ created: number; errors: unknown[] }>("/products/bulk", {
        method: "POST",
        body: JSON.stringify({ rows }),
      });
      setMessage(`Bulk upload: ${result.created} created, ${result.errors.length} errors`);
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Bulk upload failed");
    }
  };

  const uploadImage = async (file: File, slug: string) => {
    setUploading(true);
    try {
      const presign = await apiClient<{ uploadUrl: string; publicUrl: string }>("/uploads/presign", {
        method: "POST",
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      await fetch(presign.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      await apiClient(`/products/${slug}/images`, {
        method: "POST",
        body: JSON.stringify({ imageUrl: presign.publicUrl }),
      });
      setMessage(`Image uploaded for "${slug}"`);
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const ProductForm = ({ onSubmit, submitLabel }: { onSubmit: (e: React.FormEvent) => void; submitLabel: string }) => (
    <form onSubmit={onSubmit} className="space-y-4 bg-white border rounded-xl p-5">
      <input
        placeholder="Product name *"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        className="w-full border rounded-lg px-3 py-2"
        required
      />
      <textarea
        placeholder="Description"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        className="w-full border rounded-lg px-3 py-2"
        rows={3}
      />
      <div className="grid sm:grid-cols-2 gap-3">
        <input
          placeholder="Regular price *"
          type="number"
          step="0.01"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          className="border rounded-lg px-3 py-2"
          required
        />
        <input
          placeholder="Sale price (compare at)"
          type="number"
          step="0.01"
          value={form.compareAtPrice}
          onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })}
          className="border rounded-lg px-3 py-2"
        />
        <input
          placeholder="SKU"
          value={form.sku}
          onChange={(e) => setForm({ ...form, sku: e.target.value })}
          className="border rounded-lg px-3 py-2"
        />
        <input
          placeholder="Inventory"
          type="number"
          value={form.inventory}
          onChange={(e) => setForm({ ...form, inventory: e.target.value })}
          className="border rounded-lg px-3 py-2"
        />
        <select
          value={form.categorySlug}
          onChange={(e) => setForm({ ...form, categorySlug: e.target.value })}
          className="border rounded-lg px-3 py-2"
          required
        >
          <option value="">Select category</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={form.currency}
          onChange={(e) => setForm({ ...form, currency: e.target.value as "USD" | "INR" })}
          className="border rounded-lg px-3 py-2"
        >
          <option value="USD">USD</option>
          <option value="INR">INR</option>
        </select>
      </div>
      <input
        placeholder="Tags (comma-separated)"
        value={form.tags}
        onChange={(e) => setForm({ ...form, tags: e.target.value })}
        className="w-full border rounded-lg px-3 py-2"
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.published}
          onChange={(e) => setForm({ ...form, published: e.target.checked })}
        />
        Published (live on storefront)
      </label>
      <div className="flex gap-2">
        <button type="submit" className="bg-accent text-white px-6 py-2 rounded-lg">
          {submitLabel}
        </button>
        {editing && (
          <button type="button" onClick={resetForm} className="border px-4 py-2 rounded-lg text-sm">
            Cancel
          </button>
        )}
      </div>
    </form>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              resetForm();
              setTab("list");
            }}
            className={`px-4 py-2 rounded-lg text-sm ${tab === "list" ? "bg-nav text-white" : "border"}`}
          >
            All products
          </button>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setTab("create");
            }}
            className={`px-4 py-2 rounded-lg text-sm ${tab === "create" ? "bg-nav text-white" : "border"}`}
          >
            {editing ? "Edit product" : "Add product"}
          </button>
        </div>
      </div>

      {message && <p className="text-sm bg-slate-50 border p-3 rounded-lg">{message}</p>}

      {tab === "list" && (
        <>
          <input
            type="search"
            placeholder="Search by name, slug, SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <TableControls
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
          {loading ? (
            <p className="text-slate-500">Loading…</p>
          ) : (
            <div className="bg-white border rounded-lg overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead className="bg-slate-50">
                  <tr className="text-left">
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4">Stock</th>
                    <th className="py-3 px-4">Sold</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((p) => (
                    <tr key={p.slug} className="border-t align-top">
                      <td className="py-3 px-4">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-slate-400">{p.slug}</div>
                      </td>
                      <td className="py-3 px-4 text-xs">{p.sku ?? "—"}</td>
                      <td className="py-3 px-4">{p.categorySlug}</td>
                      <td className="py-3 px-4">
                        {formatMoney(p.price, p.currency)}
                        {p.compareAtPrice && (
                          <div className="text-xs text-slate-400 line-through">
                            {formatMoney(p.compareAtPrice, p.currency)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <form
                          className="flex items-center gap-1"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const input = (e.currentTarget.elements.namedItem("stock") as HTMLInputElement)
                              .value;
                            void saveStock(p.slug, parseInt(input, 10));
                          }}
                        >
                          <input
                            name="stock"
                            type="number"
                            min={0}
                            defaultValue={p.inventory ?? 0}
                            key={`${p.slug}-${p.inventory}`}
                            className="w-20 border rounded px-2 py-1 text-sm"
                          />
                          <button
                            type="submit"
                            className="text-xs text-nav hover:underline whitespace-nowrap"
                          >
                            Save
                          </button>
                          {stockBadge(p.inventory ?? 0)}
                        </form>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold">{getUnitsSold(p)}</span>
                        {isFastSelling(p) && (
                          <span className="ml-1 text-[10px] font-bold text-orange-600 uppercase">Fast</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full w-fit ${
                            p.published !== false ? "bg-green-100 text-green-800" : "bg-slate-100"
                          }`}
                        >
                          {p.published !== false ? "Published" : "Draft"}
                        </span>
                        {(p.inventory ?? 0) <= 0 && p.published !== false && (
                          <span className="text-[10px] text-slate-500">Hidden from shop (sold out)</span>
                        )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => startEdit(p)}
                          className="text-xs text-nav hover:underline mr-2"
                        >
                          Edit
                        </button>
                        <Link href={`/products/${p.slug}`} className="text-xs text-nav hover:underline mr-2">
                          View
                        </Link>
                        <label className="text-xs text-nav hover:underline cursor-pointer mr-2">
                          Image
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploading}
                            onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], p.slug)}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => deleteProduct(p.slug)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === "create" && (
        <div className="space-y-8">
          <ProductForm
            onSubmit={editing ? saveEdit : createProduct}
            submitLabel={editing ? "Save changes" : "Create product"}
          />
          {!editing && lastSlug && (
            <div className="p-4 border rounded-lg bg-white">
              <p className="text-sm mb-2">
                Upload image for <code>{lastSlug}</code>
              </p>
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], lastSlug)}
              />
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold mb-2">Bulk Upload (CSV)</h2>
            <p className="text-sm text-slate-600 mb-3">
              Download the sample template, fill in your products, then paste or upload the CSV below.
            </p>
            <button
              type="button"
              onClick={() =>
                downloadCsv("usarakhi-product-import-template.csv", [
                  [
                    "name",
                    "description",
                    "price",
                    "compareAtPrice",
                    "currency",
                    "categorySlug",
                    "sku",
                    "inventory",
                    "tags",
                    "seoTitle",
                    "seoDescription",
                    "published",
                  ],
                  [
                    "Premium Designer Rakhi",
                    "Handcrafted rakhi with beads and thread",
                    "12.99",
                    "15.99",
                    "USD",
                    "designer-rakhi",
                    "RAK-001",
                    "50",
                    "rakhi,festival",
                    "Premium Designer Rakhi | UsaRakhi",
                    "Shop premium designer rakhi with USA delivery",
                    "true",
                  ],
                ])
              }
              className="text-sm text-nav border border-nav px-4 py-2 rounded-lg hover:bg-nav/5 mb-4"
            >
              Download sample CSV template
            </button>
            <textarea
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              rows={6}
              className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
              placeholder={"name,description,price,categorySlug,inventory,currency,sku\n..."}
            />
            <button onClick={bulkUpload} className="mt-2 bg-slate-800 text-white px-6 py-2 rounded-lg">
              Upload CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
