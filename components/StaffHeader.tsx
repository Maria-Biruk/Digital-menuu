"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  UtensilsCrossed,
  Wine,
  UserCheck,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { getRoleInfo } from "@/lib/permissions";
import { signOutStaff } from "@/lib/supabase";

interface StaffHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: React.ReactNode;
}

export default function StaffHeader({
  title,
  subtitle = "Live Console",
  badge,
  icon
}: StaffHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedRole = localStorage.getItem("staff_role");
      setRole(savedRole);
    }
  }, []);

  const allNavLinks = [
    { label: "Kitchen", href: "/staff/kitchen", icon: UtensilsCrossed },
    { label: "Bar", href: "/staff/bar", icon: Wine },
    { label: "Floor", href: "/staff/floor", icon: UserCheck },
    { label: "Cashier", href: "/staff/payments", icon: CreditCard },
    { label: "Admin", href: "/admin/menu", icon: LayoutDashboard },
  ];

  const roleInfo = getRoleInfo(role);
  const isSuperAdmin = roleInfo.role === "super_admin" || roleInfo.role === "owner";
  const isAdmin = roleInfo.role === "admin";

  const isKitchenStation = pathname.startsWith("/staff/kitchen");
  const isBarStation = pathname.startsWith("/staff/bar");
  const isFloorStation = pathname.startsWith("/staff/floor");
  const isPaymentsStation = pathname.startsWith("/staff/payments");

  // Strict Station Isolation:
  // Staff (kitchen, bar, waiter, cashier) CANNOT see Admin or unauthorized stations!
  let visibleNavLinks: typeof allNavLinks = [];

  if (isSuperAdmin) {
    // Super Admin has master access to all stations and Admin
    visibleNavLinks = allNavLinks;
  } else if (isAdmin) {
    // Admin has operational monitoring access
    visibleNavLinks = [
      { label: "Kitchen", href: "/staff/kitchen", icon: UtensilsCrossed },
      { label: "Bar", href: "/staff/bar", icon: Wine },
      { label: "Floor", href: "/staff/floor", icon: UserCheck },
      { label: "Admin", href: "/admin/menu", icon: LayoutDashboard },
    ];
  } else if (roleInfo.role === "kitchen") {
    // Kitchen staff can ONLY see Kitchen console
    visibleNavLinks = [{ label: "Kitchen", href: "/staff/kitchen", icon: UtensilsCrossed }];
  } else if (roleInfo.role === "bar" || roleInfo.role === "bartender") {
    // Bar staff can ONLY see Bar console
    visibleNavLinks = [{ label: "Bar", href: "/staff/bar", icon: Wine }];
  } else if (roleInfo.role === "waiter") {
    // Waiter can ONLY see Floor console
    visibleNavLinks = [{ label: "Floor", href: "/staff/floor", icon: UserCheck }];
  } else if (roleInfo.role === "cashier") {
    // Cashier can ONLY see Cashier console
    visibleNavLinks = [{ label: "Cashier", href: "/staff/payments", icon: CreditCard }];
  } else {
    // Fallback station view based on current path
    if (isKitchenStation) visibleNavLinks = [{ label: "Kitchen", href: "/staff/kitchen", icon: UtensilsCrossed }];
    else if (isBarStation) visibleNavLinks = [{ label: "Bar", href: "/staff/bar", icon: Wine }];
    else if (isFloorStation) visibleNavLinks = [{ label: "Floor", href: "/staff/floor", icon: UserCheck }];
    else if (isPaymentsStation) visibleNavLinks = [{ label: "Cashier", href: "/staff/payments", icon: CreditCard }];
  }

  const handleLogout = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("staff_role");
    }
    await signOutStaff();
    router.push("/admin/login");
  };

  return (
    <header className="sticky top-0 z-40 bg-[#3A241A]/95 backdrop-blur-md border-b border-[#2B1810] shadow-md px-4 sm:px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Station Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2B1810] border border-[#3D2415] text-amber-400 flex items-center justify-center shadow-inner shrink-0">
            {icon || <UtensilsCrossed className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif font-bold text-lg md:text-xl text-white tracking-wide">
                {title}
              </h1>
              {badge && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                  {badge}
                </span>
              )}
            </div>
            <p className="text-[11px] text-stone-400 font-medium">
              Skill Coffee • {subtitle}
            </p>
          </div>
        </div>

        {/* Center: Switch Station Navigation with Station Privacy Enforcement */}
        <div className="flex items-center gap-2">
          {/* Station Privacy Badges */}
          {roleInfo.role === "kitchen" && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-[11px] font-bold shadow-inner">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Kitchen Private Terminal</span>
            </div>
          )}

          {(roleInfo.role === "bar" || roleInfo.role === "bartender") && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-950/80 border border-purple-700/60 text-purple-300 text-[11px] font-bold shadow-inner">
              <Lock className="w-3.5 h-3.5 text-purple-400" />
              <span>Bar Private Terminal</span>
            </div>
          )}

          {roleInfo.role === "waiter" && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 text-[11px] font-bold shadow-inner">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Floor Waiter Terminal</span>
            </div>
          )}

          {roleInfo.role === "cashier" && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-950/80 border border-amber-700/60 text-amber-300 text-[11px] font-bold shadow-inner">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>POS Cashier Terminal</span>
            </div>
          )}

          {isSuperAdmin && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-950/90 border border-amber-700/80 text-amber-300 text-[11px] font-bold shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Super Admin Master Access</span>
            </div>
          )}

          {isAdmin && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-950/80 border border-blue-700/70 text-blue-300 text-[11px] font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Admin Operations Mode</span>
            </div>
          )}

          <nav className="flex items-center overflow-x-auto gap-1 bg-[#38210F] p-1 rounded-xl border border-[#2B1810] hide-scrollbar">
            {visibleNavLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                    isActive
                      ? "bg-[#2B1810] text-amber-300 font-bold shadow-sm border border-[#3D2415]"
                      : "text-stone-400 hover:text-white hover:bg-[#3A241A]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Quick actions */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/meskel-house/order"
            target="_blank"
            className="text-xs bg-[#2B1810] hover:bg-[#3D2415] text-stone-300 hover:text-white px-3 py-1.5 rounded-lg border border-[#3D2415] transition-colors"
          >
            Customer View ↗
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-rose-300/80 hover:text-rose-200 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/40 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            title="Sign out of staff session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
