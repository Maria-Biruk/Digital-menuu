"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Lock, ShieldAlert, ArrowLeft, LogOut, ShieldCheck, Home } from "lucide-react";
import { StaffRole } from "@/lib/types";
import { getRoleInfo, canAccessRoute } from "@/lib/permissions";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: StaffRole[];
  requireSuperAdmin?: boolean;
  pageTitle?: string;
}

export default function RoleGuard({
  children,
  allowedRoles,
  requireSuperAdmin = false,
  pageTitle = "This Section",
}: RoleGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("staff_role");
    setRole(saved);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen app-bg-dark text-stone-100 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in at all
  if (!role) {
    return (
      <div className="min-h-screen app-bg-dark text-stone-100 flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full p-8 rounded-3xl bg-[#3A241A] border border-[#2B1810] shadow-2xl text-center space-y-5 animate-scale-up">
          <div className="w-16 h-16 rounded-2xl bg-amber-950/60 text-amber-400 flex items-center justify-center mx-auto border border-amber-800/50 shadow-inner">
            <Lock className="w-8 h-8 text-amber-400" />
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-800">
              Authentication Required
            </span>
            <h2 className="font-serif font-bold text-2xl text-white">
              Staff Portal Login
            </h2>
            <p className="text-xs text-stone-400 leading-relaxed">
              You must sign in with a valid staff role to access {pageTitle}.
            </p>
          </div>
          <Link
            href="/admin/login"
            className="w-full py-3.5 rounded-xl bg-[#2B1810] hover:bg-[#3D2415] text-white font-bold text-xs uppercase tracking-wider transition-all block cursor-pointer border border-[#3D2415] shadow-lg"
          >
            Go to Staff Login
          </Link>
        </div>
      </div>
    );
  }

  const roleInfo = getRoleInfo(role);

  // If requireSuperAdmin is set
  if (requireSuperAdmin && roleInfo.role !== "super_admin" && roleInfo.role !== "owner") {
    return (
      <div className="min-h-screen app-bg-dark text-stone-100 flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-lg w-full p-8 rounded-3xl bg-[#3A241A] border border-amber-800/60 shadow-2xl text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-950/80 text-amber-400 flex items-center justify-center mx-auto border border-amber-700/60 shadow-inner">
            <ShieldCheck className="w-8 h-8 text-amber-400" />
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-700">
              Super Admin Protected
            </span>
            <h2 className="font-serif font-bold text-2xl text-white">
              Super Admin Authorization Required
            </h2>
            <p className="text-xs text-stone-300 leading-relaxed">
              {pageTitle} contains sensitive restaurant financial or configuration settings and is strictly reserved for the <strong className="text-amber-400">Super Admin</strong>.
            </p>
            <div className="mt-3 p-3 rounded-xl bg-[#38210F] border border-[#2B1810] text-left text-xs space-y-1">
              <p className="text-stone-400 font-medium">
                Current Role: <span className="text-white font-bold">{roleInfo.label}</span>
              </p>
              <p className="text-[11px] text-stone-500">
                Regular Admins have operational access (Menu, Tables) but cannot modify core payment bank accounts or financial analytics.
              </p>
            </div>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => router.push(roleInfo.homeRoute)}
              className="w-full py-3.5 rounded-xl bg-[#2B1810] hover:bg-[#3D2415] text-amber-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border border-[#3D2415]"
            >
              Return to Permitted Console ({roleInfo.label})
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("staff_role");
                router.push("/admin/login");
              }}
              className="w-full py-2.5 rounded-xl bg-transparent hover:bg-white/5 text-stone-400 hover:text-white font-semibold text-xs transition-colors cursor-pointer border border-stone-800"
            >
              Log in as Super Admin
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If specific allowedRoles provided
  const isAllowed = allowedRoles
    ? roleInfo.role === "super_admin" || roleInfo.role === "owner" || allowedRoles.includes(roleInfo.role)
    : canAccessRoute(role, pathname);

  if (!isAllowed) {
    return (
      <div className="min-h-screen app-bg-dark text-stone-100 flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full p-8 rounded-3xl bg-[#3A241A] border border-rose-900/60 shadow-2xl text-center space-y-5 animate-scale-up">
          <div className="w-16 h-16 rounded-2xl bg-rose-950/70 text-rose-400 flex items-center justify-center mx-auto border border-rose-800/60 shadow-inner">
            <ShieldAlert className="w-8 h-8 text-rose-400" />
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
              Access Restricted · Station Isolation
            </span>
            <h2 className="font-serif font-bold text-2xl text-white">
              Station Permission Denied
            </h2>
            <p className="text-xs text-stone-400 leading-relaxed">
              You are signed in as <span className="text-white font-bold">{roleInfo.label}</span>. Staff members cannot access unauthorized roles or admin consoles.
            </p>
            <div className="p-3 rounded-xl bg-[#38210F] border border-[#2B1810] text-left text-xs">
              <p className="text-stone-400">
                <strong className="text-stone-300">Station Policy:</strong> {roleInfo.description}
              </p>
            </div>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => router.push(roleInfo.homeRoute)}
              className="w-full py-3.5 rounded-xl bg-[#2B1810] hover:bg-[#3D2415] text-amber-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border border-[#3D2415] shadow-lg flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              Return to My Console ({roleInfo.label})
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("staff_role");
                router.push("/admin/login");
              }}
              className="w-full py-2.5 rounded-xl bg-transparent hover:bg-white/5 text-stone-400 hover:text-white font-semibold text-xs transition-colors cursor-pointer border border-stone-800 flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Switch Account / Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
