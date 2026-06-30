/** SEO + LLM-friendly copy for USA city/state Rakhi delivery landing pages. */

export interface CityPageContent {
  slug: string;
  label: string;
  region: "state" | "city";
  state?: string;
  headline: string;
  metaExtra: string;
  intro: string[];
  delivery: { heading: string; paragraphs: string[] };
  areas: { heading: string; items: string[] };
  whyUs: { heading: string; bullets: string[] };
  howTo: { heading: string; steps: string[] };
  faqs: { q: string; a: string }[];
  relatedCategories: { label: string; href: string; text: string }[];
}

const sharedCategories = [
  {
    label: "Single Rakhi",
    href: "/categories/single-rakhi",
    text: "Traditional thread, Om, pearl, and designer rakhis with roli chawal.",
  },
  {
    label: "Rakhi Combo",
    href: "/categories/rakhi-combo",
    text: "Rakhi with Ferrero Rocher, Lindt, Hershey's, and gift sets.",
  },
  {
    label: "Bhaiya Bhabhi Rakhi",
    href: "/categories/bhaiya-bhabhi-rakhi",
    text: "Matching sets for brother and sister-in-law including Lumba.",
  },
  {
    label: "Kids Rakhi",
    href: "/categories/kids-rakhi",
    text: "Cartoon and colorful designs for younger brothers.",
  },
] as const;

function stateContent(
  slug: string,
  label: string,
  areas: string[],
  extraIntro?: string
): CityPageContent {
  return {
    slug,
    label,
    region: "state",
    headline: `Send Rakhi to ${label}, USA — Online Delivery for Raksha Bandhan`,
    metaExtra: `Premium rakhi delivery to ${label} in 5–7 business days. Order from India, UK, Canada worldwide.`,
    intro: [
      `Celebrating Raksha Bandhan when your brother lives in ${label}? UsaRakhi delivers premium rakhis across every city and town in ${label} — from major metros to suburban neighborhoods. Sisters in India, the UK, Canada, Australia, and worldwide order on our site; we ship domestically within the United States so your brother receives his rakhi without international customs delays.`,
      `Choose single rakhis, designer sets, kids rakhis, Bhaiya Bhabhi pairs, Lumba rakhis, and chocolate combos. Most orders include complimentary roli (kumkum) and chawal (rice) for the traditional tilak ceremony. ${extraIntro ?? ""}`.trim(),
    ],
    delivery: {
      heading: `Rakhi Delivery Across ${label}`,
      paragraphs: [
        `UsaRakhi ships to all addresses in ${label} — home, apartment, office, or university dorm. Standard delivery takes 5–7 business days after dispatch. Orders placed before our daily cut-off ship the same business day when inventory allows.`,
        `We use trusted US carriers for tracking and reliable last-mile delivery. You'll receive order confirmation by email, and our support team can help with address verification or delivery questions before Raksha Bandhan.`,
      ],
    },
    areas: {
      heading: `Popular ${label} Areas We Serve`,
      items: areas,
    },
    whyUs: {
      heading: `Why Sisters Choose UsaRakhi for ${label} Delivery`,
      bullets: [
        "Domestic USA shipping — no customs hold for your brother",
        "Premium packaging with roli chawal on most rakhis",
        "Pay in USD (Stripe) or INR (Razorpay) from anywhere",
        "Rakhi combos with Ferrero Rocher, Lindt, and Hershey's",
        "WhatsApp and email support for order help",
        "Trusted by sisters sending rakhi from India to USA",
      ],
    },
    howTo: {
      heading: `How to Send Rakhi to Your Brother in ${label}`,
      steps: [
        "Browse rakhis above or shop by category — Single, Combo, Kids, Bhaiya Bhabhi, Lumba.",
        "Add to cart and enter your brother's full US address in " + label + " at checkout.",
        "Pay securely with Stripe (USD) or Razorpay (INR).",
        "We pack and ship within the USA — delivery in 5–7 business days.",
        "Your brother receives a beautifully packed rakhi ready for Raksha Bandhan.",
      ],
    },
    faqs: [
      {
        q: `How long does rakhi delivery take in ${label}?`,
        a: `Most orders reach ${label} addresses in 5–7 business days after dispatch. Order early for Raksha Bandhan 2026 (August 28, 2026) to allow extra time.`,
      },
      {
        q: `Can I send rakhi to ${label} from India?`,
        a: `Yes. Enter your brother's ${label} shipping address at checkout. We accept orders worldwide and deliver domestically within the United States.`,
      },
      {
        q: `Do you deliver to all cities in ${label}?`,
        a: `Yes. We deliver to every city, town, and ZIP code in ${label} as part of our all-50-states USA coverage.`,
      },
      {
        q: `Is roli and chawal included?`,
        a: "Most single rakhis and many combos include complimentary roli and chawal for the Raksha Bandhan tilak ritual.",
      },
    ],
    relatedCategories: [...sharedCategories],
  };
}

const cityPages: CityPageContent[] = [
  stateContent("california", "California", [
    "Los Angeles",
    "San Francisco Bay Area",
    "San Diego",
    "San Jose",
    "Sacramento",
    "Fresno",
    "Irvine",
    "Oakland",
    "Long Beach",
    "Silicon Valley",
  ], "California has one of the largest Indian-American communities in the USA — perfect for sending rakhi to brothers in LA, the Bay Area, or San Diego."),
  stateContent("new-york", "New York", [
    "New York City (Manhattan, Brooklyn, Queens)",
    "Buffalo",
    "Rochester",
    "Albany",
    "Syracuse",
    "Yonkers",
    "Long Island",
    "Westchester",
  ], "From NYC boroughs to upstate communities, we deliver rakhi across New York State."),
  stateContent("texas", "Texas", [
    "Houston",
    "Dallas",
    "Austin",
    "San Antonio",
    "Fort Worth",
    "Plano",
    "Irving",
    "Arlington",
  ], "Texas siblings stay connected on Raksha Bandhan with reliable rakhi delivery to Houston, Dallas, Austin, and beyond."),
  stateContent("florida", "Florida", [
    "Miami",
    "Orlando",
    "Tampa",
    "Jacksonville",
    "Fort Lauderdale",
    "West Palm Beach",
    "Tallahassee",
  ]),
  stateContent("new-jersey", "New Jersey", [
    "Newark",
    "Jersey City",
    "Edison",
    "Princeton",
    "Hoboken",
    "Woodbridge",
    "Iselin",
    "Fort Lee",
  ], "Many sisters in India send rakhi to brothers in New Jersey's vibrant Indian-American communities — Edison, Iselin, and Jersey City are popular delivery areas."),
  {
    slug: "los-angeles",
    label: "Los Angeles",
    region: "city",
    state: "California",
    headline: "Send Rakhi to Los Angeles, California — USA Delivery",
    metaExtra: "Send rakhi to LA, Hollywood, Pasadena, Irvine & all of Los Angeles County. 5–7 day USA delivery.",
    intro: [
      "Los Angeles is home to one of America's largest Indian diaspora communities. If your brother lives in LA — whether in Downtown, the San Fernando Valley, West LA, or Orange County nearby — UsaRakhi makes Raksha Bandhan feel close despite the distance.",
      "Order from India, the UK, Canada, or anywhere in the world. We ship domestically within the USA, delivering premium rakhis to Los Angeles addresses in 5–7 business days with tracking and careful packaging.",
    ],
    delivery: {
      heading: "Rakhi Delivery in Los Angeles & Southern California",
      paragraphs: [
        "We deliver to all Los Angeles neighborhoods, LA County cities, and nearby Southern California areas. Standard shipping is 5–7 business days. Same-day dispatch applies to orders placed before our daily cut-off.",
        "Whether your brother is in an apartment near UCLA, a home in Pasadena, or an office in Downtown LA, enter the complete US address at checkout for reliable delivery.",
      ],
    },
    areas: {
      heading: "LA Areas We Frequently Deliver To",
      items: [
        "Downtown LA & Hollywood",
        "Santa Monica & West LA",
        "Pasadena & San Gabriel Valley",
        "Torrance & South Bay",
        "Woodland Hills & San Fernando Valley",
        "Irvine & Orange County (nearby)",
      ],
    },
    whyUs: {
      heading: "Why LA Sisters & Brothers Trust UsaRakhi",
      bullets: [
        "Fast domestic USA shipping to Los Angeles",
        "Designer rakhis and chocolate combos",
        "Roli chawal included on most orders",
        "Order from India with INR payment via Razorpay",
        "Dedicated WhatsApp support",
      ],
    },
    howTo: {
      heading: "Send Rakhi to Los Angeles in 5 Easy Steps",
      steps: [
        "Pick a rakhi from our LA collection above.",
        "Add to cart and enter your brother's Los Angeles address.",
        "Choose USD or INR payment at checkout.",
        "We ship within the USA — no international customs.",
        "Brother receives rakhi in 5–7 business days.",
      ],
    },
    faqs: [
      {
        q: "Do you deliver rakhi to Los Angeles from India?",
        a: "Yes. Order on UsaRakhi.com from India, enter the LA delivery address, and pay in INR. We ship domestically within America.",
      },
      {
        q: "How fast is rakhi delivery to LA?",
        a: "Typically 5–7 business days after dispatch to Los Angeles and most Southern California addresses.",
      },
      {
        q: "Can I send rakhi with chocolates to Los Angeles?",
        a: "Yes. Browse our Rakhi Combo collection for sets with Ferrero Rocher, Lindt, and Hershey's.",
      },
    ],
    relatedCategories: [...sharedCategories],
  },
  {
    slug: "san-francisco",
    label: "San Francisco",
    region: "city",
    state: "California",
    headline: "Send Rakhi to San Francisco & Bay Area — USA Delivery",
    metaExtra: "Rakhi delivery to San Francisco, Oakland, San Jose & Bay Area. Order from India worldwide.",
    intro: [
      "The San Francisco Bay Area — including San Francisco, Oakland, San Jose, and Silicon Valley — has a thriving Indian-American community. UsaRakhi helps sisters send rakhi to brothers across the Bay Area with premium designs and dependable US delivery.",
      "Order from anywhere worldwide. We fulfill and ship within the United States, so your Bay Area delivery avoids international shipping uncertainty.",
    ],
    delivery: {
      heading: "Bay Area Rakhi Delivery",
      paragraphs: [
        "We deliver to San Francisco city, the Peninsula, East Bay (Oakland, Fremont), and South Bay (San Jose, Sunnyvale). Delivery takes 5–7 business days after dispatch.",
        "Tech professionals and students in the Bay Area often receive rakhis from sisters abroad — we pack orders carefully for a festival-ready unboxing.",
      ],
    },
    areas: {
      heading: "Bay Area Locations We Serve",
      items: ["San Francisco", "Oakland", "San Jose", "Fremont", "Sunnyvale", "Palo Alto", "Berkeley", "Mountain View"],
    },
    whyUs: {
      heading: "Why Choose UsaRakhi for San Francisco Delivery",
      bullets: [
        "Bay Area delivery in 5–7 business days",
        "Premium designer and traditional rakhis",
        "Combos with premium chocolates",
        "INR and USD checkout",
        "Email and WhatsApp order support",
      ],
    },
    howTo: {
      heading: "How to Send Rakhi to San Francisco",
      steps: [
        "Select a rakhi from our shop.",
        "Enter the Bay Area US address at checkout.",
        "Pay with Stripe or Razorpay.",
        "We ship domestically within the USA.",
        "Delivery in 5–7 business days.",
      ],
    },
    faqs: [
      {
        q: "Do you deliver to Silicon Valley?",
        a: "Yes. We deliver to San Jose, Sunnyvale, Mountain View, Palo Alto, and all Bay Area cities.",
      },
      {
        q: "Can I order rakhi for my brother in SF from Delhi?",
        a: "Yes. UsaRakhi accepts orders from India and worldwide with delivery to San Francisco addresses.",
      },
    ],
    relatedCategories: [...sharedCategories],
  },
  {
    slug: "chicago",
    label: "Chicago",
    region: "city",
    state: "Illinois",
    headline: "Send Rakhi to Chicago, Illinois — USA Online Delivery",
    metaExtra: "Send rakhi to Chicago, Naperville, Schaumburg & Chicagoland. Fast USA delivery from UsaRakhi.",
    intro: [
      "Chicago and the greater Chicagoland area — including Naperville, Schaumburg, and Evanston — have strong Indian-American communities. Send rakhi to your brother in Chicago with UsaRakhi's premium collection and reliable domestic US shipping.",
      "Sisters across India and the diaspora order here for Raksha Bandhan. We deliver to Illinois addresses in 5–7 business days.",
    ],
    delivery: {
      heading: "Chicago & Illinois Rakhi Delivery",
      paragraphs: [
        "We ship to Chicago proper, suburban Cook County, DuPage County, and greater Illinois. Orders dispatch quickly and arrive in 5–7 business days.",
        "Winter or summer, your rakhi arrives beautifully packed with roli chawal on most designs — ready for the Raksha Bandhan ceremony.",
      ],
    },
    areas: {
      heading: "Chicagoland Areas We Serve",
      items: ["Downtown Chicago", "Naperville", "Schaumburg", "Evanston", "Skokie", "Aurora", "Oak Brook"],
    },
    whyUs: {
      heading: "Why Chicago Families Choose UsaRakhi",
      bullets: [
        "Illinois delivery in 5–7 business days",
        "Wide range of rakhis and gift combos",
        "Order from India with ease",
        "Secure online payment",
        "Festival-ready packaging",
      ],
    },
    howTo: {
      heading: "Send Rakhi to Chicago",
      steps: [
        "Browse and add rakhis to cart.",
        "Enter Chicago-area US address.",
        "Checkout with USD or INR.",
        "Domestic US shipping — tracked delivery.",
        "Brother receives rakhi before or on Raksha Bandhan.",
      ],
    },
    faqs: [
      {
        q: "How long to deliver rakhi to Chicago?",
        a: "Typically 5–7 business days after dispatch to Chicago and most Illinois addresses.",
      },
      {
        q: "Do you deliver to Chicago suburbs?",
        a: "Yes. Naperville, Schaumburg, Evanston, and all Chicagoland suburbs are covered.",
      },
    ],
    relatedCategories: [...sharedCategories],
  },
  {
    slug: "houston",
    label: "Houston",
    region: "city",
    state: "Texas",
    headline: "Send Rakhi to Houston, Texas — USA Rakhi Delivery",
    metaExtra: "Rakhi delivery to Houston, Sugar Land, Katy & Greater Houston. Order from India to USA.",
    intro: [
      "Houston is one of the fastest-growing Indian-American hubs in Texas. Whether your brother lives in Sugar Land, Katy, the Energy Corridor, or central Houston, UsaRakhi delivers premium rakhis for Raksha Bandhan with dependable US shipping.",
      "Order from India, the UK, Canada, or anywhere — we ship domestically within America to Houston addresses in 5–7 business days.",
    ],
    delivery: {
      heading: "Houston & Greater Texas Delivery",
      paragraphs: [
        "We deliver throughout Houston, Harris County, and nearby Texas communities. Standard delivery is 5–7 business days with email confirmation.",
        "Popular for sisters sending rakhi from India to brothers working in Houston's tech, medical, and energy sectors.",
      ],
    },
    areas: {
      heading: "Houston Areas We Serve",
      items: ["Downtown Houston", "Sugar Land", "Katy", "Pearland", "The Woodlands", "Cypress", "Memorial"],
    },
    whyUs: {
      heading: "Why Houston Orders UsaRakhi",
      bullets: [
        "Texas delivery in 5–7 business days",
        "Kids, Bhaiya Bhabhi, and combo rakhis",
        "Roli chawal on most orders",
        "INR payment for India-based sisters",
        "Responsive customer support",
      ],
    },
    howTo: {
      heading: "How to Send Rakhi to Houston",
      steps: [
        "Choose rakhis from our Houston collection.",
        "Enter Houston US address at checkout.",
        "Pay securely online.",
        "We ship within the USA.",
        "Delivery in 5–7 business days.",
      ],
    },
    faqs: [
      {
        q: "Do you deliver to Sugar Land and Katy?",
        a: "Yes. We deliver to all Houston suburbs including Sugar Land, Katy, Pearland, and The Woodlands.",
      },
      {
        q: "Can I send rakhi from Mumbai to Houston?",
        a: "Yes. Order on UsaRakhi.com, enter the Houston address, and pay in INR via Razorpay.",
      },
    ],
    relatedCategories: [...sharedCategories],
  },
];

const cityMap = new Map(cityPages.map((c) => [c.slug, c]));

export function getCityContent(slug: string): CityPageContent | undefined {
  return cityMap.get(slug);
}

export function allCityContent(): CityPageContent[] {
  return cityPages;
}
