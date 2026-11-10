"use client";

import React, { useState, useEffect, useCallback } from "react";
import StaffHeader from "@/components/StaffHeader";
import PaymentVerificationQueue from "@/components/PaymentVerificationQueue";
import WalkInOrderForm from "@/components/WalkInOrderForm";
import PaymentHistory from "@/components/PaymentHistory";
import NotificationToast from "@/components/NotificationToast";
import { useNewArrivalNotifier } from "@/lib/notify";
import { orderNumber } from "@/lib/order-number";
import { fetchPendingPayments, subscribePayments, subscribeNewOrders, approvePayment, rejectPayment, fetchOrderTickets, setTicketStatus } from "@/lib/db";
import { Payment } from "@/lib/types";
import { CreditCard, ShieldCheck, UserPlus, Receipt, CheckCircle, AlertCircle, History } from "lucide-react";
import { useStaffLang } from "@/lib/i18n/staff";
import { publishStaffNotification } from "@/lib/notify";

import RoleGuard from "@/components/RoleGuard";

async function dispatchOrderToKitchen(orderId: string): Promise<void> {
  const tickets = await fetchOrderTickets(orderId);
  if (!tickets.length) {
    throw new Error("The payment was approved, but no kitchen tickets were found.");
  }

  const heldTickets = tickets.filter((ticket) => ticket.status === "held");
  const alreadyReleased = tickets.some((ticket) =>
    ["queued", "preparing", "ready"].includes(ticket.status),
  );
  if (!heldTickets.length && !alreadyReleased) {
    throw new Error("The payment was approved, but the order could not be released to the kitchen.");
  }

  const failures: string[] = [];
  for (const ticket of heldTickets) {
    try {
      await setTicketStatus(ticket.id, "queued");
    } catch (err) {
      failures.push(err instanceof Error ? err.message : String(err));
    }
  }
  if (failures.length) {
    throw new Error(
      `The payment was approved, but ${failures.length} kitchen ticket(s) could not be sent. ${failures[0]}`,
    );
  }
}

export default function CashierPaymentsPage() {
  return (
    <RoleGuard allowedRoles={["super_admin", "owner", "cashier"]} pageTitle="Cashier Billing Console">
      <CashierPaymentsContent />
    </RoleGuard>
  );
}

function CashierPaymentsContent() {
  const { t } = useStaffLang();
  const [activeTab, setActiveTab] = useState<"verify" | "walkin" | "history">("verify");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("staff_role");
    setIsSuperAdmin(saved === "super_admin" || saved === "owner");
  }, []);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [existingTxIds, setExistingTxIds] = useState<string[]>([]);
  const [notification, setNotification] = useState<{ msg: string; type: "success" | "error" } | null>(null);

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

  useEffect(() => {
    const unsubscribe = subscribeNewOrders((orderId) => {
      window.dispatchEvent(
        new CustomEvent("staff-notify", {
          detail: {
            title: "New Diner Order",
            message: `Order #${orderNumber(orderId)} was just placed.`,
          },
        }),
      );
    });
    return unsubscribe;
  }, []);

  const handleApprove = async (paymentId: string, txId: string) => {
    try {
      await approvePayment(paymentId, txId);
      if (txId) setExistingTxIds((prev) => [...prev, txId]);
      await loadPayments();
      const payment = payments.find((item) => item.id === paymentId);
      if (!payment) {
        throw new Error("Payment approved, but its order could not be identified for kitchen dispatch.");
      }
      publishStaffNotification(
        t("Payment Approved"),
        `#${orderNumber(payment.order_id)} · ${t("Payment confirmed and sent to the kitchen.")}`,
      );
      await dispatchOrderToKitchen(payment.order_id);
      showNotification(t("Payment approved and order sent to the kitchen."));
    } catch (err) {
      showNotification(err instanceof Error ? err.message : t("Failed to approve payment"), "error");
    }
  };

  const handleReject = async (paymentId: string) => {
    try {
      await rejectPayment(paymentId);
      await loadPayments();
      showNotification(t("Payment rejected. Customer notified to upload valid proof."));
    } catch (err) {
      showNotification(err instanceof Error ? err.message : t("Failed to reject payment"), "error");
    }
  };

  const handleWalkInCompleted = async (summary: {
    orderId: string;
    amount: number;
    account_label?: string;
  }) => {
    void loadPayments();
    try {
      await dispatchOrderToKitchen(summary.orderId);
      showNotification(t("Walk-in order created and sent to the kitchen."));
    } catch (err) {
      showNotification(err instanceof Error ? err.message : t("Failed to send walk-in order to the kitchen."), "error");
    }
  };

  // Chime + toast when a diner submits a new payment proof to verify.
  const { toast: arrivalToast, dismiss: dismissToast } = useNewArrivalNotifier(
    payments,
    (p) => p.id,
    (p) => ({
      title: t("New Payment to Verify"),
      message: `💳 #${orderNumber(p.order_id)} · ${p.account_label} · ${p.amount.toLocaleString()} ETB ${t("awaiting review")}`,
    }),
  );

  return (
    <div className="min-h-screen app-bg-dark text-stone-100 font-sans pb-16">
      <NotificationToast toast={arrivalToast} onDismiss={dismissToast} />
      <StaffHeader
        title={t("Cashier & Billing Console")}
        subtitle=""
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
            <span>{t("Verify Payments")}</span>
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
            <span>{t("Walk-in Order")}</span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`pb-4 px-6 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "history"
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-stone-400 hover:text-stone-200"
            }`}
          >
            <History className="w-4 h-4" />
            <span>{t("Payment History")}</span>
          </button>
        </div>

        {/* Tab 1: Payment Verification Queue */}
        {activeTab === "verify" && (
          <div className="space-y-4">
            <div className="bg-[#3A241A] border border-[#2B1810] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-serif font-bold text-base text-white">
                  {t("Incoming Diner Proofs")}
                </h2>
                <p className="text-xs text-stone-400">
                  {t("Inspect SMS screenshots or transfer receipts. Enter or verify transaction IDs before approval.")}
                </p>
              </div>
              <div className="text-xs text-stone-400 font-mono bg-[#38210F] px-3 py-1.5 rounded-lg border border-[#2B1810]">
                {t("Known TX IDs")}: <strong className="text-amber-400">{existingTxIds.length}</strong>
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
                {t("Walk-In / Phone Order Terminal")}
              </h2>
              <p className="text-xs text-stone-400">
                {t("Directly take orders for walk-in guests or phone orders, collect cash or transfer, and auto-route to kitchen and bar.")}
              </p>
            </div>

            <WalkInOrderForm onOrderCompleted={handleWalkInCompleted} />
          </div>
        )}

        {/* Tab 3: Payment History with screenshots */}
        {activeTab === "history" && (
          <div className="bg-[#3A241A] border border-[#2B1810] rounded-2xl p-4 sm:p-5">
            <PaymentHistory defaultRange="week" allowExport={isSuperAdmin} />
          </div>
        )}
      </div>

    </div>
  );
}
