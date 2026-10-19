"use client";

import React, { useState, useEffect } from "react";
import AdminHeader from "@/components/AdminHeader";
import { PAYMENT_ACCOUNTS } from "@/lib/mock";
import { PaymentAccount } from "@/lib/types";
import {
  CreditCard,
  Plus,
  Smartphone,
  Landmark,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  CheckCircle,
  Lock,
  Crown,
  X
} from "lucide-react";
import RoleGuard from "@/components/RoleGuard";
import { getRoleInfo } from "@/lib/permissions";

export default function AdminPaymentAccountsPage() {
  return (
    <RoleGuard allowedRoles={["super_admin", "owner", "admin"]} pageTitle="Payment Accounts">
      <AdminPaymentAccountsContent />
    </RoleGuard>
  );
}

function AdminPaymentAccountsContent() {
  const [accounts, setAccounts] = useState<PaymentAccount[]>(PAYMENT_ACCOUNTS);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<PaymentAccount | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setRole(localStorage.getItem("staff_role"));
    }
  }, []);

  const roleInfo = getRoleInfo(role);
  const isSuperAdmin = roleInfo.role === "super_admin" || roleInfo.role === "owner";

  // Form states
  const [accountType, setAccountType] = useState<"bank" | "telebirr">("bank");
  const [label, setLabel] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const openAddModal = () => {
    setEditingAccount(null);
    setAccountType("bank");
    setLabel("");
    setAccountName("");
    setAccountNumber("");
    setPhoneNumber("");
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (acc: PaymentAccount) => {
    setEditingAccount(acc);
    setAccountType(acc.account_type);
    setLabel(acc.label);
    setAccountName(acc.account_name);
    setAccountNumber(acc.account_number || "");
    setPhoneNumber(acc.phone_number || "");
    setIsActive(acc.is_active);
    setModalOpen(true);
  };

  const handleToggleActive = (id: string) => {
    // TODO: Supabase wiring - update is_active in db
    // await supabase.from('payment_accounts').update({ is_active: !curr }).eq('id', id);
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_active: !a.is_active } : a))
    );
  };

  const handleDelete = (id: string) => {
    // TODO: Supabase wiring - delete account from db
    // await supabase.from('payment_accounts').delete().eq('id', id);
    if (confirm("Are you sure you want to remove this payment account?")) {
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      showNotification("Account removed successfully.");
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Supabase wiring - insert or update account
    // await supabase.from('payment_accounts').upsert({ ... });

    const newAcc: PaymentAccount = {
      id: editingAccount ? editingAccount.id : `acc_${Date.now()}`,
      account_type: accountType,
      label,
      account_name: accountName,
      account_number: accountType === "bank" ? accountNumber : undefined,
      phone_number: accountType === "telebirr" ? phoneNumber : undefined,
      is_active: isActive,
    };

    if (editingAccount) {
      setAccounts((prev) =>
        prev.map((a) => (a.id === editingAccount.id ? newAcc : a))
      );
      showNotification(`Updated ${label}`);
    } else {
      setAccounts((prev) => [...prev, newAcc]);
      showNotification(`Added ${label}`);
    }

    setModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#120B07] text-stone-100 font-sans pb-16">
      <AdminHeader
        title="Payment Accounts"
        subtitle="Digital Banking & Telebirr Setup"
      />

      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        {notification && (
          <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs sm:text-sm font-medium flex items-center gap-2 animate-fadeIn">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* Super Admin Protection Banner for Limited Admins */}
        {!isSuperAdmin && (
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-600/50 flex items-start gap-3 shadow-lg">
            <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-bold text-amber-300 text-sm">Financial Settings Restricted to Super Admin</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-700">
                  Admin (Limited Access)
                </span>
              </div>
              <p className="text-stone-300 leading-relaxed">
                You have operational administrator access. Adding, updating, or deleting commercial bank accounts and Telebirr endpoints is strictly protected and requires <strong>Super Admin</strong> credentials.
              </p>
            </div>
          </div>
        )}

        {/* Top Action Bar */}
        <div className="bg-[#1C1109] border border-[#2B1810] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif font-bold text-base text-white">
                Settlement Accounts
              </h2>
              {isSuperAdmin ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800 flex items-center gap-1">
                  <Crown className="w-3 h-3" /> Super Admin Control
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 border border-stone-700 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Read-Only Mode
                </span>
              )}
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Accounts shown to diners during mobile checkout transfer verification.
            </p>
          </div>

          <button
            onClick={() => {
              if (!isSuperAdmin) {
                showNotification("Restricted: Only Super Admin can add payment settlement accounts.");
                return;
              }
              openAddModal();
            }}
            className={`border px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all ${
              isSuperAdmin
                ? "bg-[#2B1810] hover:bg-[#3D2415] text-white border-[#3D2415] cursor-pointer"
                : "bg-stone-900/80 text-stone-400 border-stone-800 cursor-not-allowed opacity-80"
            }`}
          >
            {isSuperAdmin ? <Plus className="w-4 h-4 text-amber-400" /> : <Lock className="w-3.5 h-3.5 text-amber-500/80" />}
            <span>Add Account</span>
            {!isSuperAdmin && (
              <span className="text-[9px] bg-amber-950/80 text-amber-300 px-1.5 py-0.5 rounded border border-amber-800 ml-1">
                Super Admin
              </span>
            )}
          </button>
        </div>

        {/* Accounts Table */}
        <div className="bg-[#1C1109] border border-[#2B1810] rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-stone-300">
              <thead className="bg-[#120B07] text-[11px] uppercase tracking-wider text-stone-400 border-b border-[#2B1810]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Account Type</th>
                  <th className="py-3.5 px-4 font-semibold">Provider / Label</th>
                  <th className="py-3.5 px-4 font-semibold">Account Holder</th>
                  <th className="py-3.5 px-4 font-semibold">Account / Phone No.</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2B1810]">
                {accounts.map((acc) => {
                  const accVal = acc.account_type === "bank" ? acc.account_number : acc.phone_number;

                  return (
                    <tr
                      key={acc.id}
                      className="hover:bg-[#2B1810]/30 transition-colors"
                    >
                      {/* Type */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                            acc.account_type === "bank"
                              ? "bg-amber-950/60 text-amber-300 border border-amber-800/40"
                              : "bg-cyan-950/60 text-cyan-300 border border-cyan-800/40"
                          }`}
                        >
                          {acc.account_type === "bank" ? (
                            <Landmark className="w-3.5 h-3.5" />
                          ) : (
                            <Smartphone className="w-3.5 h-3.5" />
                          )}
                          <span className="capitalize">{acc.account_type}</span>
                        </span>
                      </td>

                      {/* Label */}
                      <td className="py-3.5 px-4 font-bold text-white text-sm">
                        {acc.label}
                      </td>

                      {/* Holder */}
                      <td className="py-3.5 px-4 text-xs text-stone-300 font-medium">
                        {acc.account_name}
                      </td>

                      {/* Account / Phone + Copy */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-amber-300/90 font-bold tracking-wider">
                            {accVal}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (accVal) {
                                navigator.clipboard.writeText(accVal);
                                showNotification(`Copied ${acc.label} account: ${accVal}`);
                              }
                            }}
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#120B07] hover:bg-[#2B1810] text-stone-400 hover:text-white border border-[#2B1810] transition-colors cursor-pointer"
                            title="Copy number"
                          >
                            Copy
                          </button>
                        </div>
                      </td>

                      {/* Toggle Active */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => {
                            if (!isSuperAdmin) {
                              showNotification("Restricted: Only Super Admin can enable/disable payment accounts.");
                              return;
                            }
                            handleToggleActive(acc.id);
                          }}
                          className={`${
                            isSuperAdmin ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                          } transition-transform active:scale-95 inline-flex items-center gap-1`}
                          title={!isSuperAdmin ? "Super Admin only" : undefined}
                        >
                          {acc.is_active ? (
                            <span className="text-emerald-400 flex items-center gap-1 text-xs font-semibold">
                              <ToggleRight className="w-6 h-6" />
                              <span className="hidden sm:inline text-[11px]">Active</span>
                            </span>
                          ) : (
                            <span className="text-stone-500 flex items-center gap-1 text-xs font-semibold">
                              <ToggleLeft className="w-6 h-6" />
                              <span className="hidden sm:inline text-[11px]">Disabled</span>
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isSuperAdmin ? (
                            <>
                              <button
                                onClick={() => openEditModal(acc)}
                                className="p-2 rounded-lg bg-[#120B07] hover:bg-[#2B1810] text-stone-300 hover:text-white border border-[#2B1810] transition-colors cursor-pointer"
                                title="Edit account"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(acc.id)}
                                className="p-2 rounded-lg bg-[#120B07] hover:bg-rose-950/60 text-stone-400 hover:text-rose-300 border border-[#2B1810] hover:border-rose-900/50 transition-colors cursor-pointer"
                                title="Delete account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#120B07] text-[10px] text-stone-500 border border-stone-800 font-medium">
                              <Lock className="w-3 h-3 text-amber-500/70" /> Super Admin
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#1C1109] border border-[#2B1810] rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#2B1810] pb-3">
              <h3 className="font-serif font-bold text-lg text-white">
                {editingAccount ? "Edit Payment Account" : "Add Payment Account"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-[#2B1810] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Account Type Radio */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-2">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                      accountType === "bank"
                        ? "bg-[#2B1810] border-amber-500/80 text-white font-bold"
                        : "bg-[#120B07] border-[#2B1810] text-stone-400 hover:text-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="accType"
                      value="bank"
                      checked={accountType === "bank"}
                      onChange={() => setAccountType("bank")}
                      className="hidden"
                    />
                    <Landmark className="w-4 h-4 text-amber-400" />
                    <span className="text-xs">Bank Transfer</span>
                  </label>

                  <label
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                      accountType === "telebirr"
                        ? "bg-[#2B1810] border-amber-500/80 text-white font-bold"
                        : "bg-[#120B07] border-[#2B1810] text-stone-400 hover:text-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="accType"
                      value="telebirr"
                      checked={accountType === "telebirr"}
                      onChange={() => setAccountType("telebirr")}
                      className="hidden"
                    />
                    <Smartphone className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs">Telebirr Mobile</span>
                  </label>
                </div>
              </div>

              {/* Label */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Bank / Service Name (Label)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Commercial Bank of Ethiopia (CBE) or Telebirr"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#120B07] border border-[#2B1810] text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Account Holder Name */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Meskel House Restaurant PLC"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#120B07] border border-[#2B1810] text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Account Number (Bank) OR Phone Number (Telebirr) */}
              {accountType === "bank" ? (
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1000123456789"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#120B07] border border-[#2B1810] text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Telebirr Phone Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 0911223344"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#120B07] border border-[#2B1810] text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                />
                <label
                  htmlFor="isActiveCheck"
                  className="text-xs text-stone-300 cursor-pointer font-medium"
                >
                  Enable account for customer checkout display
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2B1810]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#2B1810] text-stone-400 hover:text-white text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#2B1810] hover:bg-[#3D2415] text-white border border-[#3D2415] text-xs font-bold transition-all shadow-md"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
