"use client";

import React, { useState, useEffect, useCallback } from "react";
import StaffHeader from "@/components/StaffHeader";
import PaymentVerificationQueue from "@/components/PaymentVerificationQueue";
import WalkInOrderForm from "@/components/WalkInOrderForm";
import ApprovedOrderModal from "@/components/ApprovedOrderModal";
import { fetchPendingPayments, subscribePayments, approvePayment, rejectPayment, fetchOrderTickets } from "@/lib/db";
import { Payment, Ticket } from "@/lib/types";
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
  const [payments, setPayments] = useState<Payment[]>([]);
  const [existingTxIds, setExistingTxIds] = useState<string[]>([]);
  const [notification, setNotification] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [approved, setApproved] = useState<
    | { orderId: string; amount: number; accountLabel: string; tickets: Ticket[] }
    | null
  >(null);

  const showNotification = (msg: string, type: "success" | "error" = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 6000);
  };

  const loadPayments = useCallback(async () => {
    try {
      setPayments(await fetchPendingPayments());
    } catch (err) {
      console.error("Failed to load pending payments", err);
    }
  }, []);

  useEffect(() => {
    void loadPayments();
    const unsubscribe = subscribePayments(() => void loadPayments());
    return unsubscribe;
  }, [loadPayments]);

  const handleApprove = async (paymentId: string, txId: string) => {
    const pay = payments.find((p) => p.id === paymentId);
    try {
      await approvePayment(paymentId, txId);
      if (txId) setExistingTxIds((prev) => [...prev, txId]);
      await loadPayments();
      // Show the cashier exactly what the diner ordered, then let them dispatch it.
      if (pay) {
        const tickets = await fetchOrderTickets(pay.order_id);
        setApproved({
          orderId: pay.order_id,
          amount: pay.amount,
          accountLabel: pay.account_label,
          tickets,
        });
      }
      showNotification("Payment approved. Review the order and send it to the kitchen.");
    } catch (err) {
      showNotification(err instanceof Error ? err.message : "Failed to approve payment", "error");
    }
  };

  const handleReject = async (paymentId: string) => {
    try {
      await rejectPayment(paymentId);
      await loadPayments();
      showNotification("Payment rejected. Customer notified to upload valid proof.");
    } catch (err) {
      showNotification(err instanceof Error ? err.message : "Failed to reject payment", "error");
    }
  };

  const handleWalkInCompleted = () => {
    void loadPayments();
    showNotification("Walk-in Order created successfully!");
  };

  return (
    <div className="min-h-screen app-bg-dark text-stone-100 font-sans pb-16">
      <StaffHeader
        title="Cashier & Billing Console"
        subtitle="Verification & Walk-in Terminal"
        badge="POS Active"
        icon={<CreditCard className="w-5 h-5 text-amber-400" />}
      />

      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Toast / Notification Banner */}
        {notification && (
          <div
            className={`p-4 rounded-2xl border flex items-center gap-3 animate-fadeIn ${
              notification.type === "error"
                ? "bg-rose-950/80 border-rose-500/50 text-rose-200"
                : "bg-emerald-950/80 border-emerald-500/50 text-emerald-200"
            }`}
          >
            {notification.type === "error" ? (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <p className="text-xs sm:text-sm font-medium">{notification.msg}</p>
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
            <div className="bg-[#3A241A] border border-[#2B1810] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-serif font-bold text-base text-white">
                  Incoming Diner Proofs
                </h2>
                <p className="text-xs text-stone-400">
                  Inspect SMS screenshots or transfer receipts. Enter or verify transaction IDs before approval.
                </p>
              </div>
              <div className="text-xs text-stone-400 font-mono bg-[#38210F] px-3 py-1.5 rounded-lg border border-[#2B1810]">
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
            <div className="bg-[#3A241A] border border-[#2B1810] rounded-2xl p-4">
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

      {approved && (
        <ApprovedOrderModal
          orderId={approved.orderId}
          amount={approved.amount}
          accountLabel={approved.accountLabel}
          initialTickets={approved.tickets}
          onClose={() => setApproved(null)}
          onSent={() => void loadPayments()}
        />
      )}
    </div>
  );
}
