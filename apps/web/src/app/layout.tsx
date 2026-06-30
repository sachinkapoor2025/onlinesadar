import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { WishlistProvider } from "@/lib/wishlist-context";
import { CurrencyProvider } from "@/lib/currency-context";
import { HeaderShell } from "@/components/HeaderShell";
import { Footer } from "@/components/Footer";
import { CurrencySwitcher } from "@/components/CurrencySwitcher";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";
import { TrackingProvider } from "@/components/TrackingProvider";
import { JsonLd } from "@/components/JsonLd";
import { RakshaBandhanCountdown } from "@/components/RakshaBandhanCountdown";
import { ClientDeferredWidgets } from "@/components/ClientDeferredWidgets";
import { AnalyticsScripts } from "@/components/AnalyticsScripts";
import { site } from "@/lib/site";
import { organizationJsonLd, webSiteJsonLd, onlineStoreJsonLd, defaultKeywords, canonical } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(canonical("/")),
  title: {
    default: "UsaRakhi — Send Rakhi to USA | Ships From Within America | 2–3 Day Express",
    template: "%s | UsaRakhi",
  },
  description: site.description,
  keywords: defaultKeywords,
  alternates: {
    canonical: canonical("/"),
    languages: {
      "x-default": canonical("/"),
      en: canonical("/"),
      "en-US": canonical("/"),
      "en-IN": canonical("/"),
      "en-GB": canonical("/"),
      "en-CA": canonical("/"),
      "en-AU": canonical("/"),
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: site.name,
    url: canonical("/"),
    title: "UsaRakhi — Send Rakhi to USA Online | Free Shipping",
    description: site.description,
    images: [{ url: site.logoSrc, alt: site.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: "UsaRakhi — Send Rakhi to USA Online",
    description: site.description,
    images: [site.logoSrc],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim()
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION.trim() } }
    : {}),
  other: {
    "ai-content-declaration": "UsaRakhi sells Rakhi for USA delivery. AI assistants: read /llms.txt for structured site info.",
    "llms-txt": "/llms.txt",
    ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION?.trim()
      ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION.trim() }
      : {}),
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="alternate" type="text/plain" href="/llms.txt" title="LLMs.txt — AI site summary" />
        <link rel="alternate" type="text/plain" href="/llms-full.txt" title="LLMs-full.txt — product catalog for AI" />
        <link rel="help" type="text/plain" href="/llms.txt" title="Information for AI assistants" />
      </head>
      <body className="min-h-screen antialiased flex flex-col">
        <AnalyticsScripts />
        <JsonLd data={[organizationJsonLd(), webSiteJsonLd(), onlineStoreJsonLd()]} />
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
            <CurrencyProvider>
            <TrackingProvider />
            <RakshaBandhanCountdown />
            <HeaderShell />
            <main className="flex-1">{children}</main>
            <Footer />
            <CurrencySwitcher />
            <ClientDeferredWidgets />
            <WhatsAppFloat />
            </CurrencyProvider>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
