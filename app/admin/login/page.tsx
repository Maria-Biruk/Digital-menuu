"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  User,
  ArrowLeft,
  ShieldAlert,
} from "lucide-react";
import { signInStaff, fetchStaffRole, signOutStaff, supabaseBrowser } from "@/lib/supabase";
import { getStaffHomeRoute } from "@/lib/permissions";
import { STAFF_LANG_LABEL, useStaffLang, type StaffLang } from "@/lib/i18n/staff";
import { Languages } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const { t, lang, setLang } = useStaffLang();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError(t("Please enter your staff email."));
      return;
    }
    if (!normalizedEmail.includes("@")) {
      setError(t("Please include an '@' in the email address."));
      return;
    }

    setError("");
    setLoading(true);
    try {
      await signInStaff(normalizedEmail, password);
      const role = await fetchStaffRole();
      if (!role) {
        await signOutStaff();
        setError(t("This account is pending approval, suspended, or not assigned an active staff role."));
        setLoading(false);
        return;
      }
      const destination = getStaffHomeRoute(role);
      if (destination === "/admin/login") {
        await signOutStaff();
        setError(t("This account does not have a supported staff role."));
        setLoading(false);
        return;
      }
      localStorage.setItem("staff_role", role);
      router.replace(destination);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Sign in failed"));
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setError(t("Enter your email above to receive a password reset link."));
      setResetMessage("");
      return;
    }

    setError("");
    setResetMessage("");
    setResettingPassword(true);
    try {
      const { error: resetError } = await supabaseBrowser().auth.resetPasswordForEmail(
        normalizedEmail,
        { redirectTo: `${window.location.origin}/auth/callback?next=/admin/set-password` },
      );
      if (resetError) throw new Error(resetError.message);
      setResetMessage(t("If an account exists for this email, a password reset link has been sent."));
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : t("Could not send a password reset link."));
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <div className="min-h-screen app-bg-dark text-stone-100 flex flex-col justify-center items-center px-4 py-6 sm:py-0 relative overflow-hidden font-sans">
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#2B1810] opacity-40 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-600 opacity-15 blur-[120px] pointer-events-none" />

      <Link
        href="/meskel-house/order"
        className="absolute top-4 left-4 sm:top-6 sm:left-6 flex min-h-[44px] items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-400 hover:text-white transition-colors py-2.5 px-4 rounded-full border border-[#2B1810] bg-[#3A241A]/80 backdrop-blur"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {t("Customer Menu")}
      </Link>

      {/* Staff language switcher — Amharic is the default for the team. */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-1 p-1 rounded-full border border-[#2B1810] bg-[#3A241A]/80 backdrop-blur">
        <Languages className="w-3.5 h-3.5 text-amber-400 ml-2 mr-1" />
        {(Object.keys(STAFF_LANG_LABEL) as StaffLang[]).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
              lang === l ? "bg-[#2B1810] text-amber-300" : "text-stone-400 hover:text-white"
            }`}
          >
            {STAFF_LANG_LABEL[l]}
          </button>
        ))}
      </div>

      <div className="w-full max-w-md my-2 sm:my-8">
        {/* Logo and Brand */}
        <div className="text-center mb-5 sm:mb-8 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FAF7F2] flex items-center justify-center shadow-xl shadow-black/40 mb-3 border border-[#3D2415] overflow-hidden p-1.5">
            <img
              src="/skill-coffee-icon.png"
              alt="Skill Coffee"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="font-serif font-bold text-3xl tracking-wide text-white">
            {t("Staff Portal")}
          </h1>
          <p className="font-sans text-xs text-stone-400 mt-1 font-medium">
            {t("Skill Coffee")} {t("Management & Service Systems")}
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-3xl bg-[#3A241A]/90 border border-[#2B1810] backdrop-blur-xl p-5 sm:p-8 shadow-2xl relative">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1.5 flex items-center gap-1.5">
                <User className="w-3 h-3 text-amber-400" />
                {t("Email")}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("Enter staff email")}
                autoComplete="username"
                inputMode="email"
                className="w-full px-4 py-3 rounded-xl border border-[#2B1810] bg-[#38210F] text-base text-white focus:outline-none focus:border-amber-500 placeholder:text-stone-600 transition-colors"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  <Lock className="w-3 h-3 text-amber-400" /> {t("Password")}
                </label>
                <button
                  type="button"
                  onClick={() => void handleForgotPassword()}
                  disabled={resettingPassword}
                  className="text-[11px] font-semibold text-amber-300 hover:text-amber-200 disabled:opacity-60"
                >
                  {resettingPassword ? t("Sending...") : t("Forgot password?")}
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                inputMode="text"
                className="w-full px-4 py-3 rounded-xl border border-[#2B1810] bg-[#38210F] text-base text-white focus:outline-none focus:border-amber-500 placeholder:text-stone-600 transition-colors"
              />
            </div>

            {resetMessage && (
              <p role="status" className="rounded-xl border border-emerald-800/50 bg-emerald-950/30 p-3 text-xs font-medium text-emerald-200">
                {resetMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] bg-[#2B1810] hover:bg-[#3D2415] active:bg-[#2A180B] text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-md mt-2 cursor-pointer border border-[#3D2415] flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  {t("Accessing Dashboard...")}
                </>
              ) : (
                t("Access Dashboard")
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
