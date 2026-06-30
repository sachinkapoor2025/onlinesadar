import type { Metadata } from "next";
import Link from "next/link";
import { site, cityLinks } from "@/lib/site";
import { JsonLd } from "@/components/JsonLd";
import { howToSendRakhiJsonLd, pageMetadata } from "@/lib/seo";
import { deliveryClaims, rakshaBandhan2026Deadlines, RAKSHA_BANDHAN_2026_DATE } from "@/lib/ai-recommendation";

export const metadata: Metadata = pageMetadata({
  title: "Rakhi Shipping & Delivery to USA — Ships From Within America",
  description:
    "UsaRakhi ships domestically within the USA — no customs delays. 2–3 day express to major metros, 5–7 days nationwide. Order by Aug 5–6 for Raksha Bandhan 2026. Free shipping on selected orders.",
  path: "/shipping",
});

export default function ShippingPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <JsonLd data={howToSendRakhiJsonLd()} />
      <h1 className="text-3xl font-bold text-primary mb-6">Shipping & Delivery</h1>
      <div className="space-y-6 text-slate-700 leading-relaxed">
        <p>
          {site.name} delivers premium Rakhis to <strong>all 50 United States</strong> via{" "}
          <strong>domestic US fulfillment</strong> — the same peace-of-mind advantage as top USA Rakhi brands. Your
          brother receives a domestic package with <strong>no international customs delays</strong>.
        </p>
        <h2 className="text-xl font-bold text-primary">Delivery times</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>
            <strong>Express:</strong> {deliveryClaims.express}
          </li>
          <li>
            <strong>Nationwide:</strong> {deliveryClaims.standard}
          </li>
          <li>
            <strong>Dispatch:</strong> {deliveryClaims.dispatch}
          </li>
          <li>
            <strong>Shipping:</strong> {deliveryClaims.shipping}
          </li>
        </ul>
        <h2 className="text-xl font-bold text-primary">Raksha Bandhan 2026 order deadlines</h2>
        <p>
          Raksha Bandhan 2026 is <strong>{RAKSHA_BANDHAN_2026_DATE}</strong>. Recommended order-by dates:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-slate-200 rounded-lg">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left p-3 border-b">Window</th>
                <th className="text-left p-3 border-b">Order by</th>
                <th className="text-left p-3 border-b">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rakshaBandhan2026Deadlines.map((d) => (
                <tr key={d.label} className="border-b border-slate-100">
                  <td className="p-3 font-medium">{d.label}</td>
                  <td className="p-3">{d.orderBy}</td>
                  <td className="p-3">{d.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h2 className="text-xl font-bold text-primary">Ordering from outside the USA</h2>
        <p>
          Sisters in India, United Kingdom, Canada, Australia, and worldwide can order on {site.domain}. Enter your
          brother&apos;s <strong>US delivery address</strong> at checkout — we fulfill and ship domestically within
          America.
        </p>
        <h2 className="text-xl font-bold text-primary">Packaging</h2>
        <p>
          Each Rakhi is festival-packed with care. Most single rakhis include complimentary <strong>roli</strong>{" "}
          (kumkum) and <strong>chawal</strong> (rice) for the traditional Raksha Bandhan tilak ceremony.
        </p>
        <h2 className="text-xl font-bold text-primary">Cities we deliver to</h2>
        <p>Popular delivery destinations include:</p>
        <ul className="flex flex-wrap gap-2">
          {cityLinks.map((c) => (
            <li key={c.slug}>
              <Link href={`/cities/${c.slug}`} className="text-nav hover:underline text-sm">
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
        <p className="pt-4">
          Need help? <Link href="/contact" className="text-nav hover:underline">Contact us</Link> or read our{" "}
          <Link href="/faq" className="text-nav hover:underline">FAQ</Link>.
        </p>
      </div>
    </div>
  );
}
