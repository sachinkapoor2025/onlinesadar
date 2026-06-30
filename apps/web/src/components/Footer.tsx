import Link from "next/link";
import { site, navItems, cityLinks, whatsappChatUrl } from "@/lib/site";
import { PaymentMethodIcons } from "@/components/PaymentMethodIcons";
import { SiteLogoLink } from "@/components/SiteLogo";

const FACEBOOK_URL = "https://www.facebook.com/usarakhi/";
const INSTAGRAM_URL = "https://www.instagram.com/usarakhi/";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-primary text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-10 sm:py-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8 sm:gap-x-8 sm:gap-y-10 text-sm">
          {/* Brand + contact — full width on mobile, one column on desktop */}
          <div className="col-span-2 lg:col-span-1">
            <SiteLogoLink size="desktop" className="mb-5" />
            <p className="text-white/80 leading-relaxed mb-4 max-w-xs">
              Send Rakhi to USA from India, UK, Canada &amp; worldwide. Premium Rakhis delivered to all 50 US
              states.
            </p>
            <div className="space-y-2 text-white/90">
              <p>
                <span className="text-white/60 text-xs uppercase tracking-wide block mb-0.5">Email</span>
                <a href={`mailto:${site.supportEmail}`} className="font-medium hover:text-white hover:underline">
                  {site.supportEmail}
                </a>
              </p>
              <p>
                <span className="text-white/60 text-xs uppercase tracking-wide block mb-0.5">WhatsApp</span>
                <a
                  href={whatsappChatUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:underline"
                >
                  {site.whatsappDisplay}
                </a>
              </p>
            </div>
            <div className="mt-5">
              <p className="text-xs uppercase tracking-wide text-white/60 mb-2">Follow us</p>
              <div className="flex items-center gap-3">
                <a
                  href={FACEBOOK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="UsaRakhi on Facebook"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1877F2] hover:scale-105 transition-transform"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#fff" aria-hidden>
                    <path d="M13.397 20.997v-8.196h2.765l.411-3.209h-3.176V7.548c0-.926.258-1.56 1.587-1.56h1.684V3.127A22.336 22.336 0 0013.843 3c-2.386 0-4.027 1.455-4.027 4.061v2.431H7.574v3.209h2.242v8.196h3.581z" />
                  </svg>
                </a>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="UsaRakhi on Instagram"
                  className="flex h-10 w-10 items-center justify-center rounded-[22%] hover:scale-105 transition-transform"
                  style={{
                    background:
                      "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)",
                  }}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" stroke="#fff" strokeWidth="2" />
                    <circle cx="12" cy="12" r="4.2" stroke="#fff" strokeWidth="2" />
                    <circle cx="17.4" cy="6.6" r="1.2" fill="#fff" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Shop */}
          <div className="min-w-0">
            <p className="font-semibold text-white mb-3 sm:mb-4">Shop Rakhi</p>
            <ul className="space-y-2 text-white/80">
              {navItems
                .filter((n) => "category" in n)
                .map((n) => (
                  <li key={n.href}>
                    <Link href={n.href} className="hover:text-white hover:underline">
                      {n.label}
                    </Link>
                  </li>
                ))}
              <li>
                <Link href="/products" className="hover:text-white hover:underline">
                  All Products
                </Link>
              </li>
            </ul>
          </div>

          {/* Help */}
          <div className="min-w-0">
            <p className="font-semibold text-white mb-3 sm:mb-4">Help &amp; Info</p>
            <ul className="space-y-2 text-white/80">
              <li><Link href="/raksha-bandhan" className="hover:text-white hover:underline">Raksha Bandhan 2026</Link></li>
              <li><Link href="/blog" className="hover:text-white hover:underline">Blog &amp; Guides</Link></li>
              <li><Link href="/shipping" className="hover:text-white hover:underline">Shipping &amp; Delivery</Link></li>
              <li><Link href="/faq" className="hover:text-white hover:underline">FAQ</Link></li>
              <li><Link href="/reviews" className="hover:text-white hover:underline">Customer Reviews</Link></li>
              <li><Link href="/about" className="hover:text-white hover:underline">About Us</Link></li>
              <li><Link href="/returns" className="hover:text-white hover:underline">Returns &amp; Guarantee</Link></li>
              <li><Link href="/contact" className="hover:text-white hover:underline">Contact Us</Link></li>
            </ul>
          </div>

          {/* Cities — full width on mobile (2-col city list), one col on desktop */}
          <div className="col-span-2 lg:col-span-1 min-w-0">
            <p className="font-semibold text-white mb-3 sm:mb-4">Deliver to</p>
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-x-4 gap-y-2 text-white/80">
              {cityLinks.map((c) => (
                <li key={c.slug}>
                  <Link href={`/cities/${c.slug}`} className="hover:text-white hover:underline">
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Payments row */}
        <div className="mt-10 pt-8 border-t border-white/15 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/60 mb-2">Accepted payments</p>
            <PaymentMethodIcons />
          </div>
          <p className="text-xs text-white/50 max-w-md">
            Secure checkout with encrypted payment processing. Prices shown in USD or INR at checkout.
          </p>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10 bg-primary/95">
        <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-white/50">
          <p>© {new Date().getFullYear()} {site.name}.com. All rights reserved. Celebrating sibling love across every mile.</p>
          <p className="flex flex-wrap gap-x-3 gap-y-1">
            <Link href="/terms" className="hover:text-white underline underline-offset-2">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-white underline underline-offset-2">
              Privacy
            </Link>
            <Link href="/press" className="hover:text-white underline underline-offset-2">
              Press
            </Link>
            <Link href="/llms.txt" className="hover:text-white underline underline-offset-2">
              LLMs.txt
            </Link>
            <Link href="/humans.txt" className="hover:text-white underline underline-offset-2">
              Humans.txt
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
