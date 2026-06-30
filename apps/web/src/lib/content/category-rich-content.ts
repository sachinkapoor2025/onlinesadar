/** Rich SEO layout content for category pages (mirrors city page structure). */

export interface CategoryRichContent {
  slug: string;
  headline: string;
  intro: string[];
  delivery: { heading: string; paragraphs: string[] };
  highlights: { heading: string; items: string[] };
  tradition?: { heading: string; paragraphs: string[] };
  whyUs: { heading: string; bullets: string[] };
  howTo: { heading: string; steps: string[] };
  faqs: { q: string; a: string }[];
  relatedCategories: { label: string; href: string; text: string }[];
}

const relatedAll = [
  { label: "Single Rakhi", href: "/categories/single-rakhi", text: "Traditional and designer rakhis with roli chawal." },
  { label: "Rakhi Combo", href: "/categories/rakhi-combo", text: "Rakhi with Ferrero Rocher, Lindt, Hershey's." },
  { label: "Bhaiya Bhabhi Rakhi", href: "/categories/bhaiya-bhabhi-rakhi", text: "Matching sets for brother and Bhabhi." },
  { label: "Kids Rakhi", href: "/categories/kids-rakhi", text: "Cartoon and colorful rakhis for little brothers." },
  { label: "Lumba Rakhi", href: "/categories/lumba-rakhi", text: "Bracelet-style rakhis for sister-in-law." },
];

function relatedExcept(slug: string) {
  return relatedAll.filter((c) => !c.href.endsWith(slug));
}

export const categoryRichContent: Record<string, CategoryRichContent> = {
  "single-rakhi": {
    slug: "single-rakhi",
    headline: "Single Rakhi for USA Delivery — Traditional & Designer Rakhis",
    intro: [
      "Our Single Rakhi collection is curated for sisters who want one beautiful rakhi for their brother — whether he lives in California, New York, Texas, or any US state. Each design reflects the purity and love of Raksha Bandhan, crafted with premium threads, beads, and motifs.",
      "Every single rakhi includes complimentary roli (kumkum) and chawal (rice) so your brother can perform the traditional tilak ceremony on festival day — even when you are celebrating from India, the UK, Canada, or across the world.",
      "Order online, enter your brother's US address at checkout, and we deliver domestically within America in 5–7 business days. No international customs delays for your brother's doorstep delivery.",
    ],
    delivery: {
      heading: "Single Rakhi Delivery Across the USA",
      paragraphs: [
        "UsaRakhi ships single rakhis to all 50 US states — home addresses, apartments, offices, and university campuses. Standard delivery is 5–7 business days after dispatch.",
        "Popular destinations include California, New York, New Jersey, Texas, Florida, Illinois, and Washington. Sisters in India order most frequently during July and August ahead of Raksha Bandhan 2026 (August 28).",
      ],
    },
    highlights: {
      heading: "Popular Single Rakhi Styles",
      items: [
        "Om and spiritual rakhis — divine symbols for blessings and protection",
        "Pearl and designer rakhis — elegant choices for adult brothers",
        "Evil eye (Nazar) rakhis — trendy designs with protective symbolism",
        "Traditional multicolor thread rakhis — classic festival favorites",
        "Stone and bead rakhis — premium finishes for a special Raksha Bandhan",
        "Minimalist silk thread rakhis — perfect for brothers who prefer subtle designs",
      ],
    },
    tradition: {
      heading: "Why Single Rakhi Remains a Raksha Bandhan Favorite",
      paragraphs: [
        "The single rakhi is the heart of Raksha Bandhan — one sacred thread tied on your brother's wrist as a promise of love and protection. Whether simple or designer, it carries the same emotional weight as being there in person.",
      ],
    },
    whyUs: {
      heading: "Why Order Single Rakhi from UsaRakhi",
      bullets: [
        "Roli and chawal included on most single rakhis",
        "Domestic USA shipping — order from India worldwide",
        "5–7 business day delivery to all 50 states",
        "Premium packaging ready for the festival",
        "Secure payment in USD or INR",
        "WhatsApp and email order support",
      ],
    },
    howTo: {
      heading: "How to Send a Single Rakhi to Your Brother in the USA",
      steps: [
        "Choose a single rakhi from the collection above.",
        "Add to cart and enter your brother's full US shipping address.",
        "Pay with Stripe (USD) or Razorpay (INR).",
        "We pack with roli chawal and ship within the USA.",
        "Your brother receives his rakhi in 5–7 business days.",
      ],
    },
    faqs: [
      {
        q: "Does every single rakhi include roli and chawal?",
        a: "Most single rakhis in our collection include complimentary roli and chawal for the tilak ceremony. Check the product description for details.",
      },
      {
        q: "Can I send a single rakhi from India to the USA?",
        a: "Yes. Order on UsaRakhi.com from India, enter the US delivery address, and pay in INR via Razorpay. We ship domestically within America.",
      },
      {
        q: "How long does single rakhi delivery take?",
        a: "Typically 5–7 business days after dispatch to any US state.",
      },
      {
        q: "Which single rakhi is best for an adult brother?",
        a: "Pearl, designer, and Om spiritual rakhis are popular for adult brothers. Browse the collection above for current styles.",
      },
    ],
    relatedCategories: relatedExcept("single-rakhi"),
  },
  "kids-rakhi": {
    slug: "kids-rakhi",
    headline: "Kids Rakhi for USA — Fun Designs Your Little Brother Will Love",
    intro: [
      "Kids Rakhi makes Raksha Bandhan extra special for little brothers. Our collection features cartoon characters, bright colors, and soft threads that children love to wear all day — from Chhota Bheem and Mickey Mouse to Doraemon and playful BRO-themed designs.",
      "Each kids rakhi is crafted with child-friendly materials — lightweight threads and safe embellishments suitable for toddlers, school-age boys, and teens who still enjoy festive fun.",
      "Many kids rakhis come with chocolate add-ons (Hershey's, assorted minis) for a sweet surprise. Order from anywhere in the world; we deliver to your brother's US address in 5–7 business days.",
    ],
    delivery: {
      heading: "Kids Rakhi Delivery to All 50 US States",
      paragraphs: [
        "Whether your little brother lives in California, Texas, New York, or any American city, UsaRakhi delivers kids rakhis with the same reliable 5–7 business day domestic shipping.",
        "Parents and sisters in India often order kids rakhis for brothers studying or living with relatives in the USA. Enter the US address at checkout — we handle fulfillment inside America.",
      ],
    },
    highlights: {
      heading: "Best Kids Rakhi for Brothers in the USA",
      items: [
        "Cartoon rakhis — Chhota Bheem, Mickey Mouse, Doraemon, and more",
        "Soft silk and thread rakhis — comfortable for toddlers and young boys",
        "Kids rakhi with chocolates — Hershey's and assorted minis",
        "BRO charm and superhero-style rakhis — trendy for school-age brothers",
        "Bright multicolor rakhis — eye-catching festival favorites",
        "Combo sets — multiple kids rakhis for families with more than one brother",
      ],
    },
    tradition: {
      heading: "Making Raksha Bandhan Memorable for Kids",
      paragraphs: [
        "For young brothers, Raksha Bandhan is about color, excitement, and feeling loved from afar. A fun kids rakhi paired with a video call on festival day helps sisters in India stay connected with little brothers in America.",
      ],
    },
    whyUs: {
      heading: "Why Parents & Sisters Choose UsaRakhi for Kids Rakhi",
      bullets: [
        "Child-safe materials and lightweight designs",
        "Cartoon and character rakhis kids actually want to wear",
        "Optional chocolate add-ons for extra joy",
        "Fast USA delivery in 5–7 business days",
        "Order from India with INR payment",
        "Gift-ready packaging for Raksha Bandhan",
      ],
    },
    howTo: {
      heading: "Tips for Ordering Kids Rakhi to the USA",
      steps: [
        "Pick an age-appropriate design — bold cartoons for toddlers, subtler styles for teens.",
        "Order 10–14 days before Raksha Bandhan 2026 (August 28) for stress-free delivery.",
        "Enter the correct US address including apartment or unit number.",
        "Consider a kids rakhi with chocolates for an extra surprise.",
        "Schedule a video call on festival day so your little brother can show off his rakhi.",
      ],
    },
    faqs: [
      {
        q: "Are kids rakhis safe for toddlers?",
        a: "Our kids rakhis use child-friendly materials and lightweight threads. Always supervise very young children during the tying ceremony.",
      },
      {
        q: "Can I send kids rakhi with chocolates to the USA?",
        a: "Yes. Browse our Kids Rakhi collection for designs bundled with Hershey's or assorted chocolates.",
      },
      {
        q: "How early should I order kids rakhi for Raksha Bandhan?",
        a: "We recommend ordering 10–14 days before August 28, 2026 for on-time delivery across all US states.",
      },
      {
        q: "Do you deliver kids rakhi from India to America?",
        a: "Yes. Sisters in India order on UsaRakhi.com, enter the US address, and we ship domestically within the USA.",
      },
    ],
    relatedCategories: relatedExcept("kids-rakhi"),
  },
};

export function getCategoryRichContent(slug: string): CategoryRichContent | undefined {
  return categoryRichContent[slug];
}
