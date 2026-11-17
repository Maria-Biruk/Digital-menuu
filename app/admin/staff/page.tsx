"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import AdminHeader from "@/components/AdminHeader";
import RoleGuard from "@/components/RoleGuard";
import {
  fetchStaffDirectory,
  assignStaffRestaurant,
  createStaffAccount,
  deleteStaffAccount,
  resetStaffPassword,
  setStaffAccountActive,
  type StaffAccount,
  type StaffRestaurant,
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
  Trash2,
} from "lucide-react";

export default function AdminStaffAccountsPage() {
  return (
    <RoleGuard pageTitle="Staff Accounts">
      <AdminStaffAccountsContent />
    </RoleGuard>
  );
}

function AdminStaffAccountsContent() {
  const { t } = useStaffLang();
  const [accounts, setAccounts] = useState<StaffAccount[]>([]);
  const [restaurants, setRestaurants] = useState<StaffRestaurant[]>([]);
  const [viewerRole, setViewerRole] = useState("");
  const [viewerId, setViewerId] = useState("");
  const [viewerRestaurantId, setViewerRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Inline reset form state
  const [editing, setEditing] = useState<string | null>(null);
  const [newPass, setNewPass] = useState("");
  const [saving, setSaving] = useState(false);
  const [updatingStaffId, setUpdatingStaffId] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffRole, setStaffRole] = useState("kitchen");
  const [staffRestaurantId, setStaffRestaurantId] = useState("");
  const [restaurantAssignments, setRestaurantAssignments] = useState<Record<string, string>>({});
  const initializedRestaurant = useRef(false);

  const show = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const directory = await fetchStaffDirectory();
      setAccounts(directory.accounts);
      setRestaurantAssignments((current) => {
        const next = { ...current };
        for (const account of directory.accounts) {
          if (!next[account.id]) next[account.id] = account.restaurantId ?? "";
        }
        return next;
      });
      setRestaurants(directory.restaurants);
      setViewerId(directory.viewer.id);
      setViewerRole(directory.viewer.role);
      setViewerRestaurantId(directory.viewer.restaurantId);
      if (!initializedRestaurant.current) {
        setStaffRestaurantId(directory.viewer.restaurantId ?? "");
        initializedRestaurant.current = true;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(
        message.includes("does not exist") || message.includes("schema cache")
          ? "Staff management is not deployed in the database yet. Run backend/supabase/2026-11-13-staff-invitations-and-role-auth.sql in Supabase SQL Editor, then refresh."
          : message,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const isSuperAdmin = viewerRole === "super_admin" || viewerRole === "owner";

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

  const submitCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setInviting(true);
    try {
      await createStaffAccount({
        name: staffName,
        email: staffEmail,
        role: staffRole,
        password: staffPassword,
        ...(isSuperAdmin ? { restaurantId: staffRestaurantId } : {}),
      });
      show(t("Staff account created. They can sign in now."));
      setStaffName("");
      setStaffEmail("");
      setStaffPassword("");
      await load();
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not create staff account.", "error");
    } finally {
      setInviting(false);
    }
  };

  const toggleStaffApproval = async (account: StaffAccount) => {
    const active = !account.isActive;
    setUpdatingStaffId(account.id);
    try {
      await setStaffAccountActive(account.id, active);
      setAccounts((current) =>
        current.map((item) =>
          item.id === account.id
            ? { ...item, isActive: active, status: active ? "approved" : "suspended" }
            : item,
        ),
      );
      show(active ? t("Staff member approved.") : t("Staff member deactivated."));
    } catch (err) {
      show(err instanceof Error ? err.message : "Failed to update staff approval", "error");
    } finally {
      setUpdatingStaffId(null);
    }
  };

  const saveRestaurantAssignment = async (account: StaffAccount) => {
    const restaurantId = restaurantAssignments[account.id] ?? "";
    if (!restaurantId || restaurantId === account.restaurantId) return;
    setUpdatingStaffId(account.id);
    try {
      await assignStaffRestaurant(account.id, restaurantId);
      setAccounts((current) =>
        current.map((item) => item.id === account.id ? { ...item, restaurantId } : item),
      );
      show(t("Restaurant assignment updated."));
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not assign this staff member.", "error");
    } finally {
      setUpdatingStaffId(null);
    }
  };

  const removeStaffAccount = async (account: StaffAccount) => {
    const confirmed = window.confirm(
      `Permanently delete ${account.name}${account.email ? ` (${account.email})` : ""}? This also removes their login and cannot be undone.`,
    );
    if (!confirmed) return;

    setUpdatingStaffId(account.id);
    try {
      await deleteStaffAccount(account.id);
      setAccounts((current) => current.filter((item) => item.id !== account.id));
      show(t("Staff account deleted."));
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not delete the staff account.", "error");
    } finally {
      setUpdatingStaffId(null);
    }
  };

  return (
    <div className="min-h-screen app-bg-dark text-stone-100 font-sans pb-16 lg:pl-64">
      <AdminHeader title={t("Staff Accounts")} subtitle={t("Invite, approve, and manage restaurant staff")} />

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
              <p className="text-[11px] text-stone-400">{t("Add and manage restaurant staff")}</p>
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
              "Create an active staff account with a temporary password. Give the password to the staff member; they can change it using Forgot password on the login page.",
            )}
          </span>
        </div>

        <form onSubmit={submitCreate} className="space-y-4 rounded-2xl border border-[#2B1810] bg-[#3A241A] p-4 sm:p-5">
          <div>
            <h2 className="font-serif text-base font-bold text-white">{t("Add Staff Member")}</h2>
            <p className="mt-1 text-[11px] text-stone-400">
              {t("Set the staff member's name, email, role, and initial password.")}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[11px] font-semibold text-stone-300">
              {t("Full name")}
              <input
                required
                maxLength={120}
                value={staffName}
                onChange={(event) => setStaffName(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-[#3D2415] bg-[#2B1810] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
              />
            </label>
            <label className="text-[11px] font-semibold text-stone-300">
              {t("Email")}
              <input
                required
                type="email"
                value={staffEmail}
                onChange={(event) => setStaffEmail(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-[#3D2415] bg-[#2B1810] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
              />
            </label>
            <label className="text-[11px] font-semibold text-stone-300">
              {t("Password")}
              <input
                required
                type="password"
                minLength={8}
                autoComplete="new-password"
                value={staffPassword}
                onChange={(event) => setStaffPassword(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-[#3D2415] bg-[#2B1810] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
              />
            </label>
            <label className="text-[11px] font-semibold text-stone-300">
              {t("Role")}
              <select
                value={staffRole}
                onChange={(event) => setStaffRole(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-[#3D2415] bg-[#2B1810] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
              >
                {isSuperAdmin && <option value="admin">{t("Admin")}</option>}
                <option value="kitchen">{t("Kitchen")}</option>
                <option value="bartender">{t("Bartender")}</option>
                <option value="waiter">{t("Waiter")}</option>
                <option value="cashier">{t("Cashier")}</option>
              </select>
            </label>
            {isSuperAdmin && (
              <label className="text-[11px] font-semibold text-stone-300">
                {t("Restaurant")}
                <select
                  required
                  value={staffRestaurantId}
                  onChange={(event) => setStaffRestaurantId(event.target.value)}
                  className="mt-1 block w-full rounded-lg border border-[#3D2415] bg-[#2B1810] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                >
                  <option value="">{t("Select a restaurant")}</option>
                  {restaurants.map((restaurant) => (
                    <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <button
            type="submit"
            disabled={inviting || (!isSuperAdmin && !viewerRestaurantId)}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-50"
          >
            {inviting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("Add Staff Member")}
          </button>
        </form>

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
                  <th className="px-3 py-2.5 font-bold">{t("Full name")}</th>
                  <th className="px-3 py-2.5 font-bold">{t("Email")}</th>
                  <th className="px-3 py-2.5 font-bold">{t("Role")}</th>
                  <th className="px-3 py-2.5 font-bold">{t("Status")}</th>
                  {isSuperAdmin && <th className="px-3 py-2.5 font-bold">{t("Restaurant")}</th>}
                  <th className="px-3 py-2.5 font-bold">{t("Last seen")}</th>
                  <th className="px-3 py-2.5 font-bold text-right">{t("Actions")}</th>
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
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                            a.isActive
                              ? "bg-emerald-950/70 text-emerald-300 border-emerald-700/60"
                              : "bg-stone-800 text-stone-400 border-stone-700"
                          }`}
                        >
                          {t(a.status === "approved" ? "Active" : a.status === "pending" ? "Pending approval" : "Suspended")}
                        </span>
                        {!["owner", "super_admin"].includes(a.role) &&
                          (isSuperAdmin || a.role !== "admin") && <button
                          type="button"
                          onClick={() => void toggleStaffApproval(a)}
                          disabled={updatingStaffId === a.id}
                          className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition-colors disabled:opacity-50 ${
                            a.isActive
                              ? "border border-rose-800/60 bg-rose-950/50 text-rose-300 hover:bg-rose-900/60"
                              : "border border-emerald-700/60 bg-emerald-950/50 text-emerald-300 hover:bg-emerald-900/60"
                          }`}
                        >
                          {updatingStaffId === a.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : t(a.status === "approved" ? "Suspend" : "Approve")}
                        </button>
                        }
                      </div>
                    </td>
                    {isSuperAdmin && (
                      <td className="px-3 py-2.5 text-stone-300">
                        <div className="space-y-1.5">
                          <span className="block">
                            {restaurants.find((restaurant) => restaurant.id === a.restaurantId)?.name ?? "Unassigned"}
                          </span>
                          {!["owner", "super_admin"].includes(a.role) && (
                            <div className="flex items-center gap-1">
                              <select
                                aria-label={`${t("Restaurant for")} ${a.name}`}
                                value={restaurantAssignments[a.id] ?? a.restaurantId ?? ""}
                                onChange={(event) =>
                                  setRestaurantAssignments((current) => ({
                                    ...current,
                                    [a.id]: event.target.value,
                                  }))
                                }
                                className="max-w-40 rounded border border-[#3D2415] bg-[#2B1810] px-2 py-1 text-[10px] text-white"
                              >
                                <option value="">{t("Select a restaurant")}</option>
                                {restaurants.map((restaurant) => (
                                  <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                disabled={
                                  updatingStaffId === a.id ||
                                  !(restaurantAssignments[a.id] ?? "") ||
                                  (restaurantAssignments[a.id] ?? "") === a.restaurantId
                                }
                                onClick={() => void saveRestaurantAssignment(a)}
                                className="rounded border border-amber-700/60 px-2 py-1 text-[10px] font-bold text-amber-300 disabled:opacity-40"
                              >
                                {t("Save")}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                    <td className="px-3 py-2.5 text-stone-400 whitespace-nowrap">
                      {a.lastSeen ? new Date(a.lastSeen).toLocaleDateString() : t("Never")}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                      {(isSuperAdmin || !["admin", "owner", "super_admin"].includes(a.role)) && (
                        editing === a.id ? (
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <input
                            type="password"
                            autoFocus
                            value={newPass}
                            onChange={(e) => setNewPass(e.target.value)}
                            placeholder={t("New password")}
                            className="px-2 py-1 rounded-lg bg-[#2B1810] border border-[#3D2415] text-white text-xs w-32 focus:outline-none focus:border-amber-600"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && newPass.length >= 8) void submitReset(a.id);
                            }}
                          />
                          <button
                            onClick={() => void submitReset(a.id)}
                            disabled={saving || newPass.length < 8}
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
                        )
                      )}
                      {a.id !== viewerId &&
                        !["owner", "super_admin"].includes(a.role) &&
                        (isSuperAdmin || a.role !== "admin") && (
                          <button
                            type="button"
                            onClick={() => void removeStaffAccount(a)}
                            disabled={updatingStaffId === a.id}
                            aria-label={`${t("Delete")} ${a.name}`}
                            title={t("Delete")}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-800/60 bg-rose-950/50 text-rose-300 transition-colors hover:bg-rose-900/60 disabled:opacity-50"
                          >
                            {updatingStaffId === a.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
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
