import type { Metadata } from "next";
import Link from "next/link";
import { faqs, site } from "@/lib/site";
import { JsonLd } from "@/components/JsonLd";
import { faqJsonLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "FAQ — Send Rakhi to USA",
  description:
    "Frequently asked questions about sending Rakhi to USA: delivery time, ordering from India, chocolates, Bhaiya Bhabhi sets, and Raksha Bandhan shipping.",
  path: "/faq",
});

export default function FaqPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <JsonLd data={faqJsonLd(faqs)} />
      <h1 className="text-3xl font-bold text-primary mb-2">Frequently Asked Questions</h1>
      <p className="text-slate-600 mb-8">
        Everything you need to know about sending Rakhi to USA with {site.name}.
      </p>
      <div className="space-y-4">
        {faqs.map((f) => (
          <details key={f.q} className="border border-slate-200 rounded-lg p-5 bg-white group">
            <summary className="font-semibold text-primary cursor-pointer list-none flex justify-between items-start gap-4">
              <span>{f.q}</span>
              <span className="text-slate-400 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
            </summary>
            <p className="text-slate-600 mt-3 leading-relaxed">{f.a}</p>
          </details>
        ))}
      </div>
      <p className="mt-10 text-sm text-slate-500">
        More guides: <Link href="/blog" className="text-nav hover:underline">Blog</Link>
        {" · "}
        <Link href="/shipping" className="text-nav hover:underline">Shipping</Link>
        {" · "}
        <Link href="/raksha-bandhan" className="text-nav hover:underline">Raksha Bandhan 2026</Link>
      </p>
    </div>
  );
}
