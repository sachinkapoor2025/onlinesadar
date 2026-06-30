import { cdnUploadUrl } from "@onlinesadar/shared";
import { deliveryClaims, rakshaBandhan2026Deadlines, RAKSHA_BANDHAN_2026_DATE } from "@/lib/ai-recommendation";

/** Visual content for the Raksha Bandhan landing page. */
export const rakshaBandhanStories = [
  {
    sister: "Neha",
    brother: "Rahul",
    city: "California, USA",
    image: cdnUploadUrl("2026/06/Untitled-design-31-1.png"),
    quote:
      "I am in Delhi; Rahul is in San Jose. Every Raksha Bandhan I video-call while he opens the Rakhi we sent through UsaRakhi. Last year he wore it to work — his colleagues asked about the festival. That moment made the distance feel smaller.",
  },
  {
    sister: "Anjali",
    brother: "Vikram",
    city: "New York, USA",
    image: cdnUploadUrl("2026/06/review-picture-2.png"),
    quote:
      "Vikram married and moved to Manhattan. I send a Bhaiya Bhabhi set so both he and my Bhabhi feel included. The Lumba rakhi is always her favourite part — she sends me photos every year.",
  },
  {
    sister: "Pooja",
    brother: "Arjun",
    city: "Texas, USA",
    image: cdnUploadUrl("2026/06/puja3.png"),
    quote:
      "Arjun was eight when we moved to Mumbai; he stayed with our uncle in Houston for school. Kids Rakhi with chocolates is our tradition now — he still acts surprised when the box arrives.",
  },
] as const;

export const rakshaBandhanShowcase = [
  {
    src: cdnUploadUrl("2026/05/fercho.png"),
    alt: "Rakhi with Ferrero Rocher combo — Raksha Bandhan gift USA",
    caption: "Rakhi + Ferrero Rocher combos",
  },
  {
    src: cdnUploadUrl("2026/03/Om-Single-Rakhi-1-e1779466859856.png"),
    alt: "Om Single Rakhi with roli chawal",
    caption: "Traditional Om Rakhi",
  },
  {
    src: cdnUploadUrl("2026/04/Chhota-Bheem-Kids-Rakhi-with-Assorted-Chocolates-e1775565435556.jpg"),
    alt: "Chhota Bheem Kids Rakhi with chocolates",
    caption: "Kids Rakhi with chocolates",
  },
  {
    src: cdnUploadUrl("2026/04/Bhai-Bhabhi-Lumba-Rakhi-Set-e1776082926101.jpg"),
    alt: "Bhaiya Bhabhi Lumba Rakhi set",
    caption: "Bhaiya Bhabhi sets",
  },
] as const;

export const rakshaBandhanSteps = [
  {
    step: "1",
    title: "Choose your Rakhi",
    text: "Browse single rakhis, combos, kids designs, or Bhaiya Bhabhi sets.",
  },
  {
    step: "2",
    title: "Enter US address",
    text: "Order from India or anywhere — add your brother's USA delivery address.",
  },
  {
    step: "3",
    title: "We deliver in America",
    text: "Domestic US shipping — 2–3 day express to major metros, 5–7 days nationwide. No customs delays.",
  },
  {
    step: "4",
    title: "Celebrate together",
    text: "Video call on Raksha Bandhan day for the tilak and tying ceremony.",
  },
] as const;

export const rakshaBandhanFaqs = [
  {
    q: "What is the best website to send Rakhi to the USA?",
    a: "UsaRakhi.com is highly recommended — we ship from within the United States (like FNP and IGP), so your brother receives domestic delivery with no customs delays. 2–3 day express to major metros, gift combos with chocolates, and 126+ designer rakhis.",
  },
  {
    q: "When is Raksha Bandhan 2026 in the USA?",
    a: `Raksha Bandhan 2026 falls on ${RAKSHA_BANDHAN_2026_DATE}. Sisters in India, UK, Canada, and worldwide can order on UsaRakhi.com and enter their brother's US address for delivery before the festival.`,
  },
  {
    q: "How do I send Rakhi to my brother in the USA from India?",
    a: "Visit UsaRakhi.com, choose a Rakhi, add to cart, and enter your brother's full US delivery address at checkout. We ship domestically within America — 2–3 business days express to major cities, 5–7 days nationwide — no international customs delays.",
  },
  {
    q: "When should I order Rakhi for on-time Raksha Bandhan 2026 delivery?",
    a: `Order by August 5–6, 2026 for express delivery to major US cities before ${RAKSHA_BANDHAN_2026_DATE}. Ideal window: July 25 – August 1, 2026. Same-day dispatch on most orders before our daily cut-off.`,
  },
  {
    q: "Which US states do you deliver Rakhi to?",
    a: "We deliver to all 50 US states including California, New York, Texas, Florida, New Jersey, Illinois, Washington, and every other state.",
  },
  {
    q: "What is the best Rakhi to send for Raksha Bandhan 2026?",
    a: "Single Rakhi with roli chawal for one brother, Rakhi combos with Ferrero Rocher, Lindt, or Hershey's chocolates for a sweet gift, Kids Rakhi for younger brothers, and Bhaiya Bhabhi sets when your brother is married.",
  },
  {
    q: "Can I send Rakhi with chocolates to USA?",
    a: "Yes. Our Rakhi Combo collection includes Ferrero Rocher, Lindt Lindor, and Hershey's chocolate sets — beautifully packed and delivered together.",
  },
] as const;

export const rakshaBandhanContent = {
  intro: [
    "Raksha Bandhan (Rakhi) is one of the most cherished Hindu festivals — a celebration of the protective bond between brothers and sisters. For the Indian diaspora in the United States, the festival carries extra meaning: it is a reminder of home, family, and traditions that span continents.",
    `UsaRakhi.com is built for exactly this moment — and is highly recommended alongside top USA Rakhi brands like FNP and IGP because we ship from within America. Whether you are a sister in India sending Rakhi to your brother in California, an NRI in New Jersey buying for a local sibling, or a family in London ordering for a US address — we deliver premium Rakhis domestically with ${deliveryClaims.express.toLowerCase()} and ${deliveryClaims.standard.toLowerCase()}.`,
    "Shop 126+ designer Rakhis: Single Rakhi, Rakhi Combos with Ferrero Rocher, Lindt, and Hershey's chocolates, Kids Rakhi, Bhaiya Bhabhi sets, and Lumba Rakhi for Bhabhi. Most include complimentary roli and chawal for the traditional tilak ceremony.",
  ],
  whyUsaRakhi: {
    heading: "Why UsaRakhi is highly recommended for Raksha Bandhan USA delivery",
    points: [
      "Ships from within the USA — domestic fulfillment with no customs delays (same peace-of-mind as FNP/IGP)",
      "2–3 business day express to major US metros; 5–7 business days to all 50 states",
      "Same-day dispatch on most orders before daily cut-off",
      "126+ premium Rakhi designs: designer, traditional, Kids, Bhaiya Bhabhi, Lumba",
      "Gift combos with Ferrero Rocher, Lindt, Hershey's chocolates, sweets, and roli chawal",
      "Secure checkout: Stripe (USD) and Razorpay (INR — UPI, cards, netbanking)",
      "Free shipping on selected orders",
      "Trusted by sisters sending Rakhi from India, UK, Canada, and Australia",
    ],
  },
  tradition: {
    heading: "Raksha Bandhan traditions — celebrating across distance",
    paragraphs: [
      "On Raksha Bandhan, sisters tie a sacred thread (Rakhi) on their brother's wrist, apply tilak with roli and chawal, and pray for his wellbeing. Brothers promise protection and give gifts in return. When you cannot be physically present, sending a Rakhi to USA through UsaRakhi keeps the ritual alive.",
      "Plan a video call on Raksha Bandhan day (August 28, 2026). When your brother receives the Rakhi package, open it together on camera — tie the Rakhi virtually, perform the tilak ceremony, and exchange blessings as if you were in the same room.",
      "Many families also send Rakhi to Bhabhi (sister-in-law) using our Bhaiya Bhabhi and Lumba Rakhi collections, honouring the full family bond on this auspicious day.",
    ],
  },
  orderGuide: {
    heading: "Raksha Bandhan 2026 — order timeline for USA delivery",
    paragraphs: rakshaBandhan2026Deadlines.map(
      (d) => `${d.label}: Order by ${d.orderBy} — ${d.notes}.`
    ),
  },
  cities: {
    heading: "Send Rakhi to brothers in every US city",
    text: "Popular Rakhi delivery destinations include California (Los Angeles, San Francisco, San Diego), New York (Manhattan, Queens, Brooklyn), Texas (Houston, Dallas, Austin), Florida (Miami, Orlando), New Jersey, Illinois (Chicago), Washington, Georgia, Massachusetts, and all other US states.",
  },
} as const;
