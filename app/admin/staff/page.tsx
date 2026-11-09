"use client";

import React, { useCallback, useEffect, useState } from "react";
import AdminHeader from "@/components/AdminHeader";
import RoleGuard from "@/components/RoleGuard";
import {
  fetchStaffAccounts,
  resetStaffPassword,
  type StaffAccount,
} from "@/lib/db";
import { useStaffLang } from "@/lib/i18n/staff";
import {
  Users,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Loader2,
} from "lucide-react";

export default function AdminStaffAccountsPage() {
  return (
    <RoleGuard requireSuperAdmin pageTitle="Staff Accounts">
      <AdminStaffAccountsContent />
    </RoleGuard>
  );
}

function AdminStaffAccountsContent() {
  const { t } = useStaffLang();
  const [accounts, setAccounts] = useState<StaffAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Inline reset form state
  const [editing, setEditing] = useState<string | null>(null);
  const [newPass, setNewPass] = useState("");
  const [saving, setSaving] = useState(false);

  const show = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAccounts(await fetchStaffAccounts());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startReset = (id: string) => {
    setEditing(id);
    setNewPass("");
  };

  const submitReset = async (id: string) => {
    setSaving(true);
    try {
      await resetStaffPassword(id, newPass);
      show(t("Password updated."));
      setEditing(null);
      setNewPass("");
    } catch (err) {
      show(err instanceof Error ? err.message : "Failed to reset password", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen app-bg-dark text-stone-100 font-sans pb-16">
      <AdminHeader title={t("Staff Accounts")} subtitle={t("Manage & reset staff passwords")} />

      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        {toast && (
          <div
            className={`p-4 rounded-2xl border flex items-center gap-3 animate-fadeIn ${
              toast.type === "error"
                ? "bg-rose-950/80 border-rose-500/50 text-rose-200"
                : "bg-emerald-950/80 border-emerald-500/50 text-emerald-200"
            }`}
          >
            {toast.type === "error" ? (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <p className="text-xs sm:text-sm font-medium">{toast.msg}</p>
          </div>
        )}

        <div className="bg-[#3A241A] border border-[#2B1810] rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-950/60 text-amber-400 flex items-center justify-center border border-amber-800/50">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-base text-white">
                {t("Staff Accounts")} ({accounts.length})
              </h2>
              <p className="text-[11px] text-stone-400">{t("Manage & reset staff passwords")}</p>
            </div>
          </div>
          <button
            onClick={() => void load()}
            title={t("Refresh")}
            className="flex items-center gap-1.5 text-xs bg-[#2B1810] hover:bg-[#3D2415] text-stone-300 hover:text-white px-3 py-1.5 rounded-lg border border-[#3D2415] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="p-3 rounded-xl bg-[#38210F] border border-[#2B1810] text-[11px] text-stone-400 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            {t(
              "Passwords are changed instantly. Tell the staff member their new password so they can sign in — the change takes effect on their very next login.",
            )}
          </span>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs">
            {error}
          </div>
        )}

        {loading && !accounts.length ? (
          <div className="p-10 text-center text-stone-400 text-sm">{t("Loading...")}</div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#2B1810]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#38210F] text-stone-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-3 py-2.5 font-bold">{t("Username")}</th>
                  <th className="px-3 py-2.5 font-bold">{t("Email")}</th>
                  <th className="px-3 py-2.5 font-bold">{t("Role")}</th>
                  <th className="px-3 py-2.5 font-bold">{t("Status")}</th>
                  <th className="px-3 py-2.5 font-bold">{t("Last seen")}</th>
                  <th className="px-3 py-2.5 font-bold text-right">{t("Password")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2B1810]">
                {accounts.map((a) => (
                  <tr key={a.id} className="hover:bg-[#38210F]/50 transition-colors">
                    <td className="px-3 py-2.5 font-bold text-white">{a.name}</td>
                    <td className="px-3 py-2.5 text-stone-300">{a.email ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-full bg-[#2B1810] text-amber-300 border border-[#3D2415] text-[10px] font-bold whitespace-nowrap">
                        {t(a.role)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                          a.isActive
                            ? "bg-emerald-950/70 text-emerald-300 border-emerald-700/60"
                            : "bg-stone-800 text-stone-400 border-stone-700"
                        }`}
                      >
                        {t(a.isActive ? "Active" : "Inactive")}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-stone-400 whitespace-nowrap">
                      {a.lastSeen ? new Date(a.lastSeen).toLocaleDateString() : t("Never")}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {editing === a.id ? (
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <input
                            type="text"
                            autoFocus
                            value={newPass}
                            onChange={(e) => setNewPass(e.target.value)}
                            placeholder={t("New password")}
                            className="px-2 py-1 rounded-lg bg-[#2B1810] border border-[#3D2415] text-white text-xs w-32 focus:outline-none focus:border-amber-600"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && newPass.length >= 6) void submitReset(a.id);
                            }}
                          />
                          <button
                            onClick={() => void submitReset(a.id)}
                            disabled={saving || newPass.length < 6}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-stone-950 font-bold text-[11px] cursor-pointer"
                          >
                            {saving ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                            {t("Save")}
                          </button>
                          <button
                            onClick={() => setEditing(null)}
                            className="px-2.5 py-1 rounded-lg bg-[#2B1810] text-stone-300 border border-[#3D2415] text-[11px] cursor-pointer"
                          >
                            {t("Cancel")}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startReset(a.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#2B1810] hover:bg-[#3D2415] text-amber-300 border border-[#3D2415] text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          <KeyRound className="w-3 h-3" />
                          {t("Reset Password")}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
