"use client";

import React, { useState } from "react";
import StaffHeader from "@/components/StaffHeader";
import PaymentVerificationQueue from "@/components/PaymentVerificationQueue";
import WalkInOrderForm from "@/components/WalkInOrderForm";
import { INITIAL_PAYMENTS } from "@/lib/mock";
import { Payment } from "@/lib/types";
import { CreditCard, ShieldCheck, UserPlus, Receipt, CheckCircle, AlertCircle } from "lucide-react";

import RoleGuard from "@/components/RoleGuard";

export default function CashierPaymentsPage() {
  return (
    <RoleGuard allowedRoles={["super_admin", "owner", "cashier"]} pageTitle="Cashier Billing Console">
      <CashierPaymentsContent />
    </RoleGuard>
  );
}

function CashierPaymentsContent() {
  const [activeTab, setActiveTab] = useState<"verify" | "walkin">("verify");
  const [payments, setPayments] = useState<Payment[]>(INITIAL_PAYMENTS);
  const [existingTxIds, setExistingTxIds] = useState<string[]>([
    "CBE-TX-998124",
    "TELE-884129",
    "AWASH-771203"
  ]);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleApprove = (paymentId: string, txId: string) => {
    // TODO: Supabase wiring - update payment status to verified
    // await supabase.from('payments').update({ status: 'verified', transaction_id: txId, verified_at: new Date().toISOString() }).eq('id', paymentId);
    // await supabase.from('orders').update({ payment_status: 'paid', status: 'preparing' }).eq('id', payment.order_id);

    setPayments((prev) => prev.filter((p) => p.id !== paymentId));
    if (txId) {
      setExistingTxIds((prev) => [...prev, txId]);
    }
    showNotification(`Payment approved for order! Kitchen ticket automatically dispatched.`);
  };

  const handleReject = (paymentId: string) => {
    // TODO: Supabase wiring - mark payment as rejected and alert diner
    // await supabase.from('payments').update({ status: 'rejected' }).eq('id', paymentId);
    setPayments((prev) => prev.filter((p) => p.id !== paymentId));
    showNotification(`Payment rejected. Customer notified to upload valid proof.`);
  };

  const handleWalkInCompleted = (summary: any) => {
    // TODO: Supabase wiring - insert order, payment, and dispatch tickets
    // const { data: newOrder } = await supabase.from('orders').insert({ ... }).select().single();
    showNotification(`Walk-in Order created & paid successfully! Tickets sent to kitchen & bar.`);
  };

  return (
    <div className="min-h-screen bg-[#120B07] text-stone-100 font-sans pb-16">
      <StaffHeader
        title="Cashier & Billing Console"
        subtitle="Verification & Walk-in Terminal"
        badge="POS Active"
        icon={<CreditCard className="w-5 h-5 text-amber-400" />}
      />

      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Toast / Notification Banner */}
        {notification && (
          <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 flex items-center gap-3 animate-fadeIn">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-xs sm:text-sm font-medium">{notification}</p>
          </div>
        )}

        {/* Tab Controls */}
        <div className="flex border-b border-[#2B1810]">
          <button
            onClick={() => setActiveTab("verify")}
            className={`pb-4 px-6 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "verify"
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-stone-400 hover:text-stone-200"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Verify Payments</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === "verify"
                  ? "bg-amber-400 text-stone-950"
                  : "bg-stone-800 text-stone-400"
              }`}
            >
              {payments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("walkin")}
            className={`pb-4 px-6 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "walkin"
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-stone-400 hover:text-stone-200"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Walk-in Order</span>
          </button>
        </div>

        {/* Tab 1: Payment Verification Queue */}
        {activeTab === "verify" && (
          <div className="space-y-4">
            <div className="bg-[#1C1109] border border-[#2B1810] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-serif font-bold text-base text-white">
                  Incoming Diner Proofs
                </h2>
                <p className="text-xs text-stone-400">
                  Inspect SMS screenshots or transfer receipts. Enter or verify transaction IDs before approval.
                </p>
              </div>
              <div className="text-xs text-stone-400 font-mono bg-[#120B07] px-3 py-1.5 rounded-lg border border-[#2B1810]">
                Known TX IDs: <strong className="text-amber-400">{existingTxIds.length}</strong>
              </div>
            </div>

            <PaymentVerificationQueue
              payments={payments}
              onApprove={handleApprove}
              onReject={handleReject}
              existingTxIds={existingTxIds}
            />
          </div>
        )}

        {/* Tab 2: Walk-In Order POS Form */}
        {activeTab === "walkin" && (
          <div className="space-y-4">
            <div className="bg-[#1C1109] border border-[#2B1810] rounded-2xl p-4">
              <h2 className="font-serif font-bold text-base text-white">
                Walk-In / Phone Order Terminal
              </h2>
              <p className="text-xs text-stone-400">
                Directly take orders for walk-in guests or phone orders, collect cash or transfer, and auto-route to kitchen and bar.
              </p>
            </div>

            <WalkInOrderForm onOrderCompleted={handleWalkInCompleted} />
          </div>
        )}
      </div>
    </div>
  );
}
