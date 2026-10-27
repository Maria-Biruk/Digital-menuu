"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShieldCheck,
  RefreshCw,
  ShoppingBag,
  UtensilsCrossed,
  AlertCircle,
  Armchair,
  Pencil,
} from "lucide-react";
import PaymentAccountPicker from "@/components/PaymentAccountPicker";
import ProofUpload from "@/components/ProofUpload";
import OrderStatusTracker from "@/components/OrderStatusTracker";
import CallWaiterButton from "@/components/CallWaiterButton";
import TableSelector from "@/components/TableSelector";
import { supabaseBrowser } from "@/lib/supabase";
import { fetchPaymentAccounts, fetchTables, setOrderTable } from "@/lib/db";
import type { OrderStatus, PaymentAccount, Table } from "@/lib/types";

// Fields read from the `orders` row follow the real Postgres columns:
// subtotal / vat / service_fee / total. smoke.mjs confirms id / status /
// payment_status. Totals are computed server-side and are NOT recomputed here.
interface OrderRow {
  id: string;
  status: OrderStatus;
  payment_status: string;
  fulfillment_type?: string;
  table_id?: string;
  subtotal?: number | string;
  vat?: number | string;
  service_fee?: number | string;
  total?: number | string;
  created_at?: string;
}

interface OrderedItem {
  name: string;
  quantity: number;
  unit_price: number;
}

const num = (v: number | string | undefined): number => (v == null ? 0 : Number(v));

// Progression rank so the diner's tracker can show the FURTHEST step reached,
// whether it came from the parent order or an individual station ticket.
const ORDER_RANK: Record<OrderStatus, number> = {
  received: 0,
  preparing: 1,
  ready: 2,
  served: 3,
  cancelled: -1,
};

export default function OrderStatusPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const restaurantSlug = (params?.restaurantSlug as string) || "meskel-house";
  const orderId = (params?.orderId as string) || "";

  const queryTable = searchParams?.get("table") || "1";
  const mockTable = queryTable.replace(/^t/, "");

  const [order, setOrder] = useState<OrderRow | null>(null);
  const [orderedItems, setOrderedItems] = useState<OrderedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pickupCode, setPickupCode] = useState<string | null>(null);
  const [ticketStatuses, setTicketStatuses] = useState<string[]>([]);
  const [ticketStations, setTicketStations] = useState<string[]>([]);

  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);

  const [tables, setTables] = useState<Table[]>([]);
  const [editingTable, setEditingTable] = useState(false);
  const [pickingTableId, setPickingTableId] = useState<string>("");
  const [savingTable, setSavingTable] = useState(false);
  const [tableMsg, setTableMsg] = useState<string | null>(null);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedProof, setSubmittedProof] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    const sb = supabaseBrowser();
    // RLS only returns the diner's own order.
    const { data, error } = await sb
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();
    if (error) {
      setLoadError(error.message);
      return;
    }
    if (data) setOrder(data as OrderRow);

    // Ordered dishes live in `order_items`; join menu_items for the name.
    const { data: itemRows } = await sb
      .from("order_items")
      .select("quantity, unit_price, menu_items(name_i18n)")
      .eq("order_id", orderId);
    setOrderedItems(
      ((itemRows ?? []) as Array<Record<string, any>>).map((r) => ({
        name: String(r.menu_items?.name_i18n?.en ?? "Item"),
        quantity: Number(r.quantity ?? 0),
        unit_price: Number(r.unit_price ?? 0),
      })),
    );

    // Station tickets drive the live kitchen status: the parent order.status
    // can lag behind (e.g. it may not flip to 'preparing' when one ticket starts).
    const { data: ticketRows } = await sb
      .from("order_station_tickets")
      .select("status, station")
      .eq("order_id", orderId);
    const rows = (ticketRows ?? []) as Array<Record<string, any>>;
    setTicketStatuses(rows.map((r) => String(r.status)));
    setTicketStations(rows.map((r) => String(r.station)));
  }, [orderId]);

  // This diner order flow is intentionally light-only. The menu's global `dark`
  // class (persisted on <html> via localStorage) would otherwise activate the
  // dark: variants of child components (e.g. PaymentAccountPicker) and clash
  // with this page's light background. Force light while mounted.
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.remove("dark");
    return () => {
      if (hadDark) root.classList.add("dark");
    };
  }, []);

  // Establish an anonymous session so RLS lets the diner read their own order.
  useEffect(() => {
    let active = true;
    (async () => {
      const sb = supabaseBrowser();
      try {
        const { data: sess } = await sb.auth.getSession();
        let uid = sess.session?.user?.id ?? null;
        if (!uid) {
          const { data: anon } = await sb.auth.signInAnonymously();
          uid = anon.user?.id ?? null;
        }
        if (!active) return;
        setUserId(uid ?? null);

        await loadOrder();

        // Pickup code lives in order_secrets (diner-only via RLS).
        const { data: secret } = await sb
          .from("order_secrets")
          .select("pickup_code")
          .eq("order_id", orderId)
          .maybeSingle();
        if (active && secret?.pickup_code) setPickupCode(secret.pickup_code);

        const accs = await fetchPaymentAccounts();
        if (active) {
          setAccounts(accs);
          setSelectedAccountId((prev) => prev || accs[0]?.id || "");
        }

        const tbls = await fetchTables();
        if (active) setTables(tbls);
      } catch (err) {
        if (active) setLoadError(err instanceof Error ? err.message : String(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [orderId, loadOrder]);

  // Live status: subscribe to orders + order_station_tickets for this order.
  useEffect(() => {
    if (!orderId) return;
    const sb = supabaseBrowser();
    const channel = sb
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        () => void loadOrder(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_station_tickets", filter: `order_id=eq.${orderId}` },
        () => void loadOrder(),
      )
      .subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  }, [orderId, loadOrder]);

  const isTakeaway = String(order?.fulfillment_type ?? "").toLowerCase().includes("take");
  const currentTableLabel = tables.find((t) => t.id === order?.table_id)?.label ?? "";

  // Order becomes "active" (code + tracker visible) once paid, once staff
  // have started it (status leaves 'received'), or once proof is submitted.
  const isActive =
    submittedProof ||
    order?.payment_status === "paid" ||
    (order?.status != null && order.status !== "received");

  const paymentConfirmed = order?.payment_status === "paid" || isActive;

  // Effective status for the tracker: the furthest step reached by either the
  // order row or any of its station tickets (kitchen/bar "Start Preparing").
  const ticketDerived: OrderStatus = !ticketStatuses.length
    ? "received"
    : ticketStatuses.every((s) => s === "ready")
      ? "ready"
      : ticketStatuses.some((s) => s === "preparing" || s === "ready")
        ? "preparing"
        : "received";
  const baseStatus: OrderStatus = order?.status ?? "received";
  const effectiveStatus: OrderStatus =
    baseStatus === "served" || baseStatus === "cancelled"
      ? baseStatus
      : ORDER_RANK[ticketDerived] > ORDER_RANK[baseStatus]
        ? ticketDerived
        : baseStatus;

  // Identify whether the order is food, drink, or both so the tracker uses the
  // right wording (a drink order should not say "Started Cooking").
  const hasKitchen = ticketStations.some((s) => /kitchen/i.test(s));
  const hasBar = ticketStations.some((s) => /bar/i.test(s));
  const orderKind: "food" | "drink" | "mixed" | undefined =
    hasKitchen && hasBar ? "mixed" : hasBar ? "drink" : hasKitchen ? "food" : undefined;

  const handleSubmitProof = async () => {
    if (!uploadedFile || !orderId || !userId || !selectedAccountId) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const sb = supabaseBrowser();
      const proofPath = `${userId}/${orderId}/proof.png`;
      const { error: upErr } = await sb.storage
        .from("payment-proofs")
        .upload(proofPath, uploadedFile, {
          contentType: uploadedFile.type || "image/png",
          upsert: true,
        });
      if (upErr) throw new Error(upErr.message);

      const { error: rpcErr } = await sb.rpc("attach_payment_proof", {
        p_order: orderId,
        p_account: selectedAccountId,
        p_proof_path: proofPath,
      });
      if (rpcErr) throw new Error(rpcErr.message);

      setSubmittedProof(true);
      await loadOrder();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveTable = async () => {
    if (!pickingTableId || !orderId) return;
    setSavingTable(true);
    setTableMsg(null);
    try {
      await setOrderTable(orderId, pickingTableId);
      await loadOrder();
      setEditingTable(false);
    } catch (err) {
      setTableMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingTable(false);
    }
  };

  const subtotal = num(order?.subtotal);
  const vat = num(order?.vat);
  const serviceFee = num(order?.service_fee);
  const total = num(order?.total);

  return (
    <div className="min-h-screen app-bg-light text-stone-900 pb-20 font-sans">
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
            <div className="w-8 h-8 rounded-full overflow-hidden bg-[#FAF7F2] border border-stone-400 shrink-0 flex items-center justify-center p-0.5">
              <img
                src="/skill-coffee-icon.png"
                alt="Skill Coffee"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="text-left">
              <h1 className="font-serif font-bold text-sm tracking-wide">Skill Coffee</h1>
              <p className="text-[10px] text-amber-300 font-mono">
                Order #{orderId.slice(-6).toUpperCase()}
              </p>
            </div>
          </div>
          <Link
            href={`/${restaurantSlug}`}
            className="text-xs bg-[#3D2415] text-amber-200 border border-[#FAF7F2]/20 px-2.5 py-1.5 rounded-lg hover:bg-[#FAF7F2]/10 transition-colors"
          >
            Menu
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        {loading && (
          <div className="bg-white rounded-2xl p-8 text-center text-sm text-stone-500 border border-stone-200/80 shadow-sm">
            Loading your order…
          </div>
        )}

        {!loading && loadError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Could not load this order: {loadError}</span>
          </div>
        )}

        {!loading && !loadError && !order && (
          <div className="bg-white rounded-2xl p-8 text-center text-sm text-stone-500 border border-stone-200/80 shadow-sm">
            We couldn&apos;t find this order. It may belong to another device or
            hasn&apos;t been created yet.
          </div>
        )}

        {order && (
          <>
            {/* Order Meta Card */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-200/80">
              <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#2B1810] text-amber-400 flex items-center justify-center font-serif text-lg font-bold">
                    {isTakeaway ? (
                      <ShoppingBag className="w-5 h-5" />
                    ) : (
                      <UtensilsCrossed className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-stone-500">Order ID: {order.id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      paymentConfirmed
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-amber-100 text-amber-800 border border-amber-300"
                    }`}
                  >
                    {paymentConfirmed ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
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
              {orderedItems.length > 0 && (
                <div className="pt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase text-stone-400 tracking-wider">
                    Ordered Items
                  </p>
                  {orderedItems.map((line, idx) => {
                    const name = line.name || "Item";
                    return (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="text-stone-700">
                          <span className="font-semibold text-stone-900">{line.quantity}x</span>{" "}
                          {name}
                        </span>
                        <span className="font-medium text-stone-900">
                          {line.unit_price * (line.quantity || 0)} ETB
                        </span>
                      </div>
                    );
                  })}
                  <div className="border-t border-dashed border-stone-200 pt-3 space-y-1 text-sm">
                    <div className="flex justify-between text-stone-500 text-xs">
                      <span>Subtotal</span>
                      <span>{subtotal.toLocaleString()} ETB</span>
                    </div>
                    <div className="flex justify-between text-stone-500 text-xs">
                      <span>VAT (15%)</span>
                      <span>{vat.toLocaleString()} ETB</span>
                    </div>
                    <div className="flex justify-between text-stone-500 text-xs">
                      <span>Service Fee</span>
                      <span>{serviceFee.toLocaleString()} ETB</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 font-bold text-stone-900">
                      <span>Total Amount</span>
                      <span className="text-base text-[#2B1810]">{total.toLocaleString()} ETB</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* STATE 1: AWAITING PAYMENT / VERIFICATION */}
            {!isActive && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 leading-relaxed">
                    <p className="font-bold mb-0.5">Payment Verification Required</p>
                    Transfer the total of <strong>{total.toLocaleString()} ETB</strong> using
                    Telebirr or Bank transfer, then upload a screenshot of your confirmation
                    message below.
                  </div>
                </div>

                <div className="bg-[#FAF5EC] rounded-2xl p-5 shadow-sm border border-[#D4B896] space-y-4">
                  <PaymentAccountPicker
                    accounts={accounts}
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

                {submitError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-3 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Submit Action */}
                {!uploadedFile && (
                  <p className="text-xs text-center text-amber-700 font-semibold flex items-center justify-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Please upload your payment screenshot before submitting.
                  </p>
                )}
                <button
                  onClick={handleSubmitProof}
                  disabled={isSubmitting || !uploadedFile}
                  className="w-full py-4 px-6 bg-[#2B1810] hover:bg-[#3D2415] active:bg-[#2A180B] text-white rounded-2xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-base disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#2B1810]"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Submitting Receipt…
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5 text-amber-400" />
                      Submit for Verification
                    </>
                  )}
                </button>
              </div>
            )}

            {/* STATE 2: CONFIRMED / ACTIVE */}
            {isActive && (
              <div className="space-y-6 animate-fadeIn">
                {/* Big 4-Digit Pickup Code Box */}
                <div className="bg-white border-2 border-dashed border-[#2B1810] rounded-3xl p-6 text-center shadow-md relative overflow-hidden">
                  <div className="absolute -top-12 -right-12 w-28 h-28 bg-amber-100/60 rounded-full blur-xl pointer-events-none" />
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-3 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {paymentConfirmed ? "Verified & Active" : "Receipt Submitted"}
                  </div>

                  <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-1">
                    Your 4-Digit Pickup / Verification Code
                  </p>

                  <div className="my-3 py-3 px-6 inline-block bg-[#38210F] text-white rounded-2xl shadow-inner border border-[#2B1810]">
                    <div className="font-mono text-4xl sm:text-5xl font-black tracking-[0.35em] text-amber-400 pl-2">
                      {pickupCode ?? "••••"}
                    </div>
                  </div>

                  <p className="text-xs text-stone-500 max-w-sm mx-auto mt-2">
                    Provide this 4-digit code to your waiter or show it at the pickup station
                    when collecting your food.
                  </p>
                </div>

                {/* Live Status Tracker */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200/80 space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <h3 className="font-serif font-bold text-base text-stone-900">
                      Live Kitchen Tracker
                    </h3>
                    <span className="text-xs text-stone-400">Updates live</span>
                  </div>

                  <OrderStatusTracker currentStatus={effectiveStatus} orderKind={orderKind} />

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-semibold text-stone-700">Kitchen & Bar Station</span>
                    </div>
                    <span className="text-[11px] text-stone-400">Synced in real-time</span>
                  </div>
                </div>

                {/* Need Assistance */}
                {!isTakeaway && (
                  <div className="text-center pt-2">
                    <p className="text-xs text-stone-500">
                      Need extra water, napkins, or help? Use the bell button to call your waiter.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TABLE SEATING: assign / change table AFTER payment, on the confirmed page */}
            {isActive && order.status !== "served" && order.status !== "cancelled" && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-200/80 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#FAF5EC] text-[#2B1810] flex items-center justify-center shrink-0 border border-[#D4B896]">
                      <Armchair className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-stone-900">
                        {isTakeaway ? "Ordering to go?" : `Table ${currentTableLabel || "—"}`}
                      </p>
                      <p className="text-xs text-stone-500">
                        {isTakeaway
                          ? "Once you're seated in the cafe, add your table number."
                          : "Eating here — tap change if you move to a different table."}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTable((v) => !v);
                      setPickingTableId(order.table_id || "");
                      setTableMsg(null);
                    }}
                    className="shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-[#2B1810] text-white hover:bg-[#3D2415] transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    {isTakeaway ? "Add Table" : "Change"}
                  </button>
                </div>

                {editingTable && (
                  <div className="pt-3 border-t border-stone-100 space-y-3 animate-fadeIn">
                    <p className="text-xs font-semibold text-stone-600">
                      Which table are you sitting at?
                    </p>
                    <TableSelector
                      tables={tables}
                      selectedTableId={pickingTableId}
                      onSelect={(id) => setPickingTableId(id)}
                    />
                    {tableMsg && (
                      <p className="text-xs text-rose-600 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {tableMsg}
                      </p>
                    )}
                    <button
                      type="button"
                      disabled={!pickingTableId || savingTable}
                      onClick={handleSaveTable}
                      className="w-full py-3 px-4 bg-[#2B1810] hover:bg-[#3D2415] text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {savingTable ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> Saving…
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-amber-400" /> Confirm My Table
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Floating Call Waiter button — wired to rpc("call_waiter") */}
      {!isTakeaway && order?.table_id && (
        <CallWaiterButton tableId={order.table_id} tableLabel={`Table ${mockTable}`} />
      )}
    </div>
  );
}
