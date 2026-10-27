"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  User,
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  Wine,
  UserCheck,
  CreditCard,
  Crown,
  ChefHat,
} from "lucide-react";
import { signInStaff, fetchStaffRole } from "@/lib/supabase";

// Verified staff account used for one-click dev access (also used by backend/scripts/smoke.mjs).
const DEMO_SESSION = { email: "mayabrook1924@gmail.com", password: "mayanan0909" };

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("demo123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const roles = [
    { name: "Super Admin", username: "superadmin", roleKey: "super_admin", target: "/admin/menu", icon: Crown, color: "text-amber-400", desc: "Master Control" },
    { name: "Admin", username: "admin", roleKey: "admin", target: "/admin/menu", icon: ShieldCheck, color: "text-blue-400", desc: "Limited Ops" },
    { name: "Kitchen", username: "chef", roleKey: "kitchen", target: "/staff/kitchen", icon: ChefHat, color: "text-emerald-400", desc: "Kitchen Only" },
    { name: "Bartender", username: "bar", roleKey: "bar", target: "/staff/bar", icon: Wine, color: "text-purple-400", desc: "Bar Only" },
    { name: "Waiter", username: "waiter", roleKey: "waiter", target: "/staff/floor", icon: UserCheck, color: "text-cyan-400", desc: "Floor Only" },
    { name: "Cashier", username: "cashier", roleKey: "cashier", target: "/staff/payments", icon: CreditCard, color: "text-amber-300", desc: "Cashier Only" },
  ];

  // Establish a real Supabase session so station consoles can read live data (RLS),
  // then apply the chosen role in localStorage purely for UI routing/preview.
  const quickAccess = async (roleKey: string, target: string) => {
    setError("");
    setLoading(true);
    try {
      await signInStaff(DEMO_SESSION.email, DEMO_SESSION.password);
      localStorage.setItem("staff_role", roleKey);
      router.push(target);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // If a real email was typed, do a genuine Supabase login + DB role lookup.
      if (username.includes("@")) {
        await signInStaff(username.trim(), password);
        const role = await fetchStaffRole();
        if (!role) {
          setError("Signed in, but this account has no active staff role in staff_users.");
          setLoading(false);
          return;
        }
        localStorage.setItem("staff_role", role);
        const target =
          role === "kitchen" ? "/staff/kitchen"
            : role === "bar" || role === "bartender" ? "/staff/bar"
            : role === "waiter" ? "/staff/floor"
            : role === "cashier" ? "/staff/payments"
            : "/admin/menu";
        router.push(target);
        return;
      }

      // Otherwise: demo username → map to a role and open with the real session.
      const lower = username.toLowerCase();
      let roleKey = "admin";
      let targetUrl = "/admin/menu";
      if (lower.includes("super") || lower.includes("owner")) {
        roleKey = "super_admin";
      } else if (lower.includes("bar")) {
        roleKey = "bar";
        targetUrl = "/staff/bar";
      } else if (lower.includes("kitchen") || lower.includes("chef")) {
        roleKey = "kitchen";
        targetUrl = "/staff/kitchen";
      } else if (lower.includes("waiter") || lower.includes("floor")) {
        roleKey = "waiter";
        targetUrl = "/staff/floor";
      } else if (lower.includes("cashier") || lower.includes("pos")) {
        roleKey = "cashier";
        targetUrl = "/staff/payments";
      }
      await quickAccess(roleKey, targetUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setLoading(false);
    }
  };

  const handleRoleClick = (role: (typeof roles)[0]) => {
    setUsername(role.username);
    setPassword("demo123");
    void quickAccess(role.roleKey, role.target);
  };

  return (
    <div className="min-h-screen app-bg-dark text-stone-100 flex flex-col justify-center items-center px-4 relative overflow-hidden font-sans">
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#2B1810] opacity-40 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-600 opacity-15 blur-[120px] pointer-events-none" />

      <Link
        href="/meskel-house/order"
        className="absolute top-6 left-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-400 hover:text-white transition-colors py-2 px-4 rounded-full border border-[#2B1810] bg-[#3A241A]/80 backdrop-blur"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Customer Menu
      </Link>

      <div className="w-full max-w-md my-8">
        {/* Logo and Brand */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FAF7F2] flex items-center justify-center shadow-xl shadow-black/40 mb-3 border border-[#3D2415] overflow-hidden p-1.5">
            <img
              src="/skill-coffee-icon.png"
              alt="Skill Coffee"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="font-serif font-bold text-3xl tracking-wide text-white">
            Staff Portal
          </h1>
          <p className="font-sans text-xs text-stone-400 mt-1 font-medium">
            Skill Coffee Management &amp; Service Systems
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-3xl bg-[#3A241A]/90 border border-[#2B1810] backdrop-blur-xl p-8 shadow-2xl relative">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1.5 flex items-center gap-1.5">
                <User className="w-3 h-3 text-amber-400" /> Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter staff username"
                className="w-full px-4 py-3 rounded-xl border border-[#2B1810] bg-[#38210F] text-sm text-white focus:outline-none focus:border-amber-500 placeholder:text-stone-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-amber-400" /> Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-[#2B1810] bg-[#38210F] text-sm text-white focus:outline-none focus:border-amber-500 placeholder:text-stone-600 transition-colors"
              />
              <p className="text-[10px] text-stone-500 mt-1">
                Demo mode: any username/password opens a live staff session. Type a real email for a true login.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2B1810] hover:bg-[#3D2415] active:bg-[#2A180B] text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-md mt-2 cursor-pointer border border-[#3D2415] flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  Accessing Dashboard...
                </>
              ) : (
                "Access Dashboard"
              )}
            </button>
          </form>

          {/* Role Buttons Quick Launch */}
          <div className="mt-8 pt-6 border-t border-[#2B1810]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 text-center mb-3">
              Quick Sandbox Access
            </p>
            <div className="grid grid-cols-3 gap-2">
              {roles.map((r) => {
                const Icon = r.icon;
                return (
                  <button
                    key={r.name}
                    type="button"
                    disabled={loading}
                    onClick={() => handleRoleClick(r)}
                    className="p-2.5 rounded-xl bg-[#38210F] hover:bg-[#2B1810] border border-[#2B1810] hover:border-amber-500/50 flex flex-col items-center gap-1 transition-all text-center group cursor-pointer disabled:opacity-60"
                  >
                    <Icon className={`w-4 h-4 ${r.color} group-hover:scale-110 transition-transform`} />
                    <span className="text-[11px] font-bold text-stone-200 group-hover:text-white leading-tight">
                      {r.name}
                    </span>
                    <span className="text-[9px] text-stone-500 font-medium">
                      {r.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
