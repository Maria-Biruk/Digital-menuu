"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Receipt,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  ShoppingBag,
  UtensilsCrossed,
  AlertCircle
} from "lucide-react";
import PaymentAccountPicker from "@/components/PaymentAccountPicker";
import ProofUpload from "@/components/ProofUpload";
import OrderStatusTracker from "@/components/OrderStatusTracker";
import { PAYMENT_ACCOUNTS, MENU, getTicketsFromStorage } from "@/lib/mock";
import { OrderStatus } from "@/lib/types";

export default function OrderStatusPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const restaurantSlug = (params?.restaurantSlug as string) || "meskel-house";
  const orderId = (params?.orderId as string) || "ord_mock928";

  const queryTable = searchParams?.get("table") || "1";
  const queryItemId = searchParams?.get("item");
  const queryQty = parseInt(searchParams?.get("qty") || "1", 10);
  const queryFulfillment = searchParams?.get("fulfillment");
  const isTakeaway = queryFulfillment === "takeaway" || orderId.includes("takeaway") || queryTable === "takeaway";

  // Order payment & fulfillment status
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid">("pending");
  const [selectedAccountId, setSelectedAccountId] = useState<string>(PAYMENT_ACCOUNTS[0]?.id || "");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState<OrderStatus>("preparing");

  // Mock order details
  const mockPickupCode = orderId.replace(/\D/g, "").slice(-4) || "4821";
  const mockTable = queryTable.replace(/^t/, "");

  // Real-time Staff Status Sync:
  // Only Kitchen, Bar, and Waiter staff can advance order status in their consoles!
  useEffect(() => {
    const syncStatusFromStaff = () => {
      try {
        const storedTickets = getTicketsFromStorage();
        const matchingTicket = storedTickets.find(
          (t) => t.order_id === orderId || (t.pickup_code && t.pickup_code === mockPickupCode)
        );
        if (matchingTicket) {
          if (matchingTicket.status === "served" || matchingTicket.status === "completed") {
            setCurrentStep("served");
          } else if (matchingTicket.status === "ready") {
            setCurrentStep("ready");
          } else if (matchingTicket.status === "preparing") {
            setCurrentStep("preparing");
          } else {
            setCurrentStep("pending");
          }
        }
      } catch (err) {
        // storage reading fallback
      }
    };

    syncStatusFromStaff();
    window.addEventListener("storage", syncStatusFromStaff);
    window.addEventListener("tickets_updated", syncStatusFromStaff);

    return () => {
      window.removeEventListener("storage", syncStatusFromStaff);
      window.removeEventListener("tickets_updated", syncStatusFromStaff);
    };
  }, [orderId, mockPickupCode]);
  
  const orderedItem = MENU.find((m) => m.id === queryItemId);
  const mockOrderLines = orderedItem
    ? [{ item: orderedItem, qty: queryQty }]
    : [
        { item: MENU[0], qty: 1 }, // Doro Wat
        { item: MENU[4], qty: 2 }, // Ethiopian Buna
      ];

  const subtotal = mockOrderLines.reduce((acc, line) => acc + (line.item?.price || 0) * line.qty, 0);
  const vat = Math.round(subtotal * 0.15);
  const serviceFee = 25;
  const total = subtotal + vat + serviceFee;

  const handleSubmitProof = () => {
    setIsSubmitting(true);
    // TODO: Supabase wiring - upload proof to Supabase Storage bucket 'payment_proofs'
    // const { data: uploadData } = await supabase.storage.from('payment_proofs').upload(`${orderId}/${file.name}`, file);
    // await supabase.from('payments').insert({ order_id: orderId, proof_url: uploadData.path, status: 'pending_verification' });

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmissionSuccess(true);
      // Auto-simulate approval in demo after 1.5s
      setTimeout(() => {
        setPaymentStatus("paid");
      }, 1200);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#F5ECD7] text-stone-900 pb-20 font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[#2B1810] text-white shadow-md border-b border-[#3D2415]">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-stone-200 hover:text-white transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-[#FAF7F2] border border-stone-400 shrink-0">
              <img
                src="/skill-coffee-icon.png"
                alt="Skill Coffee"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-left">
              <h1 className="font-serif font-bold text-sm tracking-wide">
                Skill Coffee
              </h1>
              <p className="text-[10px] text-amber-300 font-mono">Order #{orderId.slice(-6).toUpperCase()}</p>
            </div>
          </div>
          <Link
            href={`/${restaurantSlug}/table/t${mockTable}`}
            className="text-xs bg-[#3D2415] text-amber-200 border border-[#FAF7F2]/20 px-2.5 py-1.5 rounded-lg hover:bg-[#FAF7F2]/10 transition-colors"
          >
            Menu
          </Link>
        </div>
      </header>



      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        {/* Order Meta Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-200/80">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#2B1810] text-amber-400 flex items-center justify-center font-serif text-lg font-bold">
                {isTakeaway ? <ShoppingBag className="w-5 h-5" /> : <UtensilsCrossed className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-xs text-stone-500">Order ID: {orderId}</p>
              </div>
            </div>
            <div className="text-right">
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                  paymentStatus === "paid"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : "bg-amber-100 text-amber-800 border border-amber-300"
                }`}
              >
                {paymentStatus === "paid" ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Paid & Confirmed
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5" /> Awaiting Payment
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Quick Summary of Items */}
          <div className="pt-4 space-y-2">
            <p className="text-xs font-semibold uppercase text-stone-400 tracking-wider">Ordered Items</p>
            {mockOrderLines.map((line, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm">
                <span className="text-stone-700">
                  <span className="font-semibold text-stone-900">{line.qty}x</span> {line.item?.name_i18n.en}
                </span>
                <span className="font-medium text-stone-900">{line.item?.price * line.qty} ETB</span>
              </div>
            ))}
            <div className="border-t border-dashed border-stone-200 pt-3 flex justify-between items-center text-sm font-bold text-stone-900">
              <span>Total Amount</span>
              <span className="text-base text-[#2B1810]">{total} ETB</span>
            </div>
          </div>
        </div>

        {/* STATE 1: PENDING PAYMENT */}
        {paymentStatus === "pending" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <p className="font-bold mb-0.5">Payment Verification Required</p>
                Transfer the total of <strong>{total} ETB</strong> using Telebirr or Bank transfer, then upload a screenshot of your confirmation message below.
              </div>
            </div>

            <div className="bg-[#FAF5EC] rounded-2xl p-5 shadow-sm border border-[#D4B896] space-y-4">
              <PaymentAccountPicker
                accounts={PAYMENT_ACCOUNTS}
                selectedAccountId={selectedAccountId}
                onSelect={(account) => setSelectedAccountId(account.id)}
              />
            </div>

            {/* Proof Upload */}
            <div className="bg-[#FAF5EC] rounded-2xl p-5 shadow-sm border border-[#D4B896] space-y-3">
              <h3 className="text-sm font-bold text-stone-900">Upload Transaction Receipt</h3>
              <p className="text-xs text-stone-500">
                Snap or upload a screenshot of your Telebirr / Bank SMS confirmation.
              </p>
              <ProofUpload onFileSelect={(file) => setUploadedFile(file)} />
            </div>

            {/* Submit Action */}
            {submissionSuccess ? (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl p-4 text-center space-y-2">
                <div className="inline-flex p-2 rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm">Receipt Submitted to Cashier!</h4>
                <p className="text-xs text-emerald-800">
                  Verifying your payment now... this screen will automatically refresh in a moment.
                </p>
              </div>
            ) : (
              <>
                {!uploadedFile && (
                  <p className="text-xs text-center text-amber-700 font-semibold flex items-center justify-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Please upload your payment screenshot before submitting.
                  </p>
                )}
                <button
                  onClick={handleSubmitProof}
                  disabled={isSubmitting || !uploadedFile}
                  className="w-full py-4 px-6 bg-[#2B1810] hover:bg-[#3D2415] active:bg-[#1F110A] text-white rounded-2xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-base disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#2B1810]"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Submitting Receipt...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5 text-amber-400" />
                      Submit for Verification
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}

        {/* STATE 2: PAID & CONFIRMED */}
        {paymentStatus === "paid" && (
          <div className="space-y-6 animate-fadeIn">
            {/* Big 4-Digit Pickup Code Box */}
            <div className="bg-white border-2 border-dashed border-[#2B1810] rounded-3xl p-6 text-center shadow-md relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-28 h-28 bg-amber-100/60 rounded-full blur-xl pointer-events-none" />
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-3 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verified & Active
              </div>

              <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-1">
                Your 4-Digit Pickup / Verification Code
              </p>
              
              <div className="my-3 py-3 px-6 inline-block bg-[#120B07] text-white rounded-2xl shadow-inner border border-[#2B1810]">
                <div className="font-mono text-4xl sm:text-5xl font-black tracking-[0.35em] text-amber-400 pl-2">
                  {mockPickupCode}
                </div>
              </div>

              <p className="text-xs text-stone-500 max-w-sm mx-auto mt-2">
                Provide this 4-digit code to your waiter or show it at the pickup station when collecting your food.
              </p>

              {/* Estimated Time Badge */}
              <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold">
                <Clock className="w-4 h-4 text-amber-700 animate-pulse" />
                <span>Estimated Preparation Time: ~18 Minutes</span>
              </div>
            </div>

            {/* Vertical 4-Step Tracker */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200/80 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h3 className="font-serif font-bold text-base text-stone-900">Live Kitchen Tracker</h3>
                <span className="text-xs text-stone-400">Updates live</span>
              </div>

              <OrderStatusTracker currentStep={currentStep} />

              {/* Live Staff-Controlled Status Info */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-stone-700">Kitchen & Bar Staff Station</span>
                </div>
                <span className="text-[11px] text-stone-400">Status synced in real-time</span>
              </div>
            </div>

            {/* Need Assistance */}
            <div className="text-center pt-2">
              <p className="text-xs text-stone-500">
                Need extra water, napkins, or help? Tap the bell icon in your menu to call your waiter.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
