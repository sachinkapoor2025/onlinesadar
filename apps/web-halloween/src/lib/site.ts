import { cdnUploadUrl } from "@hr-ecom/shared";

export const site = {
  name: "HalloweenReady",
  domain: "halloweenready.com",
  tagline: "Halloween Costumes & Decor — Fast USA Shipping",
  description:
    "HalloweenReady.com — your USA Halloween shop for costumes, decorations, candy, party supplies, and home decor. Ships across all 50 states. Shop adult & kids costumes, outdoor inflatables, spooky lights, and treat bags before October 31.",
  supportEmail: "support@halloweenready.com",
  phone: "+1 888 426 8374",
  whatsapp: "18884268374",
  whatsappDisplay: "+1 888 426 8374",
  logoSrc: "/logo.svg",
  primaryColor: "#1a0a2e",
  navBlue: "#ff7518",
  accentColor: "#8b5cf6",
} as const;

export const navItems = [
  { label: "Home", href: "/" },
  { label: "Costumes", href: "/categories/costumes", category: "costumes" },
  { label: "Kids Costumes", href: "/categories/kids-costumes", category: "kids-costumes" },
  { label: "Decorations", href: "/categories/decorations", category: "decorations" },
  { label: "Candy & Treats", href: "/categories/candy-treats", category: "candy-treats" },
  { label: "Party Supplies", href: "/categories/party-supplies", category: "party-supplies" },
  { label: "Halloween Guide", href: "/halloween-guide" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
] as const;

export const cityLinks = [
  { label: "California", slug: "california" },
  { label: "New York", slug: "new-york" },
  { label: "Texas", slug: "texas" },
  { label: "Florida", slug: "florida" },
  { label: "Illinois", slug: "illinois" },
  { label: "Los Angeles", slug: "los-angeles" },
  { label: "Chicago", slug: "chicago" },
  { label: "Houston", slug: "houston" },
  { label: "New York City", slug: "new-york-city" },
] as const;

export const homeBanners = [
  {
    src: "/banners/halloween-hero-1.svg",
    alt: "Halloween costumes and decorations — shop the USA collection",
    href: "/categories/costumes",
    eyebrow: "HALLOWEEN 2026 · USA SHIPPING",
    title: "Get Spook-Ready for",
    titleAccent: "Halloween Night",
    description:
      "Costumes, decor, candy, and party essentials delivered across America. Order early — October 31 waits for no one.",
    cta: "Shop Costumes",
    pill: "Adult & Kids · Decor · Treats · Free shipping on select orders",
  },
  {
    src: "/banners/halloween-hero-2.svg",
    alt: "Outdoor Halloween decorations and inflatables",
    href: "/categories/decorations",
    eyebrow: "YARD & PORCH",
    title: "Haunt Your Home",
    titleAccent: "In Style",
    description:
      "Inflatable ghosts, string lights, wreaths, and tabletop decor to transform your porch into the neighborhood favorite.",
    cta: "Shop Decorations",
    pill: "Outdoor · Indoor · Lights · Inflatables",
  },
  {
    src: "/banners/halloween-hero-3.svg",
    alt: "Kids Halloween costumes and treat bags",
    href: "/categories/kids-costumes",
    eyebrow: "TRICK OR TREAT",
    title: "Kids Costumes They'll",
    titleAccent: "Love",
    description:
      "Classic characters, superheroes, and cute spooky looks — sized for toddlers through teens, ready for school parades and door-to-door fun.",
    cta: "Shop Kids Costumes",
    pill: "Sizes 2T–Teen · Accessories · Treat bags",
  },
] as const;

export const promoBanners = [
  {
    src: cdnUploadUrl("2026/06/review-picture-2.png"),
    alt: "Happy Halloween customers",
  },
  {
    src: cdnUploadUrl("2026/03/coustomer-3-768x1152-1.webp"),
    alt: "Halloween party ready",
  },
] as const;

export const homeCategoryOrder = [
  "costumes",
  "kids-costumes",
  "decorations",
  "candy-treats",
  "party-supplies",
  "home-decor",
] as const;

export const categoryOrder = homeCategoryOrder;

export function orderCategories<T extends { slug: string }>(categories: readonly T[]): T[] {
  const rank = new Map<string, number>(homeCategoryOrder.map((slug, index) => [slug, index]));
  return [...categories].sort((a, b) => (rank.get(a.slug) ?? 99) - (rank.get(b.slug) ?? 99));
}

export function whatsappChatUrl(message = "Hi HalloweenReady, I need help with my order."): string {
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(message)}`;
}

export const testimonials = [
  {
    name: "Sarah M.",
    rating: 5,
    timeAgo: "3 days ago",
    image: cdnUploadUrl("2026/06/Untitled-design-31-1.png"),
    text: "Ordered matching family costumes and they arrived in Texas in four days. Quality was great and my kids were obsessed with their looks for trunk-or-treat.",
  },
  {
    name: "Mike R.",
    rating: 5,
    timeAgo: "1 week ago",
    image: cdnUploadUrl("2026/06/review-picture-2.png"),
    text: "The inflatable reaper and orange string lights made our porch the talk of the block. HalloweenReady had everything in one order.",
  },
  {
    name: "Jennifer L.",
    rating: 5,
    timeAgo: "2 weeks ago",
    image: cdnUploadUrl("2026/06/puja3.png"),
    text: "Last-minute costume panic solved! Found a witch costume with accessories and express shipping to New Jersey — made it before our party.",
  },
  {
    name: "David K.",
    rating: 5,
    timeAgo: "3 weeks ago",
    image: cdnUploadUrl("2026/03/coustomer-3-768x1152-1.webp"),
    text: "Party supplies, candy buckets, and decor shipped together. Checkout was easy and support answered my sizing question on WhatsApp.",
  },
] as const;

export const faqs = [
  {
    q: "When should I order Halloween costumes and decor for October 31?",
    a: "Order by early October for standard shipping nationwide. For express delivery to major metros, mid-October is usually fine — but popular costumes sell out fast, so shop in September when possible.",
  },
  {
    q: "Does HalloweenReady ship to all 50 US states?",
    a: "Yes. We ship costumes, decorations, candy, and party supplies to every US state including Alaska and Hawaii (extended transit may apply).",
  },
  {
    q: "How long does Halloween delivery take?",
    a: "Express delivery in 2–4 business days to major cities. Nationwide delivery typically takes 5–7 business days. Cut-off times are shown at checkout.",
  },
  {
    q: "Do you sell kids and adult costumes?",
    a: "Yes. Browse adult costumes, kids costumes (toddler through teen), plus wigs, masks, and accessories to complete your look.",
  },
  {
    q: "Can I return a costume if the size doesn't fit?",
    a: "Unworn items with tags attached may be returned within our return window — see our Returns page for full policy. Exchange fast if you need a different size before Halloween.",
  },
  {
    q: "Do you sell Halloween candy and treat bags?",
    a: "Yes. Shop individually wrapped candy, bulk treat bags, buckets, and party favor packs for trick-or-treaters and classroom parties.",
  },
  {
    q: "What payment methods do you accept?",
    a: "Stripe (USD — Visa, Mastercard, Amex) and Razorpay (INR — UPI, cards, netbanking) for secure checkout.",
  },
  {
    q: "Is HalloweenReady legit?",
    a: "HalloweenReady is a USA-focused Halloween shop with secure checkout, order tracking, email support, and WhatsApp help. Read customer reviews and contact us before ordering if you have questions.",
  },
] as const;
