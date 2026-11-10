"use client";

import React, { Suspense, useState, useEffect, useCallback } from "react";
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
  Bell,
  CheckCheck,
  Pencil,
  Eye,
  EyeOff,
} from "lucide-react";
import PaymentAccountPicker from "@/components/PaymentAccountPicker";
import ProofUpload from "@/components/ProofUpload";
import OrderStatusTracker from "@/components/OrderStatusTracker";
import CallWaiterButton from "@/components/CallWaiterButton";
import TableSelector from "@/components/TableSelector";
import { supabaseDiner, ensureDinerSession } from "@/lib/supabase";
import {
  fetchPaymentAccounts,
  fetchTables,
  setOrderTable,
  fetchOrderQueueInfo,
  type QueueInfo,
} from "@/lib/db";
import {
  pushNotification,
  playChime,
  saveDinerNotification,
  ensureNotifyPermission,
  type DinerNotification,
} from "@/lib/notify";
import { orderNumber } from "@/lib/order-number";
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

const num = (v: number | string | undefined): number =>
  v == null ? 0 : Number(v);

// Progression rank so the diner's tracker can show the FURTHEST step reached,
// whether it came from the parent order or an individual station ticket.
const ORDER_RANK: Record<OrderStatus, number> = {
  received: 0,
  preparing: 1,
  ready: 2,
  served: 3,
  cancelled: -1,
};

// Friendly diner-facing copy for each live status change (notification + toast).
const STATUS_ALERTS: Record<string, { title: string; text: string }> = {
  preparing: {
    title: "Skill Coffee",
    text: "🔥 Your order is now being prepared!",
  },
  ready: { title: "Skill Coffee", text: "🔔 Your order is ready for service!" },
  served: {
    title: "Skill Coffee",
    text: "✅ Your order has been served. Enjoy!",
  },
};

// Turn a raw Supabase/Postgres failure from the proof-upload flow into a
// message a guest can actually act on, instead of leaking internals like
// "new row violates row-level security policy" or "order not found".
function friendlyProofError(raw: string): string {
  if (raw === "session_missing") {
    return "We lost your session. Please refresh this page and try again.";
  }
  if (/row-level security|not found|forbidden|P0002/i.test(raw)) {
    return "This order doesn't belong to your current session. Please open the tracking link you received right after ordering, or scan the QR code at your table again.";
  }
  if (/screenshot not uploaded/i.test(raw)) {
    return "Your receipt didn't finish uploading. Please tap Submit again.";
  }
  if (/failed to fetch|networkerror/i.test(raw)) {
    return "Connection problem. Please check your internet and try again.";
  }
  return "Something went wrong while submitting your receipt. Please try again.";
}

function OrderStatusPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const restaurantSlug = (params?.restaurantSlug as string) || "meskel-house";
  const orderId = (params?.orderId as string) || "";

  const queryTable = searchParams?.get("table") || "1";
  const mockTable = queryTable.replace(/^t/, "");
  const menuHref = `/${restaurantSlug}/order?table=${encodeURIComponent(queryTable)}`;

  const [order, setOrder] = useState<OrderRow | null>(null);
  const [orderedItems, setOrderedItems] = useState<OrderedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pickupCode, setPickupCode] = useState<string | null>(null);
  const [showPickupCode, setShowPickupCode] = useState(false);
  const [queueInfo, setQueueInfo] = useState<QueueInfo | null>(null);
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

  const [notifications, setNotifications] = useState<DinerNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const unreadNotifications = notifications.filter((notification) => !notification.read).length;

  useEffect(() => {
    try {
      const saved = localStorage.getItem("dm_order_notifications");
      if (saved) {
        const parsed = JSON.parse(saved) as DinerNotification[];
        if (Array.isArray(parsed)) setNotifications(parsed.slice(0, 20));
      }
    } catch (error) {
      console.error("Could not restore diner notifications", error);
    }

    const handleNotification = (event: Event) => {
      const notification = (event as CustomEvent<DinerNotification>).detail;
      if (!notification?.id) return;
      setNotifications((previous) =>
        previous.some((item) => item.id === notification.id)
          ? previous
          : [notification, ...previous].slice(0, 20),
      );
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== "dm_order_notifications" || !event.newValue) return;
      try {
        const saved = JSON.parse(event.newValue) as DinerNotification[];
        if (Array.isArray(saved)) setNotifications(saved.slice(0, 20));
      } catch (error) {
        console.error("Could not sync diner notifications across tabs", error);
      }
    };
    window.addEventListener("diner-order-notification", handleNotification);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("diner-order-notification", handleNotification);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    const sb = supabaseDiner();
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
    // RLS returns a row only when the current session owns the order. If it
    // comes back empty (e.g. the anonymous session changed), clear the stale
    // order so the guest sees "couldn't find this order" instead of an upload
    // form that can never succeed.
    setOrder((data as OrderRow) ?? null);
    if (!data) return;

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

    // How many orders are ahead + live ETA (order_queue_info RPC).
    const qi = await fetchOrderQueueInfo(orderId);
    setQueueInfo(qi);
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
      const sb = supabaseDiner();
      try {
        await ensureDinerSession();
        const { data: sess } = await sb.auth.getSession();
        const uid = sess.session?.user?.id ?? null;
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
        if (active)
          setLoadError(err instanceof Error ? err.message : String(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [orderId, loadOrder]);

  useEffect(() => {
    if (loading || loadError || order) return;

    // The order was deleted or is no longer accessible; don't keep linking
    // this device back to the same stale order from the menu.
    try {
      const orderKey = `dm_active_order_${restaurantSlug}_${queryTable}`;
      if (localStorage.getItem(orderKey) === orderId) {
        localStorage.removeItem(orderKey);
        localStorage.removeItem(`${orderKey}_dismissed`);
      }
    } catch (error) {
      console.error("Could not clear stale order link", error);
    }
  }, [loading, loadError, order, restaurantSlug, queryTable, orderId]);

  // Live status: subscribe to orders + order_station_tickets for this order.
  useEffect(() => {
    if (!orderId) return;
    const sb = supabaseDiner();
    const channel = sb
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        () => void loadOrder(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_station_tickets",
          filter: `order_id=eq.${orderId}`,
        },
        () => void loadOrder(),
      )
      .subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  }, [orderId, loadOrder]);

  const isTakeaway = String(order?.fulfillment_type ?? "")
    .toLowerCase()
    .includes("take");
  const currentTableLabel =
    tables.find((t) => t.id === order?.table_id)?.label ?? "";

  const paymentSubmitted =
    order?.payment_status === "pending_verification" ||
    (submittedProof &&
      order?.payment_status !== "failed" &&
      order?.payment_status !== "refunded");

  // Order becomes "active" once payment has been submitted, paid, or staff
  // have started it. Persisted payment status survives back-navigation/reload.
  const isActive =
    paymentSubmitted ||
    order?.payment_status === "paid" ||
    (order?.status != null && order.status !== "received");

  // Only the cashier's persisted approval may confirm payment. Uploading proof
  // merely submits it for review and must not advance the tracker.
  const paymentApproved = order?.payment_status === "paid";

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

  const isServed = effectiveStatus === "served";

  // Identify whether the order is food, drink, or both so the tracker uses the
  // right wording (a drink order should not say "Started Cooking").
  const hasKitchen = ticketStations.some((s) => /kitchen/i.test(s));
  const hasBar = ticketStations.some((s) => /bar/i.test(s));
  const orderKind: "food" | "drink" | "mixed" | undefined =
    hasKitchen && hasBar
      ? "mixed"
      : hasBar
        ? "drink"
        : hasKitchen
          ? "food"
          : undefined;

  // Notify the diner the moment their order moves (preparing → ready → served,
  // or payment approval). Skips the very first snapshot after page load.
  const prevStageRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (!order) return;
    const stage = `${paymentApproved ? "paid" : "unpaid"}:${effectiveStatus}`;
    if (prevStageRef.current === null) {
      prevStageRef.current = stage;
      return;
    }
    if (prevStageRef.current === stage) return;
    const previousStage = prevStageRef.current;
    prevStageRef.current = stage;

    let text: string | null = null;
    if (paymentApproved && !previousStage.startsWith("paid:")) {
      text = "💳 Payment confirmed by the cashier.";
    } else if (previousStage.split(":")[1] !== effectiveStatus) {
      text = STATUS_ALERTS[effectiveStatus]?.text ?? null;
    }
    if (text) {
      playChime();
      pushNotification("Skill Coffee", text);
      const notificationKey =
        paymentApproved && !previousStage.startsWith("paid:")
          ? "payment-confirmed"
          : effectiveStatus;
      saveDinerNotification({
        id: `${orderId}:${notificationKey}`,
        text,
        read: false,
        ts: Date.now(),
      });
    }
  }, [order, paymentApproved, effectiveStatus]);

  const handleSubmitProof = async () => {
    if (!uploadedFile || !orderId || !selectedAccountId) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const sb = supabaseDiner();

      // Always build the storage path from the LIVE session uid, never a value
      // captured at page load. Supabase Storage's RLS requires the first path
      // folder to equal auth.uid(); if the anonymous session rotated since mount
      // a stale uid would fail the upload with a raw
      // "new row violates row-level security policy" error.
      await ensureDinerSession();
      const { data: sess } = await sb.auth.getSession();
      const liveUid = sess.session?.user?.id ?? null;
      if (!liveUid) throw new Error("session_missing");
      if (liveUid !== userId) setUserId(liveUid);

      const proofPath = `${liveUid}/${orderId}/proof.png`;
      const { error: upErr } = await sb.storage
        .from("payment-proofs")
        .upload(proofPath, uploadedFile, {
          contentType: uploadedFile.type || "image/png",
          upsert: true,
        });
      if (upErr) throw upErr;

      const { error: rpcErr } = await sb.rpc("attach_payment_proof", {
        p_order: orderId,
        p_account: selectedAccountId,
        p_proof_path: proofPath,
      });
      if (rpcErr) throw rpcErr;

      setSubmittedProof(true);
      await loadOrder();
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      setSubmitError(friendlyProofError(raw));
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
              <h1 className="font-serif font-bold text-sm tracking-wide">
                Skill Coffee
              </h1>
              <p className="text-[10px] text-amber-300 font-mono">
                Order #{orderNumber(orderId)}
              </p>
            </div>
          </div>
          <div className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const opening = !notificationsOpen;
                setNotificationsOpen(opening);
                if (opening) {
                  void ensureNotifyPermission();
                  const read = notifications.map((notification) => ({
                    ...notification,
                    read: true,
                  }));
                  setNotifications(read);
                  try {
                    localStorage.setItem("dm_order_notifications", JSON.stringify(read));
                  } catch (error) {
                    console.error("Could not save read notification state", error);
                  }
                }
              }}
              aria-label="Order notifications"
              className="relative rounded-lg bg-[#3D2415] text-amber-200 border border-[#FAF7F2]/20 p-2 hover:bg-[#FAF7F2]/10"
            >
              <Bell className="h-4 w-4" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </button>
            <Link
              href={menuHref}
              className="text-xs bg-[#3D2415] text-amber-200 border border-[#FAF7F2]/20 px-2.5 py-1.5 rounded-lg hover:bg-[#FAF7F2]/10 transition-colors"
            >
              Menu
            </Link>
            {notificationsOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-[#3D2415] bg-[#2B1810] p-2 text-white shadow-2xl z-50">
                <div className="flex items-center justify-between border-b border-[#3D2415] px-2 py-1.5 text-[11px] font-bold text-amber-200">
                  <span>Order Updates</span>
                  <span className="text-stone-400">{unreadNotifications} unread</span>
                </div>
                <div className="max-h-64 overflow-y-auto py-1">
                  {notifications.length === 0 ? (
                    <p className="px-2 py-4 text-center text-xs text-stone-400">
                      No order updates yet.
                    </p>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`flex gap-2 rounded-xl px-2.5 py-2 ${
                          notification.read ? "" : "bg-amber-900/20"
                        }`}
                      >
                        {notification.read ? (
                          <CheckCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        ) : (
                          <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                        )}
                        <div>
                          <p className="text-[11px]">{notification.text}</p>
                          <p className="mt-0.5 text-[10px] text-stone-400">
                            {new Date(notification.ts).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
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
          <div className="bg-white rounded-2xl p-8 text-center text-sm text-stone-500 border border-stone-200/80 shadow-sm space-y-4">
            <p>
              This order is no longer available. It may have been cleared or
              created on another device.
            </p>
            <Link
              href={menuHref}
              className="inline-flex items-center justify-center rounded-xl bg-[#2B1810] px-5 py-3 font-bold text-amber-200 hover:bg-[#3D2415] transition-colors"
            >
              Return to menu and place a new order
            </Link>
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
                    <p className="text-xs text-stone-500">
                      Order ID: {order.id}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      paymentApproved
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-amber-100 text-amber-800 border border-amber-300"
                    }`}
                  >
                    {paymentApproved ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                      </>
                    ) : paymentSubmitted ? (
                      <>
                        <Clock className="w-3.5 h-3.5" /> Awaiting Verification
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
                      <div
                        key={idx}
                        className="flex justify-between items-center text-sm"
                      >
                        <span className="text-stone-700">
                          <span className="font-semibold text-stone-900">
                            {line.quantity}x
                          </span>{" "}
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
                      <span>Service Fee</span>
                      <span>{serviceFee.toLocaleString()} ETB</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 font-bold text-stone-900">
                      <span>Total Amount</span>
                      <span className="text-base text-[#2B1810]">
                        {total.toLocaleString()} ETB
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* LIVE ORDER TRACKER — always visible so tracking never dumps the
                diner back into the payment form as the headline section. */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200/80 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h3 className="font-serif font-bold text-base text-stone-900">
                  Live Order Tracker
                </h3>
                <div className="flex items-center gap-2">
                  {/* Same number the kitchen/bar/floor screens show for this order. */}
                  <span className="font-mono text-sm font-extrabold text-amber-700 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-lg">
                    #{orderNumber(orderId)}
                  </span>
                  <span className="text-xs text-stone-400">Updates live</span>
                </div>
              </div>

              {effectiveStatus === "cancelled" ? (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    This order was cancelled. Please place a new order from the
                    menu.
                  </span>
                </div>
              ) : (
                <OrderStatusTracker
                  currentStatus={effectiveStatus}
                  paymentConfirmed={paymentApproved}
                  orderKind={orderKind}
                />
              )}

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-stone-700">
                    Kitchen &amp; Bar Station
                  </span>
                </div>
                <span className="text-[11px] text-stone-400">
                  Synced in real-time
                </span>
              </div>
            </div>

            {/* STATE 1: AWAITING PAYMENT / VERIFICATION (secondary, below tracker) */}
            {!isActive && (
              <div className="space-y-6 animate-fadeIn">
                <h3 className="font-serif font-bold text-base text-stone-900">
                  Complete Your Payment
                </h3>
                <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 leading-relaxed">
                    <p className="font-bold mb-0.5">
                      Payment Verification Required
                    </p>
                    Transfer the total of{" "}
                    <strong>{total.toLocaleString()} ETB</strong> using Telebirr
                    or Bank transfer, then upload a screenshot of your
                    confirmation message below.
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
                  <h3 className="text-sm font-bold text-stone-900">
                    Upload Transaction Receipt
                  </h3>
                  <p className="text-xs text-stone-500">
                    Snap or upload a screenshot of your Telebirr / Bank SMS
                    confirmation.
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
                {/* Queue transparency: orders ahead + estimated wait (gone once served) */}
                {!isServed && queueInfo && (
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200/80">
                    <div className="flex items-center justify-around gap-3 text-center">
                      <div>
                        <p className="text-2xl font-serif font-black text-[#2B1810]">
                          {queueInfo.ahead}
                        </p>
                        <p className="text-[11px] text-stone-500 font-semibold">
                          order{queueInfo.ahead === 1 ? "" : "s"} ahead of you
                        </p>
                      </div>
                      <div className="w-px h-10 bg-stone-200" />
                      <div>
                        <p className="text-2xl font-serif font-black text-[#2B1810] flex items-center justify-center gap-1">
                          <Clock className="w-5 h-5 text-amber-600" />
                          {queueInfo.etaMinutes}
                          <span className="text-sm font-bold text-stone-500">
                            min
                          </span>
                        </p>
                        <p className="text-[11px] text-stone-500 font-semibold">
                          estimated wait
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Big 4-Digit Pickup Code Box — auto-removed once the food is served */}
                {!isServed ? (
                  <div className="bg-white border-2 border-dashed border-[#2B1810] rounded-3xl p-6 text-center shadow-md relative overflow-hidden">
                    <div className="absolute -top-12 -right-12 w-28 h-28 bg-amber-100/60 rounded-full blur-xl pointer-events-none" />
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-3 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {paymentApproved
                        ? "Verified & Active"
                        : "Receipt Submitted"}
                    </div>
                    {!paymentApproved && paymentSubmitted && (
                      <p className="mb-2 text-xs font-semibold text-amber-800">
                        Your payment receipt is awaiting cashier verification.
                        You do not need to submit or pay again.
                      </p>
                    )}

                    <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-1">
                      Your 4-Digit Pickup / Verification Code
                    </p>

                    <div className="my-3 py-3 px-6 inline-flex items-center justify-center bg-[#38210F] text-white rounded-2xl shadow-inner border border-[#2B1810] gap-2">
                      <div className="font-mono text-4xl sm:text-5xl font-black tracking-[0.35em] text-amber-400 pl-2">
                        {showPickupCode ? (pickupCode ?? "••••") : "••••"}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPickupCode((v) => !v)}
                        className="rounded-lg border border-amber-500/40 bg-[#2B1810] p-2 text-amber-200 hover:text-white transition-colors"
                        aria-label={
                          showPickupCode
                            ? "Hide pickup code"
                            : "Show pickup code"
                        }
                        title={showPickupCode ? "Hide code" : "Show code"}
                      >
                        {showPickupCode ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <p className="text-xs text-stone-500 max-w-sm mx-auto mt-2">
                      Provide this 4-digit code to your waiter or show it at the
                      pickup station when collecting your food.
                    </p>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border-2 border-emerald-200 rounded-3xl p-6 text-center shadow-sm">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                    <p className="font-serif font-bold text-lg text-emerald-900">
                      Served — enjoy your meal!
                    </p>
                    <p className="text-xs text-emerald-700 mt-1">
                      Your verification code is no longer needed and has been
                      removed.
                    </p>
                  </div>
                )}

                {/* Need Assistance */}
                {!isTakeaway && !isServed && (
                  <div className="text-center pt-2">
                    <p className="text-xs text-stone-500">
                      Need extra water, napkins, or help? Use the bell button to
                      call your waiter.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TABLE SEATING: assign / change table AFTER payment, on the confirmed page */}
            {isActive &&
              order.status !== "served" &&
              order.status !== "cancelled" && (
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-200/80 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#FAF5EC] text-[#2B1810] flex items-center justify-center shrink-0 border border-[#D4B896]">
                        <Armchair className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-stone-900">
                          {isTakeaway
                            ? "Ordering to go?"
                            : `Table ${currentTableLabel || "—"}`}
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
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />{" "}
                          {tableMsg}
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
                            <RefreshCw className="w-4 h-4 animate-spin" />{" "}
                            Saving…
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-amber-400" />{" "}
                            Confirm My Table
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
        <CallWaiterButton
          tableId={order.table_id}
          tableLabel={`Table ${mockTable}`}
        />
      )}
    </div>
  );
}

export default function OrderStatusPage() {
  return (
    <Suspense fallback={null}>
      <OrderStatusPageContent />
    </Suspense>
  );
}
