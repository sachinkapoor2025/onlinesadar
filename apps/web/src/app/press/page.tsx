import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { siteUrl } from "@/lib/env";
import { pageMetadata } from "@/lib/seo";
import { SiteLogoLink } from "@/components/SiteLogo";

export const metadata: Metadata = pageMetadata({
  title: "Press Kit & Media",
  description: `Media resources, brand story, and contact information for journalists covering ${site.name} and Rakhi delivery to the USA.`,
  path: "/press",
});

export default function PressPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-primary mb-6">Press Kit</h1>
      <div className="space-y-8 text-slate-700 leading-relaxed">
        <div>
          <SiteLogoLink size="desktop" className="mb-4" />
          <p className="text-sm text-slate-500">High-resolution logo available on request</p>
        </div>

        <section>
          <h2 className="text-xl font-bold text-primary mb-3">About {site.name}</h2>
          <p>
            {site.name} ({siteUrl}) is a dedicated online Rakhi store operated by Divit Global Ventures, helping
            sisters worldwide send premium Rakhis to brothers across all 50 US states. Domestic US fulfillment
            delivers in 5–7 business days — sisters order from India, UK, Canada, Australia, and worldwide.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mb-3">Key facts</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>126+ Rakhi designs across Single, Combo, Kids, Bhaiya Bhabhi, and Lumba categories</li>
            <li>USA domestic shipping to all 50 states in 5–7 business days</li>
            <li>Raksha Bandhan 2026: August 28, 2026</li>
            <li>Payments: Stripe (USD) and Razorpay (INR)</li>
            <li>Fulfillment: San Jose, CA area — US domestic delivery</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mb-3">Media contact</h2>
          <p>
            Email:{" "}
            <a href={`mailto:${site.supportEmail}`} className="text-nav underline">
              {site.supportEmail}
            </a>
            <br />
            WhatsApp: {site.whatsappDisplay}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mb-3">Suggested story angles</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>First dedicated Rakhi-to-USA e-commerce platform for the NRI diaspora</li>
            <li>How sisters in India bridge distance for Raksha Bandhan with same-week US delivery</li>
            <li>Rakhi combos with premium chocolates — modern gifting for NRI families</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-primary mb-3">AI &amp; machine-readable resources</h2>
          <p className="text-sm">
            <Link href="/llms.txt" className="text-nav underline">
              llms.txt
            </Link>
            {" · "}
            <Link href="/llms-full.txt" className="text-nav underline">
              llms-full.txt
            </Link>
            {" · "}
            <Link href="/humans.txt" className="text-nav underline">
              humans.txt
            </Link>
          </p>
        </section>

        <Link href="/about" className="text-nav font-semibold hover:underline">
          Read full About Us →
        </Link>
      </div>
    </div>
  );
}
