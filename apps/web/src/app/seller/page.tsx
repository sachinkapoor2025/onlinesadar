import Link from "next/link";
import { site } from "@/lib/site";

export default function SellerLandingPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <p className="text-sm uppercase tracking-wide text-orange-600 font-semibold mb-2">
        Sell on {site.name}
      </p>
      <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">
        Bring Sadar Market wholesale to buyers across India &amp; the world
      </h1>
      <p className="text-lg text-slate-600 mb-8 leading-relaxed">
        List your bulk products with MOQ, tier pricing, images and videos. Get a{" "}
        <strong>90-day free trial</strong> — no monthly fee during trial. Reach serious bulk buyers
        who can order samples, pay online, or book with token payment.
      </p>

      <div className="grid md:grid-cols-3 gap-4 mb-10">
        {[
          { title: "90-day free trial", desc: "List products and get sales before any subscription." },
          { title: "Easy listing wizard", desc: "Add MOQ, price tiers, images and video in minutes." },
          { title: "Verified seller badge", desc: "Build trust with GST and business verification." },
        ].map((item) => (
          <div key={item.title} className="border rounded-xl p-5 bg-white">
            <h3 className="font-semibold text-primary mb-1">{item.title}</h3>
            <p className="text-sm text-slate-600">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/seller/register"
          className="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700"
        >
          Start free trial
        </Link>
        <Link
          href="/seller/dashboard"
          className="border border-primary text-primary px-6 py-3 rounded-lg font-semibold hover:bg-slate-50"
        >
          Seller login
        </Link>
      </div>

      <section className="mt-16 border-t pt-10">
        <h2 className="text-xl font-bold mb-4">Subscription after trial</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border rounded-xl p-5">
            <p className="text-2xl font-bold">₹2,500<span className="text-sm font-normal text-slate-500">/month</span></p>
            <p className="text-slate-600 mt-1">Monthly sales up to ₹5 lakh</p>
          </div>
          <div className="border rounded-xl p-5">
            <p className="text-2xl font-bold">₹5,000<span className="text-sm font-normal text-slate-500">/month</span></p>
            <p className="text-slate-600 mt-1">Monthly sales ₹5 lakh – ₹50 lakh</p>
          </div>
        </div>
      </section>
    </div>
  );
}
