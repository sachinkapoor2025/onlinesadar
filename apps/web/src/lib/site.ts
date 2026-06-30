export const site = {
  name: "OnlineSadar",
  domain: "onlinesadar.com",
  tagline: "Sadar Market Online — Bulk Wholesale from Delhi to India & Worldwide",
  description:
    "OnlineSadar.com brings Sadar Market wholesale online. Buy bulk stationery, textiles, kitchenware, fashion accessories, and more with transparent MOQ, tier pricing, sample orders, and direct shipping across India and internationally.",
  supportEmail: "support@onlinesadar.com",
  phone: "+91 96504 57697",
  whatsapp: "919650457697",
  whatsappDisplay: "+91 96504 57697",
  logoSrc: "/logo.png",
  primaryColor: "#1e3a5f",
  navBlue: "#2563eb",
  accentColor: "#ea580c",
  companyLegal: "Divit Global Ventures",
} as const;

export const navItems = [
  { label: "Home", href: "/" },
  { label: "All Products", href: "/products" },
  { label: "Stationery", href: "/categories/stationery-paper", category: "stationery-paper" },
  { label: "Textiles", href: "/categories/textiles-fabrics", category: "textiles-fabrics" },
  { label: "Kitchen", href: "/categories/kitchen-household", category: "kitchen-household" },
  { label: "Fashion", href: "/categories/fashion-accessories", category: "fashion-accessories" },
  { label: "Sell on OnlineSadar", href: "/seller" },
  { label: "Contact", href: "/contact" },
] as const;

export const homeBanners = [
  {
    src: "/banners/banner-wholesale-market.png",
    alt: "OnlineSadar — Sadar Market wholesale online",
    href: "/products",
    eyebrow: "SADAR MARKET · WHOLESALE",
    title: "Bulk Products from Delhi's",
    titleAccent: "Sadar Market",
    description:
      "Transparent MOQ, tier pricing, sample orders, and shipping across India and worldwide. One step ahead of IndiaMart.",
    cta: "Browse Wholesale",
    pill: "MOQ from 10 · Sample packs · Verified sellers",
  },
  {
    src: "/banners/banner-bulk-order.png",
    alt: "Order bulk with token payment option",
    href: "/products",
    eyebrow: "BULK BUYERS",
    title: "Book Large Orders with",
    titleAccent: "Token Payment",
    description:
      "Pay a token amount online, settle the balance directly with verified sellers. Secure, flexible, built for serious buyers.",
    cta: "Explore Products",
    pill: "Token booking · Direct seller settlement",
  },
  {
    src: "/banners/banner-seller.png",
    alt: "Sell on OnlineSadar marketplace",
    href: "/seller",
    eyebrow: "MANUFACTURERS & TRADERS",
    title: "List Your Products on",
    titleAccent: "OnlineSadar",
    description:
      "3-month free trial for sellers. Easy listing wizard, analytics, and reach bulk buyers across India and abroad.",
    cta: "Start Selling Free",
    pill: "90-day trial · Easy product listing",
  },
] as const;

/** Homepage category sections display order */
export const homeCategoryOrder = [
  "stationery-paper",
  "textiles-fabrics",
  "kitchen-household",
  "fashion-accessories",
  "festive-seasonal",
  "bags-luggage",
  "electronics-accessories",
  "toys-games",
] as const;

export const categoryOrder = homeCategoryOrder;

export function orderCategories<T extends { slug: string }>(categories: readonly T[]): T[] {
  const rank = new Map<string, number>(homeCategoryOrder.map((slug, index) => [slug, index]));
  return [...categories].sort((a, b) => (rank.get(a.slug) ?? 99) - (rank.get(b.slug) ?? 99));
}

export function whatsappChatUrl(message = "Hi OnlineSadar, I need help with a bulk order."): string {
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(message)}`;
}

export const testimonials = [
  {
    name: "Rajesh Traders",
    rating: 5,
    timeAgo: "1 week ago",
    image: "/testimonials/trader-1.png",
    text: "We sourced 500 hanky packets and 200 notebook bundles through OnlineSadar. MOQ was clear, sample order helped us decide, and delivery was on time to Jaipur.",
  },
  {
    name: "Priya Exports",
    rating: 5,
    timeAgo: "2 weeks ago",
    image: "/testimonials/trader-2.png",
    text: "Finally a marketplace where we can see product details, videos, and pay a token for large orders. Much better than endless calls on other B2B sites.",
  },
  {
    name: "Metro Gifts",
    rating: 5,
    timeAgo: "3 weeks ago",
    image: "/testimonials/trader-3.png",
    text: "Sample order for festive diyas before placing a 2000-piece bulk order saved us from a bad purchase. OnlineSadar is built for serious bulk buyers.",
  },
] as const;

export const faqs = [
  {
    q: "What is OnlineSadar?",
    a: "OnlineSadar is an online wholesale marketplace inspired by Delhi's Sadar Market. We connect bulk buyers with verified manufacturers and traders across India, with shipping to other countries.",
  },
  {
    q: "What is MOQ and how does it work?",
    a: "Minimum Order Quantity (MOQ) varies by product — from 10 units for larger items like paper bundles to 100+ for small items like hanky packets. The MOQ is shown on every product page and enforced at checkout.",
  },
  {
    q: "Can I order a sample before bulk purchase?",
    a: "Yes. Many products offer paid sample orders at a nominal price plus shipping. Sample quantity is limited (usually 1–3 units) so you can verify quality before a bulk order.",
  },
  {
    q: "What is token payment for large orders?",
    a: "For high-value bulk orders, you can pay a token percentage online (via Razorpay to Divit Global Ventures) and transfer the remaining balance directly to the verified seller's bank account after confirmation with our team.",
  },
  {
    q: "How do I become a seller on OnlineSadar?",
    a: "Register for a free 90-day trial at /seller. You'll receive a signup coupon valid for 4 hours to complete registration with your business details. After verification, list products via our easy listing wizard.",
  },
  {
    q: "Do you ship internationally?",
    a: "Yes. Many sellers offer international shipping. Check the product page for shipsInternational and contact us for export documentation support.",
  },
  {
    q: "What payment methods are accepted?",
    a: "Razorpay (INR — UPI, cards, netbanking) for India and Stripe (USD) for international buyers. Token amounts are collected via our payment gateway; balance can be settled via bank transfer.",
  },
] as const;

export const promoBanners: readonly { src: string; alt: string }[] = [];
export const cityLinks: readonly { label: string; slug: string }[] = [];
