"use client";

import { useEffect, useState } from "react";
import { useApiClient } from "@/lib/auth-context";

const DOC_TYPES = ["gst", "pan", "bank", "registration", "shop_photo"] as const;

export default function SellerVerificationPage() {
  const apiClient = useApiClient();
  const [docs, setDocs] = useState<{ docType: string; url: string; status: string }[]>([]);
  const [uploads, setUploads] = useState<Record<string, string>>({});

  useEffect(() => {
    apiClient<{ documents: { docType: string; url: string; status: string }[] }>("/seller/documents").then(
      (d) => setDocs(d.documents)
    );
  }, [apiClient]);

  async function upload(docType: string) {
    const url = uploads[docType];
    if (!url) return;
    await apiClient("/seller/documents", {
      method: "POST",
      body: JSON.stringify({ docType, url }),
    });
    setDocs((prev) => [...prev.filter((d) => d.docType !== docType), { docType, url, status: "pending" }]);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Verification center</h1>
      <p className="text-slate-600 mb-6">Upload GST, PAN, bank proof, and registration documents. Required before accepting orders.</p>
      <div className="space-y-4">
        {DOC_TYPES.map((type) => {
          const existing = docs.find((d) => d.docType === type);
          return (
            <div key={type} className="bg-white border rounded-xl p-4">
              <p className="font-semibold capitalize">{type.replace(/_/g, " ")}</p>
              {existing ? (
                <p className="text-sm text-slate-600 mt-1">Status: {existing.status} · {existing.url}</p>
              ) : (
                <div className="mt-2 flex gap-2">
                  <input
                    placeholder="Document URL (S3 upload in Phase 2)"
                    value={uploads[type] ?? ""}
                    onChange={(e) => setUploads((p) => ({ ...p, [type]: e.target.value }))}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                  />
                  <button type="button" onClick={() => void upload(type)} className="bg-primary text-white px-4 py-2 rounded-lg text-sm">
                    Upload
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
