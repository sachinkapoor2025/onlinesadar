import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { site, categoryOrder, homeBanners, cityLinks } from "@/lib/site";
import {
  rakshaBandhanShowcase,
  rakshaBandhanSteps,
  rakshaBandhanStories,
  rakshaBandhanFaqs,
  rakshaBandhanContent,
} from "@/lib/content/raksha-bandhan";
import { JsonLd } from "@/components/JsonLd";
import { faqJsonLd, pageMetadata, rakshaBandhanEventJsonLd } from "@/lib/seo";
import { resolveImageUrl } from "@/lib/images";

export const metadata: Metadata = pageMetadata({
  title: "Raksha Bandhan 2026 USA — Send Rakhi Online | August 28",
  description:
    "Raksha Bandhan 2026 is August 28. Highly recommended USA Rakhi delivery — ships from within America, 2–3 day express, gift combos. Order by Aug 5–6 from India, UK & worldwide.",
  path: "/raksha-bandhan",
  keywords:
    "best website send rakhi USA, raksha bandhan 2026, rakhi delivery USA domestic shipping, send rakhi from India to USA, order rakhi August 5 2026, rakhi with chocolates USA, usarakhi",
});

export default function RakshaBandhanPage() {
  const hero = homeBanners[0];
  const content = rakshaBandhanContent;

  return (
    <div>
      <JsonLd data={[faqJsonLd(rakshaBandhanFaqs), rakshaBandhanEventJsonLd()]} />

      {/* Hero */}
      <section className="relative bg-primary text-white overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <Image src={hero.src} alt={hero.alt} fill className="object-cover" priority sizes="100vw" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 py-16 md:py-24 text-center">
          <p className="text-sm uppercase tracking-widest text-white/80 mb-3">{hero.eyebrow}</p>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Raksha Bandhan 2026 — Send Rakhi to USA
          </h1>
          <p className="text-lg text-white/90 max-w-2xl mx-auto mb-6 leading-relaxed">
            The sacred bond between brothers and sisters knows no distance. When you cannot be there in
            person, {site.name} delivers your love — premium Rakhis to every corner of America.
          </p>
          <div className="inline-block px-6 py-3 bg-white/15 backdrop-blur rounded-xl border border-white/25 mb-8">
            <p className="text-sm text-white/80">Raksha Bandhan 2026</p>
            <p className="text-2xl font-bold">Friday, August 28, 2026</p>
            <p className="text-sm text-white/70 mt-1">Order by early August for on-time USA delivery</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/products" className="px-6 py-3 bg-accent text-white font-semibold rounded-lg hover:opacity-90">
              Shop All Rakhis
            </Link>
            <Link
              href="/blog/raksha-bandhan-2026-usa"
              className="px-6 py-3 bg-white text-primary font-semibold rounded-lg hover:bg-white/90"
            >
              Read the 2026 Guide
            </Link>
          </div>
        </div>
      </section>

      {/* SEO intro */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <div className="space-y-4 text-slate-700 leading-relaxed">
          {content.intro.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </section>

      {/* Showcase grid */}
      <section className="max-w-7xl mx-auto px-4 py-10 border-t border-slate-100">
        <h2 className="text-2xl md:text-3xl font-bold text-primary text-center mb-2">
          Premium Rakhis for Raksha Bandhan 2026
        </h2>
        <p className="text-center text-slate-600 mb-10 max-w-2xl mx-auto">
          Single rakhis, chocolate combos, kids designs, and Bhaiya Bhabhi sets — all delivered across the USA.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {rakshaBandhanShowcase.map((item) => (
            <figure key={item.src} className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
              <div className="relative aspect-square bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolveImageUrl(item.src)} alt={item.alt} className="w-full h-full object-contain p-2" />
              </div>
              <figcaption className="p-3 text-sm font-medium text-primary text-center">{item.caption}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Why UsaRakhi */}
      <section className="bg-slate-50 border-y border-slate-200 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-primary mb-6">{content.whyUsaRakhi.heading}</h2>
          <ul className="grid sm:grid-cols-2 gap-3">
            {content.whyUsaRakhi.points.map((point) => (
              <li key={point} className="flex gap-2 text-slate-700 text-sm leading-relaxed">
                <span className="text-nav shrink-0 font-bold">✓</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Brother & sister stories */}
      <section className="py-14">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-primary text-center mb-2">
            Real Stories — Brothers & Sisters Across Miles
          </h2>
          <p className="text-center text-slate-600 mb-10 max-w-2xl mx-auto">
            Sisters worldwide trust {site.name} to keep the Raksha Bandhan tradition alive when oceans lie between
            them and their brothers.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {rakshaBandhanStories.map((story) => (
              <article key={story.sister} className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                <div className="relative aspect-[4/5] max-h-72 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={resolveImageUrl(story.image)} alt={`${story.sister} and ${story.brother}`} className="w-full h-full object-cover object-top" />
                </div>
                <div className="p-6">
                  <p className="text-xs font-semibold text-nav uppercase tracking-wide mb-1">
                    {story.sister} → {story.brother}
                  </p>
                  <p className="text-sm text-slate-500 mb-3">{story.city}</p>
                  <blockquote className="text-slate-700 text-sm leading-relaxed italic">&ldquo;{story.quote}&rdquo;</blockquote>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Traditions */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-primary mb-6">{content.tradition.heading}</h2>
        <div className="space-y-4 text-slate-700 leading-relaxed">
          {content.tradition.paragraphs.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </section>

      {/* How to celebrate */}
      <section className="max-w-5xl mx-4 lg:mx-auto px-4 py-12 bg-slate-50 rounded-2xl">
        <h2 className="text-2xl font-bold text-primary text-center mb-10">
          How to Send Rakhi to USA — 4 Simple Steps
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {rakshaBandhanSteps.map((item) => (
            <div key={item.step} className="text-center p-6 rounded-xl border border-slate-200 bg-white">
              <span className="inline-flex w-10 h-10 items-center justify-center rounded-full bg-nav text-white font-bold mb-4">
                {item.step}
              </span>
              <h3 className="font-bold text-primary mb-2">{item.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Order timeline */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-primary mb-6">{content.orderGuide.heading}</h2>
        <ul className="space-y-3">
          {content.orderGuide.paragraphs.map((item) => (
            <li key={item} className="flex gap-3 text-slate-700 leading-relaxed">
              <span className="text-accent shrink-0">●</span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* Cities */}
      <section className="max-w-4xl mx-auto px-4 py-10 border-t border-slate-100">
        <h2 className="text-2xl font-bold text-primary mb-4">{content.cities.heading}</h2>
        <p className="text-slate-700 leading-relaxed mb-6">{content.cities.text}</p>
        <div className="flex flex-wrap gap-2">
          {cityLinks.map((c) => (
            <Link
              key={c.slug}
              href={`/cities/${c.slug}`}
              className="px-3 py-1.5 rounded-full border border-slate-200 text-sm text-primary hover:border-nav hover:text-nav"
            >
              {c.label}
            </Link>
          ))}
        </div>
      </section>

      {/* Shop categories */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-primary mb-6 text-center">Shop Rakhi by Category</h2>
        <div className="grid sm:grid-cols-2 gap-3 mb-8">
          {categoryOrder.map((slug) => (
            <Link
              key={slug}
              href={`/categories/${slug}`}
              className="p-5 border rounded-xl hover:border-nav hover:shadow-md transition capitalize font-medium text-primary flex items-center justify-between group"
            >
              {slug.replace(/-/g, " ")}
              <span className="text-nav group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-4 text-sm">
          <Link href="/blog/send-rakhi-to-usa-from-india" className="text-nav font-semibold hover:underline">
            Send Rakhi from India guide →
          </Link>
          <Link href="/blog/best-rakhi-combo-with-chocolates" className="text-nav font-semibold hover:underline">
            Best Rakhi combos →
          </Link>
          <Link href="/shipping" className="text-nav font-semibold hover:underline">
            Shipping & delivery →
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-12 border-t border-slate-100">
        <h2 className="text-2xl font-bold text-primary text-center mb-2">Raksha Bandhan 2026 — FAQ</h2>
        <p className="text-center text-sm text-slate-500 mb-8">
          <Link href="/faq" className="text-nav hover:underline">View all FAQs</Link>
        </p>
        <div className="space-y-3">
          {rakshaBandhanFaqs.map((f) => (
            <details key={f.q} className="border border-slate-200 rounded-lg p-5 bg-white">
              <summary className="font-semibold text-primary cursor-pointer text-sm">{f.q}</summary>
              <p className="text-slate-600 text-sm mt-3 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-white py-14 text-center px-4">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready for Raksha Bandhan 2026?</h2>
        <p className="text-white/85 max-w-xl mx-auto mb-8 leading-relaxed">
          Send Rakhi to your brother in the USA today. 126+ premium designs, 5–7 day delivery, roli chawal included.
        </p>
        <Link href="/products" className="inline-block px-8 py-3 bg-accent text-white font-semibold rounded-lg hover:opacity-90">
          Shop Rakhis Now
        </Link>
      </section>
    </div>
  );
}
