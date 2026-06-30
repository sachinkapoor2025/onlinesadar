/** Extended SEO content per category — shown below product listings. */
export interface CategoryContent {
  /** Extra paragraphs appended after the API category description. */
  extraParagraphs: string[];
  /** Optional sub-sections with headings. */
  sections?: { heading: string; paragraphs: string[] }[];
}

export const categoryContent: Record<string, CategoryContent> = {
  "single-rakhi": {
    extraParagraphs: [
      "Every single rakhi in our collection includes complimentary roli (kumkum) and chawal (rice) so your brother can perform the traditional tilak ceremony on Raksha Bandhan — even when you are miles apart.",
      "Order from India, the UK, Canada, Australia, or anywhere in the world. Enter your brother's US address at checkout and we deliver domestically within America in 5–7 business days to California, New York, Texas, Florida, New Jersey, and all 50 states.",
    ],
    sections: [
      {
        heading: "Popular single rakhi styles",
        paragraphs: [
          "Om and spiritual rakhis — divine symbols for blessings and protection.",
          "Pearl and designer rakhis — elegant choices for adult brothers.",
          "Evil eye (Nazar) rakhis — trendy designs with protective symbolism.",
          "Traditional multicolor thread rakhis — classic festival favorites.",
        ],
      },
    ],
  },
  "rakhi-combo": {
    extraParagraphs: [
      "Our Rakhi Combo collection is perfect when you have more than one brother, want to send Rakhi with chocolates, or prefer a complete gift set in one beautifully packed box. Each combo is curated for Raksha Bandhan and delivered across all 50 US states.",
      "Sisters in India and worldwide trust UsaRakhi to send combo sets to brothers in America — without international shipping delays or customs hassles. We fulfill orders domestically within the USA for fast, reliable delivery in 5–7 business days.",
    ],
    sections: [
      {
        heading: "What's included in our Rakhi combos",
        paragraphs: [
          "Multi-rakhi sets — two or three rakhis in one package for brothers of different ages.",
          "Rakhi with Ferrero Rocher — premium gold-wrapped chocolates paired with designer rakhis.",
          "Rakhi with Lindt Lindor — smooth Swiss chocolate with traditional or modern rakhi designs.",
          "Rakhi with Hershey's — fun, affordable combos popular with younger brothers and kids.",
          "Rakhi with roli chawal — complete festival sets for the tilak ceremony.",
        ],
      },
      {
        heading: "Why choose a Rakhi combo for USA delivery?",
        paragraphs: [
          "One order, one delivery — ideal for sisters sending from India to a US address.",
          "Gift-ready packaging for Raksha Bandhan presentation.",
          "Better value than buying rakhis and chocolates separately.",
          "Perfect for Raksha Bandhan 2026 — order by early August for on-time delivery.",
        ],
      },
    ],
  },
  "kids-rakhi": {
    extraParagraphs: [
      "Kids Rakhi brings extra joy to Raksha Bandhan — cartoon characters, bright colors, and soft threads that little brothers love to wear all day. Our collection includes Chhota Bheem, Mickey Mouse, Doraemon, BRO-themed rakhis, and playful designs crafted with child-safe materials.",
      "Many kids rakhis come with chocolate add-ons (Hershey's, assorted minis) for a sweet surprise. Order from anywhere in the world; we deliver to your brother's US address in 5–7 business days.",
    ],
    sections: [
      {
        heading: "Best Kids Rakhi for brothers in USA",
        paragraphs: [
          "Cartoon and superhero rakhis — Chhota Bheem, Mickey Mouse, Doraemon, and more.",
          "Soft silk and thread rakhis — lightweight and comfortable for toddlers and young boys.",
          "Kids Rakhi with chocolates — Hershey's and assorted minis paired with fun designs.",
          "BRO charm rakhis — trendy styles for school-age brothers.",
        ],
      },
      {
        heading: "Tips for ordering Kids Rakhi to USA",
        paragraphs: [
          "Order 10–14 days before Raksha Bandhan 2026 (August 28) for stress-free delivery.",
          "Pick age-appropriate designs — toddlers love bold colors; teens may prefer subtler styles.",
          "Combine with a video call on festival day so your little brother can show off his new rakhi.",
        ],
      },
    ],
  },
  "bhaiya-bhabhi-rakhi": {
    extraParagraphs: [
      "In many Indian families, Raksha Bandhan celebrates both your brother and your sister-in-law (Bhabhi). Our Bhaiya Bhabhi Rakhi sets include a traditional rakhi for Bhaiya and a matching Lumba (bracelet-style rakhi) for Bhabhi — often in coordinated colors and elegant designs.",
      "Whether your brother and Bhabhi live in California, New York, Texas, or any US state, UsaRakhi delivers these sets in 5–7 business days. Sisters in India, UK, and Canada order online and enter the US delivery address at checkout.",
    ],
    sections: [
      {
        heading: "What is in a Bhaiya Bhabhi Rakhi set?",
        paragraphs: [
          "Brother's rakhi — traditional thread or designer style tied on the wrist.",
          "Lumba rakhi for Bhabhi — decorative bracelet tied on the bangle.",
          "Matching designs — peach, pink, gold, and pearl coordinated sets.",
          "Combo options — some sets include Ferrero Rocher, Lindt, or Hershey's chocolates.",
        ],
      },
      {
        heading: "When to send Bhaiya Bhabhi Rakhi to USA",
        paragraphs: [
          "Ideal when your brother is married and living in America.",
          "Order by early August 2026 for Raksha Bandhan on August 28.",
          "Gift-packed and ready for the festival — no extra wrapping needed.",
        ],
      },
    ],
  },
  "lumba-rakhi": {
    extraParagraphs: [
      "Lumba Rakhi is a decorative bracelet-style rakhi tied on the bangle of your Bhabhi (sister-in-law) during Raksha Bandhan. It extends the festival blessing to the couple and honors the bond between a sister and her brother's wife.",
      "UsaRakhi offers standalone Lumba Rakhis and complete Bhaiya Bhabhi sets with matching designs. Delivered to all 50 US states in 5–7 business days — order from India, UK, Canada, or anywhere worldwide.",
    ],
    sections: [
      {
        heading: "Lumba Rakhi styles we offer",
        paragraphs: [
          "Pink pearl and floral Lumba rakhis — elegant festival favorites.",
          "Peach and gold designer Lumba rakhis — soft pastel tones for Bhabhi.",
          "Lumba with chocolates — paired with Ferrero Rocher, Lindt, or Hershey's.",
          "Premium stone and bead Lumba rakhis — for a luxurious Raksha Bandhan gift.",
        ],
      },
      {
        heading: "Lumba Rakhi vs traditional Rakhi",
        paragraphs: [
          "Traditional rakhi is tied on the brother's wrist.",
          "Lumba rakhi is worn as a bangle accessory on the sister-in-law's wrist.",
          "Many sisters order both together in a Bhaiya Bhabhi set for complete festival coverage.",
        ],
      },
    ],
  },
};

export function getCategoryContent(slug: string): CategoryContent | undefined {
  return categoryContent[slug];
}
