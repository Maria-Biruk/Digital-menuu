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
  ChevronDown,
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
  syncOrderNumbers,
} from "@/lib/db";
import {
  pushNotification,
  playChime,
  saveDinerNotification,
  ensureNotifyPermission,
  type DinerNotification,
} from "@/lib/notify";
import {
  subscribeToPush,
  isPushSupported,
  getPushPermissionState,
} from "@/lib/push";
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

interface TrackedOrder {
  id: string;
  status: OrderStatus;
  payment_status: string;
  table_id: string | null;
  fulfillment_type: string;
  itemSummary: string;
  items: OrderedItem[];
  subtotal: number;
  serviceFee: number;
  total: number;
  orderKind: "food" | "drink" | "mixed" | undefined;
  pickupCode: string | null;
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
  const [trackedOrders, setTrackedOrders] = useState<TrackedOrder[]>([]);
  const [expandedTrackedOrders, setExpandedTrackedOrders] = useState<string[]>([]);
  const [visibleTrackedPickupCodes, setVisibleTrackedPickupCodes] = useState<string[]>([]);
  const [trackedOrdersLoading, setTrackedOrdersLoading] = useState(true);
  const [trackedOrdersError, setTrackedOrdersError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pickupCode, setPickupCode] = useState<string | null>(null);
  const [showPickupCode, setShowPickupCode] = useState(false);
  const [orderDetailsExpanded, setOrderDetailsExpanded] = useState(false);
  const [ticketStatuses, setTicketStatuses] = useState<string[]>([]);
  const [ticketStations, setTicketStations] = useState<string[]>([]);

  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountLoadError, setAccountLoadError] = useState(false);
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
  const [proofStatusError, setProofStatusError] = useState<string | null>(null);
  const [submittedProof, setSubmittedProof] = useState(false);
  const [hasPersistedProof, setHasPersistedProof] = useState(false);
  const [, setOrderNumberVersion] = useState(0);
  const [orderNumberError, setOrderNumberError] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<DinerNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const unreadNotifications = notifications.filter((notification) => !notification.read).length;

  // Push subscription state for customer
  const [pushSubscribed, setPushSubscribed] = useState(false);

  const loadTrackedOrders = useCallback(async () => {
    setTrackedOrdersLoading(true);
    setTrackedOrdersError(null);
    const sb = supabaseDiner();
    let orderIds: string[] = [];
    try {
      const savedOrders = localStorage.getItem(
        `dm_active_orders_${restaurantSlug}`,
      );
      const tableOrders = localStorage.getItem(
        `dm_active_orders_${restaurantSlug}_${queryTable}`,
      );
      for (const saved of [savedOrders, tableOrders]) {
        if (!saved) continue;
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          orderIds.push(
            ...parsed.filter((id): id is string => typeof id === "string"),
          );
        }
      }
      const lastOrder = localStorage.getItem(
        `dm_active_order_${restaurantSlug}_${queryTable}`,
      );
      if (lastOrder) orderIds.push(lastOrder);
      if (orderId) orderIds.push(orderId);
    } catch (error) {
      console.error("Could not read the customer's saved order list", error);
    }

    orderIds = [...new Set(orderIds)].slice(-50);
    if (!orderIds.length) {
      setTrackedOrders([]);
      setTrackedOrdersLoading(false);
      return;
    }

    const { data: orders, error: ordersError } = await sb
      .from("orders")
      .select("id, status, payment_status, table_id, fulfillment_type, subtotal, service_fee, total, created_at")
      .in("id", orderIds)
      .order("created_at", { ascending: false });
    if (ordersError) {
      console.error("Could not load the customer's order list", ordersError);
      setTrackedOrdersError("Could not load your other orders. Refresh to try again.");
      setTrackedOrdersLoading(false);
      return;
    }

    const visibleOrders = (orders ?? []) as Array<Record<string, any>>;
    const visibleIds = visibleOrders.map((row) => String(row.id));
    if (!visibleIds.length) {
      setTrackedOrders([]);
      setTrackedOrdersError(null);
      setTrackedOrdersLoading(false);
      return;
    }
    const [
      { data: items, error: itemsError },
      { data: payments, error: paymentsError },
      { data: tickets, error: ticketsError },
      { data: secrets, error: secretsError },
    ] =
      await Promise.all([
        sb
          .from("order_items")
          .select("order_id, quantity, unit_price, menu_items(name_i18n)")
          .in("order_id", visibleIds),
        sb
          .from("payments")
          .select("order_id, status")
          .in("order_id", visibleIds)
          .not("proof_image_path", "is", null)
          .in("status", ["pending_verification", "paid"]),
        sb
          .from("order_station_tickets")
          .select("order_id, status, station")
          .in("order_id", visibleIds),
        sb
          .from("order_secrets")
          .select("order_id, pickup_code")
          .in("order_id", visibleIds),
      ]);
    if (itemsError || paymentsError || ticketsError) {
      const error = itemsError ?? paymentsError ?? ticketsError;
      console.error("Could not load tracked order details", error);
      setTrackedOrdersError("Could not load order details. Refresh to try again.");
      setTrackedOrdersLoading(false);
      return;
    }
    if (secretsError) {
      console.error("Could not load tracked order pickup codes", secretsError);
    }

    const itemsByOrder = new Map<string, OrderedItem[]>();
    for (const item of (items ?? []) as Array<Record<string, any>>) {
      const orderItemId = String(item.order_id);
      const name = String(item.menu_items?.name_i18n?.en ?? "Item");
      const lines = itemsByOrder.get(orderItemId) ?? [];
      lines.push({
        name,
        quantity: Number(item.quantity ?? 0),
        unit_price: Number(item.unit_price ?? 0),
      });
      itemsByOrder.set(orderItemId, lines);
    }

    const paymentStatuses = new Map(
      ((payments ?? []) as Array<Record<string, any>>).map((payment) => [
        String(payment.order_id),
        String(payment.status),
      ]),
    );
    const ticketsByOrder = new Map<string, Array<Record<string, any>>>();
    for (const ticket of (tickets ?? []) as Array<Record<string, any>>) {
      const ticketOrderId = String(ticket.order_id);
      const orderTickets = ticketsByOrder.get(ticketOrderId) ?? [];
      orderTickets.push(ticket);
      ticketsByOrder.set(ticketOrderId, orderTickets);
    }
    const pickupCodes = new Map(
      ((secrets ?? []) as Array<Record<string, any>>).map((secret) => [
        String(secret.order_id),
        String(secret.pickup_code ?? ""),
      ]),
    );
    setTrackedOrders(
      visibleOrders.map((row) => {
        const trackedOrderId = String(row.id);
        const orderTickets = ticketsByOrder.get(trackedOrderId) ?? [];
        const ticketStatuses = orderTickets.map((ticket) => String(ticket.status));
        const ticketStations = orderTickets.map((ticket) => String(ticket.station));
        const ticketStatus: OrderStatus = !ticketStatuses.length
          ? "received"
          : ticketStatuses.every((status) => status === "ready")
            ? "ready"
            : ticketStatuses.some(
                  (status) => status === "preparing" || status === "ready",
                )
              ? "preparing"
              : "received";
        const baseStatus = String(row.status ?? "received") as OrderStatus;
        const status =
          baseStatus === "served" || baseStatus === "cancelled"
            ? baseStatus
            : ORDER_RANK[ticketStatus] > ORDER_RANK[baseStatus]
              ? ticketStatus
              : baseStatus;
        const hasKitchen = ticketStations.some((station) => /kitchen/i.test(station));
        const hasBar = ticketStations.some((station) => /bar/i.test(station));
        const orderKind =
          hasKitchen && hasBar
            ? "mixed"
            : hasBar
              ? "drink"
              : hasKitchen
                ? "food"
                : undefined;
        const orderItems = itemsByOrder.get(trackedOrderId) ?? [];
        return {
          id: trackedOrderId,
          status,
          payment_status:
            paymentStatuses.get(trackedOrderId) ?? String(row.payment_status ?? ""),
          table_id: row.table_id ? String(row.table_id) : null,
          fulfillment_type: String(row.fulfillment_type ?? ""),
          items: orderItems,
          itemSummary: orderItems
            .map((item) => `${item.quantity}× ${item.name}`)
            .join(", "),
          subtotal: num(row.subtotal),
          serviceFee: num(row.service_fee),
          total: num(row.total),
          orderKind,
          pickupCode: pickupCodes.get(trackedOrderId) || null,
        };
      }),
    );
    setTrackedOrdersError(null);
    try {
      localStorage.setItem(
        `dm_active_orders_${restaurantSlug}`,
        JSON.stringify(visibleIds),
      );
    } catch (error) {
      console.error("Could not save the customer's recent order list", error);
    }
    try {
      const numberedOrders = await syncOrderNumbers(visibleIds, sb);
      if (numberedOrders === visibleIds.length) {
        setOrderNumberVersion((version) => version + 1);
        setOrderNumberError(null);
      } else {
        setOrderNumberError(
          "Order numbers could not be loaded. Deploy backend/supabase/2026-11-13-order-numbers-and-staff-approval.sql in Supabase, then refresh.",
        );
      }
    } catch (error) {
      console.error("Could not resolve order sequence numbers", error);
      setOrderNumberError(
        "Order numbers are unavailable. Deploy backend/supabase/2026-11-13-order-numbers-and-staff-approval.sql in Supabase, then refresh.",
      );
    }
    setTrackedOrdersLoading(false);
  }, [orderId, queryTable, restaurantSlug]);

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

    try {
      const numberedOrders = await syncOrderNumbers([orderId], sb);
      if (numberedOrders === 1) {
        setOrderNumberVersion((version) => version + 1);
        setOrderNumberError(null);
      } else {
        setOrderNumberError(
          "Order number could not be loaded. Deploy backend/supabase/2026-11-13-order-numbers-and-staff-approval.sql in Supabase, then refresh.",
        );
      }
    } catch (error) {
      console.error("Could not resolve order sequence number", error);
      setOrderNumberError(
        "Order number is unavailable. Deploy backend/supabase/2026-11-13-order-numbers-and-staff-approval.sql in Supabase, then refresh.",
      );
    }

    // Load the order's related data concurrently so the tracker appears
    // without waiting for the queue estimate or each related table in turn.
    const [itemsResult, ticketsResult, paymentResult] = await Promise.all([
      sb
        .from("order_items")
        .select("quantity, unit_price, menu_items(name_i18n)")
        .eq("order_id", orderId),
      sb
        .from("order_station_tickets")
        .select("status, station")
        .eq("order_id", orderId),
      sb
        .from("payments")
        .select("id")
        .eq("order_id", orderId)
        .not("proof_image_path", "is", null)
        .in("status", ["pending_verification", "paid"])
        .limit(1)
        .maybeSingle(),
    ]);

    const detailsError = itemsResult.error ?? ticketsResult.error;
    if (detailsError) {
      const error = detailsError;
      setLoadError(error.message);
      console.error("Could not load order details", error);
      return;
    }
    if (paymentResult.error) {
      console.error("Could not check submitted payment proof", paymentResult.error);
      setProofStatusError("Could not check your receipt status. Refresh this page before submitting again.");
    } else {
      setHasPersistedProof(!!paymentResult.data);
      setProofStatusError(null);
    }

    setOrderedItems(
      ((itemsResult.data ?? []) as Array<Record<string, any>>).map((r) => ({
        name: String(r.menu_items?.name_i18n?.en ?? "Item"),
        quantity: Number(r.quantity ?? 0),
        unit_price: Number(r.unit_price ?? 0),
      })),
    );

    const rows = (ticketsResult.data ?? []) as Array<Record<string, any>>;
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
      const sb = supabaseDiner();
      try {
        await ensureDinerSession();
        const { data: sess } = await sb.auth.getSession();
        const uid = sess.session?.user?.id ?? null;
        if (!active) return;
        setUserId(uid ?? null);

        setLoading(true);
        const trackedOrdersLoad = loadTrackedOrders();
        const orderLoad = loadOrder();
        const secretLoad = sb
            .from("order_secrets")
            .select("pickup_code")
            .eq("order_id", orderId)
            .maybeSingle();

        void fetchPaymentAccounts()
          .then((accs) => {
            if (!active) return;
            setAccounts(accs);
            setSelectedAccountId((prev) => prev || accs[0]?.id || "");
            setAccountLoadError(false);
          })
          .catch((err) => {
            console.error("Failed to load payment accounts", err);
            if (active) setAccountLoadError(true);
          })
          .finally(() => {
            if (active) setAccountsLoading(false);
          });

        void fetchTables()
          .then((tbls) => {
            if (active) setTables(tbls);
          })
          .catch((err) => {
            console.error("Failed to load restaurant tables", err);
          });

        const [_, secretResult] = await Promise.all([orderLoad, secretLoad, trackedOrdersLoad]);
        if (secretResult.error) {
          console.error("Failed to load order pickup code", secretResult.error);
        }
        if (active && secretResult.data?.pickup_code) {
          setPickupCode(secretResult.data.pickup_code);
        }
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
  }, [orderId, loadOrder, loadTrackedOrders]);

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
    hasPersistedProof ||
    (submittedProof &&
      order?.payment_status !== "failed" &&
      order?.payment_status !== "refunded");

  // Only the cashier's persisted approval may confirm payment. Uploading proof
  // merely submits it for review and must not advance the tracker.
  const paymentApproved = order?.payment_status === "paid";

  // Keep the receipt/payment step visible until a receipt is submitted or the
  // cashier approves payment. Kitchen status changes must not skip this step.
  const isActive = paymentSubmitted || paymentApproved;

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
      const notificationKey =
        paymentApproved && !previousStage.startsWith("paid:")
          ? "payment-confirmed"
          : effectiveStatus;
      const isNewNotification = saveDinerNotification({
        id: `${orderId}:${notificationKey}`,
        text: `Order ${displayCurrentOrderNumber} · ${text}`,
        read: false,
        ts: Date.now(),
      });
      if (isNewNotification) {
        playChime();
        pushNotification("Skill Coffee", `Order ${displayCurrentOrderNumber} · ${text}`);
      }
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
      setOrderDetailsExpanded(false);
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
  const orderedQuantity = orderedItems.reduce(
    (count, item) => count + item.quantity,
    0,
  );
  const currentOrderNumber = orderNumber(orderId);
  const displayCurrentOrderNumber =
    currentOrderNumber === "…" ? "number unavailable" : `#${currentOrderNumber}`;
  const otherTrackedOrders = trackedOrders.filter(
    (trackedOrder) => trackedOrder.id !== orderId,
  );

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
                Order {displayCurrentOrderNumber}
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
                  // Also subscribe to browser push (customer flow, user gesture)
                  if (isPushSupported() && getPushPermissionState() !== 'denied' && !pushSubscribed) {
                    void subscribeToPush('customer', { orderId }).then(({ ok }) => {
                      if (ok) setPushSubscribed(true);
                    });
                  }
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
            <section className="space-y-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-serif text-sm font-bold text-stone-900">
                  Other recent orders
                </h2>
                <span className="text-[11px] font-medium text-stone-500">
                  {otherTrackedOrders.length} order{otherTrackedOrders.length === 1 ? "" : "s"}
                </span>
              </div>
              {trackedOrdersError && (
                <p className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {trackedOrdersError}
                </p>
              )}
              {orderNumberError && (
                <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {orderNumberError}
                </p>
              )}
              {trackedOrdersLoading ? (
                <p className="text-xs text-stone-500">Loading your orders…</p>
              ) : otherTrackedOrders.length > 0 ? (
                <div className="space-y-3">
                  {otherTrackedOrders.map((trackedOrder) => {
                    const isPaid = trackedOrder.payment_status === "paid";
                    const isWaitingForVerification =
                      trackedOrder.payment_status === "pending_verification";
                    const statusLabel = isPaid
                      ? trackedOrder.status === "received"
                        ? "Paid"
                        : trackedOrder.status.charAt(0).toUpperCase() +
                          trackedOrder.status.slice(1)
                      : isWaitingForVerification
                        ? "Awaiting verification"
                        : "Awaiting payment";
                    const isTrackedOrderActive = isPaid || isWaitingForVerification;
                    const isTrackedOrderServed = trackedOrder.status === "served";
                    const trackedPaymentLabel = isPaid
                      ? "Confirmed"
                      : isWaitingForVerification
                        ? "Awaiting Verification"
                        : "Awaiting Payment";
                    const isTrackedTakeaway = trackedOrder.fulfillment_type
                      .toLowerCase()
                      .includes("take");
                    const isTrackedOrderExpanded = expandedTrackedOrders.includes(
                      trackedOrder.id,
                    );
                    const trackedOrderNumber = orderNumber(trackedOrder.id);
                    const trackedOrderCode =
                      trackedOrderNumber === "…"
                        ? trackedOrder.id
                        : `#${trackedOrderNumber}`;
                    return (
                      <div
                        key={trackedOrder.id}
                        className="rounded-2xl border border-stone-200/80 bg-white shadow-sm transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3 rounded-t-2xl px-4 py-3">
                          <button
                            type="button"
                            aria-label={`Open details for order ${trackedOrderCode}`}
                            onClick={() => {
                              router.push(
                                `/${restaurantSlug}/order/${trackedOrder.id}?table=${encodeURIComponent(
                                  trackedOrder.table_id ?? queryTable,
                                )}`,
                              );
                            }}
                            className="min-w-0 text-left"
                          >
                            <span className="min-w-0">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-sm font-bold text-stone-900">
                                  Order {trackedOrderCode}
                                </span>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                    isPaid
                                      ? "bg-emerald-100 text-emerald-800"
                                      : isWaitingForVerification
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-stone-200 text-stone-700"
                                  }`}
                                >
                                  {statusLabel}
                                </span>
                              </span>
                              <span className="mt-1 block truncate text-xs text-stone-500">
                                {trackedOrder.itemSummary || "Items unavailable"}
                              </span>
                            </span>
                          </button>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedTrackedOrders((expanded) =>
                                  isTrackedOrderExpanded
                                    ? expanded.filter((id) => id !== trackedOrder.id)
                                    : [...expanded, trackedOrder.id],
                                )
                              }
                              aria-label={`${isTrackedOrderExpanded ? "Hide" : "Show"} details for order ${
                                trackedOrderCode
                              }`}
                              aria-expanded={isTrackedOrderExpanded}
                              className="rounded-full p-1 text-stone-500 transition-colors hover:bg-white hover:text-stone-900"
                            >
                              <ChevronDown
                                className={`h-5 w-5 transition-transform ${
                                  isTrackedOrderExpanded ? "rotate-180" : ""
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                        {isTrackedOrderExpanded && (
                          <div className="space-y-4 border-t border-stone-200/80 px-3 py-3">
                            <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm">
                              <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-3">
                                <div className="flex min-w-0 items-center gap-3">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2B1810] text-amber-400">
                                    {isTrackedTakeaway ? (
                                      <ShoppingBag className="h-5 w-5" />
                                    ) : (
                                      <UtensilsCrossed className="h-5 w-5" />
                                    )}
                                  </div>
                                  <p className="min-w-0 break-all text-xs text-stone-500">
                                    Order ID: {trackedOrder.id}
                                  </p>
                                </div>
                                <span
                                  className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                                    isPaid
                                      ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                                      : isWaitingForVerification
                                        ? "border-amber-300 bg-amber-100 text-amber-800"
                                        : "border-stone-300 bg-stone-100 text-stone-700"
                                  }`}
                                >
                                  {isPaid ? (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  ) : (
                                    <Clock className="h-3.5 w-3.5" />
                                  )}
                                  {trackedPaymentLabel}
                                </span>
                              </div>
                              {trackedOrder.items.length > 0 ? (
                                <div className="space-y-2 pt-4">
                                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                                    Ordered Items
                                  </p>
                                  {trackedOrder.items.map((item, index) => (
                                    <div
                                      key={`${trackedOrder.id}-${index}`}
                                      className="flex items-center justify-between gap-3 text-sm"
                                    >
                                      <span className="text-stone-700">
                                        <span className="font-semibold text-stone-900">
                                          {item.quantity}x
                                        </span>{" "}
                                        {item.name}
                                      </span>
                                      <span className="shrink-0 font-medium text-stone-900">
                                        {(item.unit_price * item.quantity).toLocaleString()} ETB
                                      </span>
                                    </div>
                                  ))}
                                  <div className="space-y-1 border-t border-dashed border-stone-200 pt-3 text-sm">
                                    <div className="flex justify-between text-xs text-stone-500">
                                      <span>Subtotal</span>
                                      <span>{trackedOrder.subtotal.toLocaleString()} ETB</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-stone-500">
                                      <span>Service Fee</span>
                                      <span>{trackedOrder.serviceFee.toLocaleString()} ETB</span>
                                    </div>
                                    <div className="flex items-center justify-between pt-1 font-bold text-stone-900">
                                      <span>Total Amount</span>
                                      <span className="text-base text-[#2B1810]">
                                        {trackedOrder.total.toLocaleString()} ETB
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <p className="pt-4 text-xs text-stone-500">
                                  Order items are unavailable.
                                </p>
                              )}
                            </div>
                            {isTrackedOrderActive && (
                              <div className="space-y-4">
                                <div className="space-y-4 rounded-3xl border border-stone-200/80 bg-white p-5 shadow-sm">
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                                    <h3 className="font-serif text-base font-bold text-stone-900">
                                      Live Order Tracker
                                    </h3>
                                    <span className="font-mono text-xs font-extrabold text-amber-700">
                                      {trackedOrderNumber === "…"
                                        ? "number unavailable"
                                        : `#${trackedOrderNumber}`}
                                    </span>
                                  </div>
                                  {trackedOrder.status === "cancelled" ? (
                                    <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
                                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                      <span>This order was cancelled.</span>
                                    </div>
                                  ) : (
                                    <OrderStatusTracker
                                      currentStatus={trackedOrder.status}
                                      paymentConfirmed={isPaid}
                                      orderKind={trackedOrder.orderKind}
                                    />
                                  )}
                                  <div className="flex items-center justify-between border-t border-stone-100 pt-3 text-xs text-stone-500">
                                    <div className="flex items-center gap-1.5">
                                      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                                      <span className="font-semibold text-stone-700">
                                        Kitchen &amp; Bar Station
                                      </span>
                                    </div>
                                    <span className="text-[11px] text-stone-400">
                                      Synced in real-time
                                    </span>
                                  </div>
                                </div>
                                {isTrackedOrderServed ? (
                                  <div className="rounded-3xl border-2 border-emerald-200 bg-emerald-50 p-6 text-center shadow-sm">
                                    <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-emerald-600" />
                                    <p className="font-serif text-lg font-bold text-emerald-900">
                                      Served — enjoy your meal!
                                    </p>
                                    <p className="mt-1 text-xs text-emerald-700">
                                      Your verification code is no longer needed.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="relative overflow-hidden rounded-3xl border-2 border-dashed border-[#2B1810] bg-white p-6 text-center shadow-md">
                                    <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      {isPaid ? "Verified & Active" : "Receipt Submitted"}
                                    </div>
                                    {!isPaid && (
                                      <p className="mb-2 text-xs font-semibold text-amber-800">
                                        Your payment receipt is awaiting cashier verification. You do not need to submit or pay again.
                                      </p>
                                    )}
                                    <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-stone-500">
                                      Your 4-Digit Pickup / Verification Code
                                    </p>
                                    <div className="my-3 inline-flex items-center justify-center gap-2 rounded-2xl border border-[#2B1810] bg-[#38210F] px-6 py-3 text-amber-400 shadow-inner">
                                      <span className="pl-2 font-mono text-4xl font-black tracking-[0.35em]">
                                        {visibleTrackedPickupCodes.includes(trackedOrder.id)
                                          ? trackedOrder.pickupCode ?? "••••"
                                          : "••••"}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setVisibleTrackedPickupCodes((visible) =>
                                            visible.includes(trackedOrder.id)
                                              ? visible.filter((id) => id !== trackedOrder.id)
                                              : [...visible, trackedOrder.id],
                                          )
                                        }
                                        className="rounded-lg border border-amber-500/40 bg-[#2B1810] p-2 text-amber-200 transition-colors hover:text-white"
                                        aria-label={
                                          visibleTrackedPickupCodes.includes(trackedOrder.id)
                                            ? "Hide pickup code"
                                            : "Show pickup code"
                                        }
                                      >
                                        {visibleTrackedPickupCodes.includes(trackedOrder.id) ? (
                                          <EyeOff className="h-4 w-4" />
                                        ) : (
                                          <Eye className="h-4 w-4" />
                                        )}
                                      </button>
                                    </div>
                                    <p className="mx-auto mt-2 max-w-sm text-xs text-stone-500">
                                      Provide this 4-digit code to your waiter or show it at the pickup station when collecting your food.
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-stone-500">
                  No other recent orders were found.
                </p>
              )}
            </section>

            <button
              type="button"
              onClick={() => setOrderDetailsExpanded((expanded) => !expanded)}
              aria-expanded={orderDetailsExpanded}
              className="w-full rounded-2xl border border-stone-200/80 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:bg-stone-50"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="font-serif text-sm font-bold text-stone-900">
                      Order {displayCurrentOrderNumber}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                        paymentApproved
                          ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                          : paymentSubmitted
                            ? "border-amber-300 bg-amber-100 text-amber-800"
                            : "border-stone-300 bg-stone-100 text-stone-700"
                      }`}
                    >
                      {paymentApproved
                        ? "Paid"
                        : paymentSubmitted
                          ? "Awaiting verification"
                          : "Awaiting payment"}
                    </span>
                  </span>
                  <span className="mt-1 block truncate text-xs text-stone-500">
                    {orderedItems.length
                      ? `${orderedQuantity} item${orderedQuantity === 1 ? "" : "s"} · ${orderedItems
                          .map((item) => `${item.quantity}× ${item.name}`)
                          .join(", ")}`
                      : "Order details"}
                  </span>
                </span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-stone-500 transition-transform ${
                    orderDetailsExpanded ? "rotate-180" : ""
                  }`}
                />
              </span>
            </button>

            {orderDetailsExpanded && (
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

            {/* Show progress only after the diner submits proof or payment is approved. */}
            {isActive && (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200/80 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h3 className="font-serif font-bold text-base text-stone-900">
                  Live Order Tracker
                </h3>
                <div className="flex items-center gap-2">
                  {/* Same number the kitchen/bar/floor screens show for this order. */}
                  <span className="font-mono text-sm font-extrabold text-amber-700 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-lg">
                    {displayCurrentOrderNumber}
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

              {/* Customer push-notification subscribe button — shown when order is active and not yet served */}
              {effectiveStatus !== "cancelled" && effectiveStatus !== "served" &&
                typeof window !== "undefined" && isPushSupported() &&
                getPushPermissionState() !== "denied" && (
                <button
                  type="button"
                  onClick={() => {
                    void subscribeToPush('customer', { orderId }).then(({ ok }) => {
                      if (ok) setPushSubscribed(true);
                    });
                  }}
                  disabled={pushSubscribed}
                  className={`w-full mt-2 flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-all ${
                    pushSubscribed
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700 cursor-default"
                      : "border-amber-500/40 bg-[#2B1810] text-amber-200 hover:bg-[#3D2415]"
                  }`}
                >
                  <Bell className="w-3.5 h-3.5 shrink-0" />
                  {pushSubscribed
                    ? "Push notifications on ✓"
                    : "Notify me when my order is ready"}
                </button>
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
            )}
              </>
            )}

            {/* STATE 1: AWAITING PAYMENT / VERIFICATION */}
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
                  {accountsLoading ? (
                    <p className="text-xs text-stone-500">Loading payment accounts…</p>
                  ) : accounts.length > 0 ? (
                    <PaymentAccountPicker
                      accounts={accounts}
                      selectedAccountId={selectedAccountId}
                      onSelect={(account) => setSelectedAccountId(account.id)}
                    />
                  ) : (
                    <p className="text-xs text-rose-700">
                      {accountLoadError
                        ? "Could not load payment accounts. Refresh this page or ask staff for help."
                        : "No payment accounts are available right now. Please ask staff for help."}
                    </p>
                  )}
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

                {proofStatusError && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{proofStatusError}</span>
                  </div>
                )}

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
                  disabled={isSubmitting || !uploadedFile || !selectedAccountId || !!proofStatusError}
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
            {isActive && orderDetailsExpanded && (
              <div className="space-y-6 animate-fadeIn">
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
