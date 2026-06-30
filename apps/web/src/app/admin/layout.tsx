"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminGuard } from "@/components/AdminGuard";

const links = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/welcome-leads", label: "Welcome Leads" },
  { href: "/admin/visitors", label: "Visitors" },
  { href: "/admin/carts", label: "Abandoned Carts" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/sellers", label: "Sellers" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/payments", label: "Payments" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-50">
        <div className="border-b bg-white">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/admin" className="font-bold text-primary">
                UsaRakhi Admin
              </Link>
              <nav className="flex gap-4 text-sm">
                {links.map((l) => {
                  const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      className={active ? "text-accent font-medium" : "text-slate-600 hover:text-accent"}
                    >
                      {l.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <Link href="/" className="text-sm text-slate-500 hover:text-accent">
              ← Storefront
            </Link>
          </div>
        </div>
        {children}
      </div>
    </AdminGuard>
  );
}
