"use client";

import Link from "next/link";
import AdminHeader from "@/components/AdminHeader";
import RoleGuard from "@/components/RoleGuard";
import { BookOpen, QrCode, Users, CreditCard, BarChart3 } from "lucide-react";

const links = [
  { title: "Restaurant Admins & Staff", description: "Invite, approve, and manage staff accounts.", href: "/admin/staff", icon: Users },
  { title: "Menu Catalog", description: "Manage menu items and categories.", href: "/admin/menu", icon: BookOpen },
  { title: "Table QR Codes", description: "View and manage restaurant tables.", href: "/admin/tables", icon: QrCode },
  { title: "Payment Accounts", description: "Manage customer payment destinations.", href: "/admin/payment-accounts", icon: CreditCard },
  { title: "Analytics", description: "Review restaurant performance.", href: "/admin/analytics", icon: BarChart3 },
];

export default function SuperAdminDashboardPage() {
  return (
    <RoleGuard requireSuperAdmin pageTitle="Super Admin Dashboard">
      <div className="min-h-screen app-bg-dark pb-12 text-stone-100 lg:pl-64">
        <AdminHeader title="Super Admin Dashboard" subtitle="Restaurant master control" />
        <main className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
          <section className="grid gap-3 sm:grid-cols-2">
            {links.map(({ title, description, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-start gap-4 rounded-2xl border border-[#2B1810] bg-[#3A241A] p-5 transition-colors hover:bg-[#49301F]"
              >
                <span className="rounded-xl border border-amber-800/50 bg-amber-950/60 p-2.5 text-amber-300">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-serif text-base font-bold text-white">{title}</span>
                  <span className="mt-1 block text-xs text-stone-400">{description}</span>
                </span>
              </Link>
            ))}
          </section>
        </main>
      </div>
    </RoleGuard>
  );
}
