"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SellerGuard } from "@/components/SellerGuard";
import { site } from "@/lib/site";

const nav = [
  { href: "/seller/dashboard", label: "Dashboard" },
  { href: "/seller/products", label: "Products" },
  { href: "/seller/products/new", label: "Add product" },
  { href: "/seller/orders", label: "Orders" },
  { href: "/seller/rfqs", label: "RFQs" },
  { href: "/seller/verification", label: "Verification" },
  { href: "/seller/subscription", label: "Subscription" },
  { href: "/seller/analytics", label: "Analytics" },
];

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = pathname === "/seller" || pathname === "/seller/register";

  if (isPublic) {
    return <>{children}</>;
  }

  return (
    <SellerGuard>
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <Link href="/seller/dashboard" className="font-bold text-primary text-lg">
                {site.name} Seller
              </Link>
              <p className="text-xs text-slate-500">Wholesale seller portal</p>
            </div>
            <nav className="flex flex-wrap gap-2">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm px-3 py-1.5 rounded-lg ${
                    pathname === item.href || pathname.startsWith(item.href + "/")
                      ? "bg-primary text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <Link href="/" className="text-sm px-3 py-1.5 text-slate-500 hover:text-primary">
                Storefront
              </Link>
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
      </div>
    </SellerGuard>
  );
}
