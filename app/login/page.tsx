"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "../utils/store";
import { Utensils, Lock, User, ArrowLeft, ShieldAlert } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    setTimeout(() => {
      const users = db.getUsers();
      const matchedUser = users.find(
        (u) => u.username.toLowerCase() === username.toLowerCase() && u.isActive
      );

      if (!matchedUser) {
        setError("Invalid credentials or deactivated account.");
        setLoading(false);
        return;
      }

      // In this demo, any password works for matching users to ease testing
      // Store current user session in localStorage
      localStorage.setItem("meskel_active_user", JSON.stringify(matchedUser));

      // Redirect based on role
      if (matchedUser.role === "admin") {
        router.push("/admin");
      } else if (matchedUser.role === "kitchen") {
        router.push("/kitchen");
      } else if (matchedUser.role === "waiter") {
        router.push("/waiter");
      }
    }, 800);
  };

  const handleQuickLogin = (roleUser: string) => {
    setUsername(roleUser);
    setPassword("password123");
  };

  return (
    <div className="min-h-screen bg-[#070b19] text-slate-100 flex flex-col justify-center items-center px-4 relative overflow-hidden font-sans">
      
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#132d66] opacity-30 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500 opacity-10 blur-[120px]" />

      <button
        onClick={() => router.push("/")}
        className="absolute top-6 left-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white transition-colors py-2 px-4 rounded-full border border-slate-800 bg-slate-900/30 backdrop-blur"
      >
        <ArrowLeft size={14} /> Back to menu
      </button>

      <div className="w-full max-w-md">
        
        {/* Logo and Brand */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#132d66] to-[#1f4287] flex items-center justify-center text-white shadow-xl shadow-[#132d66]/20 mb-4 border border-white/10 animate-bounce">
            <Utensils size={28} />
          </div>
          <h1 className="font-serif font-bold text-3xl tracking-wide text-white">
            Staff Portal
          </h1>
          <p className="font-sans text-xs text-slate-400 mt-2 font-medium">
            Meskel House Dining & Kitchen Systems
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-[2rem] bg-[#0c1428]/60 border border-slate-800/80 backdrop-blur-xl p-8 shadow-2xl relative">
          
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-2.5">
              <ShieldAlert size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Username field */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <User size={12} /> Username
              </label>
              <input
                type="text"
                required
                placeholder="Enter staff username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-900/40 text-sm text-white focus:outline-none focus:border-[#132d66] placeholder:text-slate-600 transition-colors"
              />
            </div>

            {/* Password field */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Lock size={12} /> Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-900/40 text-sm text-white focus:outline-none focus:border-[#132d66] placeholder:text-slate-600 transition-colors"
              />
            </div>

            {/* Login button */}
            {loading ? (
              <button
                type="button"
                disabled
                className="w-full bg-[#132d66]/50 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm cursor-not-allowed mt-2"
              >
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Authenticating...
              </button>
            ) : (
              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-400 active:scale-95 text-neutral-950 font-bold py-3.5 rounded-xl text-sm transition-all shadow-md mt-2 cursor-pointer"
              >
                Access Dashboard
              </button>
            )}
          </form>

          {/* Quick Access Accounts for Testing */}
          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center mb-3">
              Quick Sandbox Access
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin("admin")}
                className="bg-slate-900/40 hover:bg-slate-800 border border-slate-800/60 rounded-xl py-2 px-1 text-[10px] font-bold text-amber-400 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin("kitchen")}
                className="bg-slate-900/40 hover:bg-slate-800 border border-slate-800/60 rounded-xl py-2 px-1 text-[10px] font-bold text-emerald-400 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                Kitchen
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin("waiter")}
                className="bg-slate-900/40 hover:bg-slate-800 border border-slate-800/60 rounded-xl py-2 px-1 text-[10px] font-bold text-cyan-400 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                Waiter
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
