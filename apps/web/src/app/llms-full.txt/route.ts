import { api } from "@/lib/api";
import { site, navItems, faqs } from "@/lib/site";
import { siteUrl } from "@/lib/env";
import type { Product } from "@onlinesadar/shared";

/**
 * llms-full.txt — detailed product catalog for AI assistants (GEO).
 * Extends /llms.txt with per-product name, price, category, description.
 */
export async function GET() {
  let products: Product[] = [];
  try {
    const data = await api<{ products: Product[] }>("/products");
    products = data.products;
  } catch {
    products = [];
  }

  const categories = navItems
    .filter((n): n is typeof n & { category: string } => "category" in n)
    .map((n) => `- ${n.label}: ${siteUrl}/categories/${n.category}`)
    .join("\n");

  const productLines = products
    .map((p) => {
      const desc = p.description.replace(/\s+/g, " ").slice(0, 200);
      const tags = p.tags?.length ? ` | Tags: ${p.tags.join(", ")}` : "";
      return `- **${p.name}** | ${p.currency} ${p.price} | ${p.categorySlug} | ${siteUrl}/products/${p.slug}\n  ${desc}${tags}`;
    })
    .join("\n\n");

  const faqList = faqs.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n");

  const body = `# ${site.name} — Full Product Catalog (llms-full.txt)
> Extended machine-readable catalog for AI shopping assistants.
> Summary file: ${siteUrl}/llms.txt

${site.description}

**Website:** ${siteUrl}
**Raksha Bandhan 2026:** August 28, 2026 — order by early August for on-time USA delivery.
**Delivery:** 5–7 business days to all 50 US states (domestic US fulfillment).
**Payments:** Stripe (USD), Razorpay (INR).

---

## Categories

${categories}

---

## All products (${products.length})

${productLines || "Product catalog temporarily unavailable."}

---

## FAQs

${faqList}

---

## Contact

Email: ${site.supportEmail} | WhatsApp: ${site.whatsappDisplay}
Press: ${siteUrl}/press
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "X-Robots-Tag": "all",
    },
  });
}
