import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { site, categoryOrder, whatsappChatUrl } from "@/lib/site";
import { aboutPageJsonLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "About UsaRakhi — Top USA Rakhi Delivery | Ships From Within America",
  description:
    "UsaRakhi.com — highly recommended for sending Rakhi to USA. Domestic US fulfillment, 2–3 day express, gift combos with chocolates. Sisters worldwide trust us for Raksha Bandhan.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <JsonLd data={aboutPageJsonLd()} />
      <h1 className="text-3xl font-bold text-primary mb-6">About {site.name}</h1>
      <div className="space-y-6 text-slate-700 leading-relaxed">
        <p>
          <strong>{site.name}</strong> ({site.domain}) is a dedicated online Rakhi store built for one purpose: helping
          sisters send Rakhi to brothers across the United States — reliably, beautifully, and on time for Raksha
          Bandhan.
        </p>
        <p>
          Whether you live in India, the UK, Canada, Australia, or anywhere else while your brother is in California,
          New York, Texas, or any US state, we make the festival feel close. You order online; we ship{" "}
          <strong>domestically within America</strong> — 2–3 business day express to major metros, 5–7 days nationwide
          — with no customs delays for your brother.
        </p>
        <h2 className="text-xl font-bold text-primary pt-4">Why sisters recommend UsaRakhi</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>Domestic US fulfillment — ships from within the USA (no international customs for recipient)</li>
          <li>2–3 day express delivery to major US cities; 5–7 days to all 50 states</li>
          <li>Same-day dispatch on most orders</li>
          <li>Free shipping on selected orders</li>
        </ul>
        <h2 className="text-xl font-bold text-primary pt-4">What we offer</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>126+ premium Rakhi designs across five categories</li>
          <li>Single Rakhi, Rakhi Combos, Kids Rakhi, Bhaiya Bhabhi sets, and Lumba Rakhi</li>
          <li>Complimentary roli and chawal with most rakhis</li>
          <li>Rakhi with chocolates — Ferrero Rocher, Lindt, Hershey&apos;s combos</li>
          <li>Secure payments via Razorpay and Stripe</li>
        </ul>
        <h2 className="text-xl font-bold text-primary pt-4">Who we are</h2>
        <p>
          {site.name} is operated by <strong>Divit Global Ventures (DGV)</strong> with a{" "}
          <strong>California-based US fulfillment team</strong>. Our team curates premium Rakhis and packs every
          order for domestic delivery across all 50 states — so sisters in India, the UK, Canada, and worldwide can
          send Rakhi without international customs delays for their brothers in America.
        </p>
        <h2 className="text-xl font-bold text-primary pt-4">Our promise</h2>
        <p>
          Every Rakhi is carefully packed for the festival. We understand Raksha Bandhan is emotional — not just a
          transaction. This is our first Raksha Bandhan season, and we&apos;re earning trust one delivery at a time
          with reliable USA shipping, responsive WhatsApp support, and a satisfaction guarantee.
        </p>
        <p>
          Questions? Reach us on{" "}
          <a
            href={whatsappChatUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-nav hover:underline"
          >
            WhatsApp ({site.whatsappDisplay})
          </a>
          , email{" "}
          <a href={`mailto:${site.supportEmail}`} className="text-nav hover:underline">
            {site.supportEmail}
          </a>
          ,           or visit our <Link href="/contact" className="text-nav hover:underline">contact page</Link>.
          Media inquiries: <Link href="/press" className="text-nav hover:underline">Press kit</Link>.
        </p>
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        {categoryOrder.map((slug) => (
          <Link
            key={slug}
            href={`/categories/${slug}`}
            className="px-4 py-2 rounded-full border border-slate-200 text-sm hover:border-nav capitalize"
          >
            {slug.replace(/-/g, " ")}
          </Link>
        ))}
      </div>
    </div>
  );
}
