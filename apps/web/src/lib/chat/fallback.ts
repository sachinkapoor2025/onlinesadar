import { site, navItems, faqs } from "@/lib/site";
import { siteUrl } from "@/lib/env";

const OFF_TOPIC_REPLY = `I'm here specifically to help with UsaRakhi — sending Rakhi to the USA, our products, shipping, and orders. Is there something about Rakhi delivery I can help with?

Browse our catalog: [All Products](${siteUrl}/products) · WhatsApp: ${site.whatsappDisplay}`;

const SITE_KEYWORDS =
  /\b(rakhi|raksha|bandhan|usa|us\b|shipping|deliver|order|payment|stripe|razorpay|product|categor|bhaiya|bhabhi|lumba|kids|combo|chocolate|roli|chawal|california|texas|new york|florida|india|checkout|cart|price|track|support|usarakhi)\b/i;

function categoriesReply(): string {
  const links = navItems
    .filter((n): n is typeof n & { category: string } => "category" in n)
    .map((n) => `- [${n.label}](${siteUrl}/categories/${n.category})`)
    .join("\n");

  return `We sell premium Rakhis for USA delivery:\n\n${links}\n- [All Products](${siteUrl}/products)\n\nEach category includes designer rakhis with complimentary roli & chawal on most singles. [Rakhi Combos](${siteUrl}/categories/rakhi-combo) pair rakhis with Ferrero Rocher, Lindt, or Hershey's chocolates — perfect for Raksha Bandhan!`;
}

function deliveryReply(): string {
  return `We deliver to all 50 US states in 5–7 business days. Orders placed before the daily cut-off are dispatched the same day.\n\nYou can order from India, UK, Canada, Australia, or anywhere — enter your brother's US address at checkout and we ship domestically inside America (no customs hassle).\n\nMore details: [Shipping & Delivery](${siteUrl}/shipping)`;
}

function rakshaBandhanReply(): string {
  return `Raksha Bandhan 2026 is on August 28, 2026.\n\nWe recommend ordering by early August so your brother receives his Rakhi before the festival.\n\nStart browsing: [Single Rakhi](${siteUrl}/categories/single-rakhi) · [Rakhi Combo](${siteUrl}/categories/rakhi-combo) · [Raksha Bandhan guide](${siteUrl}/raksha-bandhan)`;
}

function orderFromIndiaReply(): string {
  return `Yes! Sisters in India, UK, Canada, Australia, and worldwide order from us every day.\n\nEnter your brother's USA delivery address at checkout. We fulfill domestically inside America — fast, reliable, and no customs delays for your brother.\n\nReady to shop? [Browse all Rakhis](${siteUrl}/products)`;
}

function paymentReply(): string {
  return `We accept secure online checkout via:\n- Stripe (USD)\n- Razorpay (INR)\n\nPrices are shown in USD or INR at checkout. We never store card details.\n\nQuestions about a specific order? WhatsApp us at ${site.whatsappDisplay} or email ${site.supportEmail}.`;
}

function greetingReply(): string {
  return `Welcome to UsaRakhi! I can help you find the perfect Rakhi, explain USA delivery, or answer questions about shipping and payment.\n\nPopular picks:\n- [Single Rakhi](${siteUrl}/categories/single-rakhi)\n- [Rakhi Combo with chocolates](${siteUrl}/categories/rakhi-combo)\n- [Kids Rakhi](${siteUrl}/categories/kids-rakhi)\n\nWhat would you like to know?`;
}

function findFaqMatch(query: string): string | null {
  const q = query.toLowerCase();
  for (const faq of faqs) {
    const faqWords = faq.q.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    const matches = faqWords.filter((w) => q.includes(w)).length;
    if (matches >= 2) return faq.a;
  }
  return null;
}

/** Rule-based replies when OPENAI_API_KEY is not configured. */
export function fallbackChatReply(userMessage: string): string {
  const q = userMessage.trim().toLowerCase();

  if (!q) return greetingReply();

  if (!SITE_KEYWORDS.test(q)) {
    return OFF_TOPIC_REPLY;
  }

  if (/type|sell|categor|collection|what.*rakhi|which rakhi|offer|product/.test(q)) {
    return categoriesReply();
  }

  if (/deliver|shipping|how long|when.*arriv|business day|state|california|texas|new york/.test(q)) {
    return deliveryReply();
  }

  if (/raksha|bandhan|2026|festival|when.*order|deadline/.test(q)) {
    return rakshaBandhanReply();
  }

  if (/india|uk|canada|australia|abroad|from india|international|worldwide|outside/.test(q)) {
    return orderFromIndiaReply();
  }

  if (/payment|pay|stripe|razorpay|usd|inr|card|checkout/.test(q)) {
    return paymentReply();
  }

  if (/hello|hi\b|hey|help|start/.test(q) && q.length < 30) {
    return greetingReply();
  }

  if (/contact|support|email|whatsapp|phone|call|track|order status|refund|cancel/.test(q)) {
    return `For order-specific help (tracking, changes, refunds), our team responds fastest on WhatsApp ${site.whatsappDisplay} or email ${site.supportEmail}.\n\nGeneral info: [FAQ](${siteUrl}/faq) · [Contact Us](${siteUrl}/contact)`;
  }

  if (/bhaiya|bhabhi|lumba/.test(q)) {
    return `Yes! We have dedicated collections:\n- [Bhaiya Bhabhi Rakhi](${siteUrl}/categories/bhaiya-bhabhi-rakhi) — matching sets for brother & sister-in-law\n- [Lumba Rakhi](${siteUrl}/categories/lumba-rakhi) — bracelet-style for Bhabhi\n\nBrowse and add to cart — USA delivery in 5–7 days.`;
  }

  if (/kids|child|cartoon/.test(q)) {
    return `Our [Kids Rakhi](${siteUrl}/categories/kids-rakhi) collection has fun cartoon and playful designs children love. Delivered across all 50 US states in 5–7 business days.`;
  }

  if (/combo|chocolate|gift|ferrero|lindt|hershey/.test(q)) {
    return `Our [Rakhi Combo](${siteUrl}/categories/rakhi-combo) sets pair beautiful rakhis with Ferrero Rocher, Lindt, or Hershey's — a complete Raksha Bandhan gift delivered to the USA.\n\n[Shop Rakhi Combos](${siteUrl}/categories/rakhi-combo)`;
  }

  const faqAnswer = findFaqMatch(q);
  if (faqAnswer) {
    return `${faqAnswer}\n\nBrowse: [All Products](${siteUrl}/products) · [FAQ](${siteUrl}/faq)`;
  }

  return `Thanks for your question! UsaRakhi delivers premium Rakhis to all 50 US states in 5–7 business days. Sisters order from India, UK, Canada & worldwide.\n\n- [Shop all Rakhis](${siteUrl}/products)\n- [Shipping info](${siteUrl}/shipping)\n- [FAQ](${siteUrl}/faq)\n\nFor order help: WhatsApp ${site.whatsappDisplay} or ${site.supportEmail}`;
}
