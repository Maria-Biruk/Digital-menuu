"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  UtensilsCrossed,
  BookOpen,
  CreditCard,
  QrCode,
  BarChart3,
  LogOut,
  ExternalLink,
  ShieldCheck,
  Crown,
  Lock,
  ChevronDown
} from "lucide-react";
import { getRoleInfo } from "@/lib/permissions";

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
}

export default function AdminHeader({
  title,
  subtitle = "Management Dashboard"
}: AdminHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [showStationMenu, setShowStationMenu] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedRole = localStorage.getItem("staff_role");
      setRole(savedRole);
    }
  }, []);

  const roleInfo = getRoleInfo(role);
  const isSuperAdmin = roleInfo.role === "super_admin" || roleInfo.role === "owner";

  const adminNav = [
    { label: "Menu Catalog", href: "/admin/menu", icon: BookOpen, superOnly: false },
    { label: "Payment Accounts", href: "/admin/payment-accounts", icon: CreditCard, superOnly: true },
    { label: "Table QR Codes", href: "/admin/tables", icon: QrCode, superOnly: false },
    { label: "Analytics", href: "/admin/analytics", icon: BarChart3, superOnly: true },
  ];

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("staff_role");
    }
    router.push("/admin/login");
  };

  return (
    <header className="sticky top-0 z-40 bg-[#1C1109]/95 backdrop-blur-md border-b border-[#2B1810] shadow-md px-4 sm:px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2B1810] border border-[#3D2415] text-amber-400 flex items-center justify-center shadow-inner shrink-0">
            {isSuperAdmin ? (
              <Crown className="w-5 h-5 text-amber-400" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-blue-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif font-bold text-lg md:text-xl text-white tracking-wide">
                {title}
              </h1>
              <span
                className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                  isSuperAdmin
                    ? "bg-amber-950/90 text-amber-300 border-amber-600/70"
                    : "bg-blue-950/90 text-blue-300 border-blue-600/70"
                }`}
              >
                {isSuperAdmin ? (
                  <>
                    <Crown className="w-3 h-3 text-amber-400" />
                    <span>Super Admin</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3 h-3 text-blue-400" />
                    <span>Admin (Limited)</span>
                  </>
                )}
              </span>
            </div>
            <p className="text-[11px] text-stone-400 font-medium">
              Skill Coffee • {subtitle}
            </p>
          </div>
        </div>

        {/* Center: Admin Sub Navigation */}
        <nav className="flex items-center overflow-x-auto gap-1 bg-[#120B07] p-1 rounded-xl border border-[#2B1810] hide-scrollbar">
          {adminNav.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            const isLocked = link.superOnly && !isSuperAdmin;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                  isActive
                    ? "bg-[#2B1810] text-amber-300 font-bold shadow-sm border border-[#3D2415]"
                    : isLocked
                    ? "text-stone-500 hover:text-stone-300 hover:bg-[#1C1109]"
                    : "text-stone-400 hover:text-white hover:bg-[#1C1109]"
                }`}
                title={isLocked ? "Super Admin Only" : undefined}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{link.label}</span>
                {isLocked && <Lock className="w-2.5 h-2.5 text-amber-500/80" />}
              </Link>
            );
          })}
        </nav>

        {/* Right: Quick jumps */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Station Selector for Super Admin or Admin */}
          <div className="relative">
            <button
              onClick={() => setShowStationMenu(!showStationMenu)}
              className="text-xs text-stone-300 hover:text-white bg-[#2B1810] hover:bg-[#3D2415] border border-[#3D2415] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Staff Consoles</span>
              <ChevronDown className="w-3 h-3 text-stone-400" />
            </button>

            {showStationMenu && (
              <div
                className="absolute right-0 mt-2 w-48 rounded-xl bg-[#1C1109] border border-[#2B1810] shadow-2xl p-1.5 z-50 text-xs space-y-0.5 animate-fadeIn"
                onMouseLeave={() => setShowStationMenu(false)}
              >
                <Link
                  href="/staff/kitchen"
                  onClick={() => setShowStationMenu(false)}
                  className="block px-3 py-2 rounded-lg text-stone-300 hover:text-white hover:bg-[#2B1810] transition-colors"
                >
                  🍳 Kitchen Terminal
                </Link>
                <Link
                  href="/staff/bar"
                  onClick={() => setShowStationMenu(false)}
                  className="block px-3 py-2 rounded-lg text-stone-300 hover:text-white hover:bg-[#2B1810] transition-colors"
                >
                  ☕ Bar & Barista Terminal
                </Link>
                <Link
                  href="/staff/floor"
                  onClick={() => setShowStationMenu(false)}
                  className="block px-3 py-2 rounded-lg text-stone-300 hover:text-white hover:bg-[#2B1810] transition-colors"
                >
                  🛎️ Floor Waiter Console
                </Link>
                {isSuperAdmin && (
                  <Link
                    href="/staff/payments"
                    onClick={() => setShowStationMenu(false)}
                    className="block px-3 py-2 rounded-lg text-amber-300 hover:text-white hover:bg-[#2B1810] transition-colors"
                  >
                    💳 Cashier & POS Terminal
                  </Link>
                )}
              </div>
            )}
          </div>

          <Link
            href="/meskel-house/order"
            target="_blank"
            className="text-xs text-amber-300/80 hover:text-amber-200 border border-amber-900/40 bg-amber-950/30 px-3 py-1.5 rounded-lg flex items-center gap-1"
          >
            <span>Diner View</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-xs text-rose-300/80 hover:text-rose-200 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/40 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
