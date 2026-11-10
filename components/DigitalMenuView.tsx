"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Utensils,
  Plus,
  Minus,
  ShoppingBag,
  X,
  Search,
  ArrowRight,
  ArrowDown,
  Clock,
  Flame,
  Star,
  Check,
  Sparkles,
  Moon,
  Sun,
  Coffee,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  UtensilsCrossed,
  ListChecks,
  Bell,
  CheckCheck,
} from "lucide-react";
import {
  Lang,
  ServiceMode,
  MenuItem,
  FulfillmentType,
  Category,
  Table,
} from "../lib/types";
import { SLUG, tI18n } from "../lib/mock";
import { fetchCatalog, fetchTables } from "../lib/db";
import { supabaseDiner, ensureDinerSession } from "../lib/supabase";
import {
  ensureNotifyPermission,
  playChime,
  pushNotification,
  saveDinerNotification,
  type DinerNotification,
} from "../lib/notify";
import LanguageSwitcher from "./LanguageSwitcher";
import CallWaiterButton from "./CallWaiterButton";
import Cart, { CartLine } from "./Cart";
import { handleImgError } from "../lib/img";
import TogetherOrSeparatePrompt from "./TogetherOrSeparatePrompt";
import ArrivalTablePrompt from "./ArrivalTablePrompt";

interface DigitalMenuViewProps {
  tableId?: string;
  slug?: string;
  initialLang?: Lang;
  /**
   * True when the diner opened the menu via a direct link (no QR table id).
   * Prompts them to pick their table on arrival so orders route correctly.
   */
  askTableOnArrival?: boolean;
}

export default function DigitalMenuView({
  tableId = "t1",
  slug = SLUG,
  initialLang = "en",
  askTableOnArrival = false,
}: DigitalMenuViewProps) {
  const router = useRouter();

  // Language & Theme State
  const [lang, setLang] = useState<Lang>(initialLang);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Search & Filter State
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Cart State
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [serviceMode, setServiceMode] = useState<ServiceMode>("together");
  const [addedItemNotification, setAddedItemNotification] = useState<
    string | null
  >(null);

  // Persisted order tracking (survives reload / back-navigation).
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [cartHydrated, setCartHydrated] = useState(false);
  const [isActiveBannerDismissed, setIsActiveBannerDismissed] = useState(false);

  // Detail Modal State
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null);
  const [modalQty, setModalQty] = useState(1);
  const [modalInstructions, setModalInstructions] = useState("");
  const [modalFulfillment, setModalFulfillment] =
    useState<FulfillmentType>("takeaway");
  const [modalPhone, setModalPhone] = useState("");

  // ── Customer notification bell ──────────────────────────────────────────────
  // Shows an Instagram/Telegram-style popup when the diner's order status
  // changes. Tracks status via Supabase realtime while the diner browses.
  const [dinerNotifs, setDinerNotifs] = useState<DinerNotification[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [livePopup, setLivePopup] = useState<string | null>(null);
  const livePopupTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const prevOrderStatus = useRef<string | null>(null);
  const prevPaymentStatus = useRef<string | null>(null);
  const notifiedOrderUpdates = useRef(new Set<string>());
  const bellRef = useRef<HTMLDivElement>(null);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const unreadCount = dinerNotifs.filter((n) => !n.read).length;

  const STATUS_LABEL: Record<string, string> = {
    preparing: "🔥 Your order is being prepared!",
    ready: "🔔 Your order is ready for delivery!",
    served: "✅ Your order has been served. Enjoy!",
  };

  // Subscribe to order and station-ticket changes so the diner gets notified
  // while browsing the menu without navigating to the tracker page.
  useEffect(() => {
    if (!activeOrderId) return;
    const sb = supabaseDiner();
    prevOrderStatus.current = null;
    notifiedOrderUpdates.current.clear();

    const notify = (key: string, text: string) => {
      const notificationKey = `${activeOrderId}:${key}`;
      if (notifiedOrderUpdates.current.has(notificationKey)) return;
      notifiedOrderUpdates.current.add(notificationKey);
      const notif: DinerNotification = {
        id: `${activeOrderId}:${key}`,
        text,
        read: false,
        ts: Date.now(),
      };
      saveDinerNotification(notif);
      setDinerNotifs((prev) =>
        prev.some((item) => item.id === notif.id)
          ? prev
          : [notif, ...prev].slice(0, 20),
      );
      setLivePopup(text);
      playChime();
      pushNotification("Skill Coffee", text);
      clearTimeout(livePopupTimer.current);
      livePopupTimer.current = setTimeout(() => setLivePopup(null), 6000);
    };

    let active = true;
    let refreshing = false;
    let previousTickets: Map<string, string> | null = null;
    prevOrderStatus.current = null;
    prevPaymentStatus.current = null;

    const refreshOrderStatus = async () => {
      if (refreshing) return;
      refreshing = true;
      try {
        const [{ data: order, error: orderError }, { data: tickets, error: ticketsError }] =
          await Promise.all([
            sb
              .from("orders")
              .select("status, payment_status")
              .eq("id", activeOrderId)
              .maybeSingle(),
            sb
              .from("order_station_tickets")
              .select("id, status")
              .eq("order_id", activeOrderId),
          ]);

        if (orderError) {
          console.error("Failed to refresh diner order notifications", orderError);
          return;
        }
        if (ticketsError) {
          console.error("Failed to refresh diner ticket notifications", ticketsError);
          return;
        }
        if (!active || !order) return;

        const orderStatus = String(order.status ?? "");
        if (prevOrderStatus.current === null) {
          prevOrderStatus.current = orderStatus;
        } else if (orderStatus !== prevOrderStatus.current) {
          prevOrderStatus.current = orderStatus;
          const label = STATUS_LABEL[orderStatus];
          if (label) notify(orderStatus, label);
        }

        const paymentStatus = String(order.payment_status ?? "");
        if (prevPaymentStatus.current === null) {
          prevPaymentStatus.current = paymentStatus;
        } else if (
          paymentStatus === "paid" &&
          prevPaymentStatus.current !== "paid"
        ) {
          notify("payment-confirmed", "💳 Payment confirmed by the cashier.");
          prevPaymentStatus.current = paymentStatus;
        } else {
          prevPaymentStatus.current = paymentStatus;
        }

        const currentTickets = new Map(
          (tickets ?? []).map((ticket) => [
            String(ticket.id),
            String(ticket.status ?? ""),
          ]),
        );
        if (previousTickets !== null) {
          const oldStatuses = [...previousTickets.values()];
          const newStatuses = [...currentTickets.values()];
          const changedStatuses = [...currentTickets.entries()]
            .filter(([id, status]) => previousTickets?.get(id) !== status)
            .map(([, status]) => status);
          if (changedStatuses.includes("queued")) {
            notify("sent-to-kitchen", "📨 Your order has been sent to the kitchen.");
          } else if (changedStatuses.includes("preparing")) {
            notify("preparing", STATUS_LABEL.preparing);
          }

          if (
            newStatuses.length > 0 &&
            newStatuses.every((status) => status === "ready") &&
            !(
              oldStatuses.length > 0 &&
              oldStatuses.every((status) => status === "ready")
            )
          ) {
            notify("ready", STATUS_LABEL.ready);
          }
        }
        previousTickets = currentTickets;
      } catch (error) {
        console.error("Could not check diner order notification updates", error);
      } finally {
        refreshing = false;
      }
    };

    const channel = sb
      .channel(`diner-menu-order-${activeOrderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `id=eq.${activeOrderId}`,
        },
        () => void refreshOrderStatus(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_station_tickets",
          filter: `order_id=eq.${activeOrderId}`,
        },
        () => void refreshOrderStatus(),
      )
      .subscribe();
    void refreshOrderStatus();
    const pollId = window.setInterval(() => {
      void refreshOrderStatus();
    }, 5000);

    return () => {
      active = false;
      window.clearInterval(pollId);
      clearTimeout(livePopupTimer.current);
      void sb.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrderId]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("dm_order_notifications");
      if (saved) {
        const parsed = JSON.parse(saved) as DinerNotification[];
        if (Array.isArray(parsed)) setDinerNotifs(parsed.slice(0, 20));
      }
    } catch (error) {
      console.error("Could not restore diner notifications", error);
    } finally {
      setNotificationsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!notificationsLoaded) return;
    try {
      localStorage.setItem("dm_order_notifications", JSON.stringify(dinerNotifs));
    } catch (error) {
      console.error("Could not save diner notifications", error);
    }
  }, [dinerNotifs, notificationsLoaded]);

  useEffect(() => {
    const handleNotification = (event: Event) => {
      const notification = (
        event as CustomEvent<DinerNotification>
      ).detail;
      if (!notification?.id) return;
      setDinerNotifs((previous) =>
        previous.some((item) => item.id === notification.id)
          ? previous
          : [notification, ...previous].slice(0, 20),
      );
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== "dm_order_notifications" || !event.newValue) return;
      try {
        const notifications = JSON.parse(event.newValue) as DinerNotification[];
        if (Array.isArray(notifications)) {
          setDinerNotifs(notifications.slice(0, 20));
        }
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

  // Close bell dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Order helpers + footer CTA actions (real tel:/mailto: links).

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (
      savedTheme === "dark" ||
      (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Theme toggle handler
  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDarkMode(true);
    }
  };

  // Real catalog loaded from Supabase (lib/db.fetchCatalog)
  const [MENU, setMenu] = useState<MenuItem[]>([]);
  const [CATEGORIES, setCategories] = useState<Category[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);

  // Dine-in table resolution. QR links carry a real table id; direct links
  // arrive with a placeholder and must ask the guest which table they're at.
  const [chosenTableId, setChosenTableId] = useState<string | null>(null);
  const [showArrivalPrompt, setShowArrivalPrompt] = useState(askTableOnArrival);
  const chosenTable = tables.find((t) => t.id === chosenTableId) ?? null;
  // Effective table id used everywhere a real restaurant_tables id is needed.
  const effTableId = chosenTableId ?? tableId;
  const dineInTableId = chosenTable?.id ?? tables[0]?.id ?? null;

  // Table label resolution (uses the chosen table's real label when known)
  const tableDisplay =
    effTableId === "takeaway"
      ? "Takeaway Order"
      : chosenTable?.label != null
        ? `Table ${chosenTable.label}`
        : `Table ${String(effTableId).toUpperCase()}`;

  useEffect(() => {
    let active = true;
    void fetchCatalog()
      .then(({ categories, menu }) => {
        if (!active) return;
        setCategories(categories);
        setMenu(menu);
      })
      .catch((err) => {
        if (active)
          setCatalogError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });

    void fetchTables()
      .then((tbls) => {
        if (active) setTables(tbls);
      })
      .catch((err) => {
        if (active) console.error("Failed to load restaurant tables", err);
      });

    return () => {
      active = false;
    };
  }, []);

  // Resolve the dine-in table once the list is loaded.
  //  • QR link: tableId is already a real restaurant_tables id → adopt it.
  //  • Direct link: honor a previous pick, otherwise the arrival prompt stays
  //    open until the guest chooses a table.
  useEffect(() => {
    if (!tables.length) return;
    if (!askTableOnArrival) {
      if (tables.some((t) => t.id === tableId)) setChosenTableId(tableId);
      return;
    }
    try {
      const saved = sessionStorage.getItem(`dm_table_${slug}`);
      if (saved && tables.some((t) => t.id === saved)) {
        setChosenTableId(saved);
        setShowArrivalPrompt(false);
      }
    } catch {
      /* storage unavailable */
    }
  }, [tables, askTableOnArrival, tableId, slug]);

  const pickArrivalTable = (id: string) => {
    setChosenTableId(id);
    setShowArrivalPrompt(false);
    try {
      sessionStorage.setItem(`dm_table_${slug}`, id);
    } catch {
      /* storage unavailable */
    }
  };

  // Persist the cart and the last-placed order per table, so a page reload or
  // navigating back never loses the diner's basket or their order-status link.
  const cartKey = `dm_cart_${slug}_${effTableId}`;
  const orderKey = `dm_active_order_${slug}_${effTableId}`;

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(cartKey);
      if (savedCart) setCartLines(JSON.parse(savedCart));
      const savedOrder = localStorage.getItem(orderKey);
      if (savedOrder) setActiveOrderId(savedOrder);
      const isDismissed = localStorage.getItem(`${orderKey}_dismissed`) === "1";
      setIsActiveBannerDismissed(isDismissed);
    } catch {
      /* ignore malformed storage */
    }
    setCartHydrated(true);
  }, [cartKey, orderKey]);

  useEffect(() => {
    if (!activeOrderId) setIsActiveBannerDismissed(false);
  }, [activeOrderId]);

  useEffect(() => {
    if (!cartHydrated) return;
    try {
      if (cartLines.length)
        localStorage.setItem(cartKey, JSON.stringify(cartLines));
      else localStorage.removeItem(cartKey);
    } catch {
      /* storage unavailable */
    }
  }, [cartLines, cartKey, cartHydrated]);

  const catIdBySlug = useMemo(() => {
    const map: Record<string, string> = {};
    CATEGORIES.forEach((c) => {
      map[c.slug] = c.id;
    });
    return map;
  }, [CATEGORIES]);

  // Filter menu items
  const filteredItems = useMemo(() => {
    return MENU.filter((item) => {
      if (!item.is_available) return false;
      const matchCat =
        activeCategory === "all" || item.category_id === activeCategory;
      const matchSearch =
        !searchQuery.trim() ||
        tI18n(item.name_i18n, lang)
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        tI18n(item.description_i18n, lang)
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (item.ingredients &&
          item.ingredients.some((ing) =>
            ing.toLowerCase().includes(searchQuery.toLowerCase()),
          ));
      return matchCat && matchSearch;
    });
  }, [MENU, activeCategory, searchQuery, lang]);

  // Cart operations
  const addToCart = (
    itemId: string,
    qty: number = 1,
    instructions?: string,
  ) => {
    setCartLines((prev) => {
      const existing = prev.find((l) => l.itemId === itemId);
      if (existing) {
        return prev.map((l) =>
          l.itemId === itemId
            ? {
                ...l,
                qty: l.qty + qty,
                instructions: instructions || l.instructions,
              }
            : l,
        );
      }
      return [...prev, { itemId, qty, instructions }];
    });

    const item = MENU.find((m) => m.id === itemId);
    if (item) {
      setAddedItemNotification(`${qty}x ${tI18n(item.name_i18n, lang)}`);
      setTimeout(() => setAddedItemNotification(null), 2500);
    }
  };

  const updateQty = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      setCartLines((prev) => prev.filter((l) => l.itemId !== itemId));
    } else {
      setCartLines((prev) =>
        prev.map((l) => (l.itemId === itemId ? { ...l, qty: newQty } : l)),
      );
    }
  };

  const removeItem = (itemId: string) => {
    setCartLines((prev) => prev.filter((l) => l.itemId !== itemId));
  };

  const totalCartCount = cartLines.reduce((sum, l) => sum + l.qty, 0);

  const cartItems = cartLines
    .map((l) => {
      const it = MENU.find((m) => m.id === l.itemId);
      return it ? { ...l, item: it } : null;
    })
    .filter(Boolean) as {
    itemId: string;
    qty: number;
    instructions?: string;
    item: MenuItem;
  }[];

  const subtotal = cartItems.reduce(
    (s, cur) => s + cur.item.price * cur.qty,
    0,
  );
  const grandTotal = subtotal + (cartLines.length > 0 ? 25 : 0);

  const hasFood = cartItems.some((ci) => ci.item.station === "kitchen");
  const hasDrink = cartItems.some((ci) => ci.item.station === "bar");

  const handlePlaceOrder = async () => {
    if (cartLines.length === 0 || placing) return;
    setPlacing(true);
    setPlaceError(null);
    try {
      await ensureDinerSession();
      const isTakeawayOrder = effTableId === "takeaway";
      if (!isTakeawayOrder && !dineInTableId)
        throw new Error("No table available for dine-in");
      const p_items = cartItems.map((ci) => ({
        menu_item_id: ci.itemId,
        quantity: ci.qty,
      }));
      const notesList = cartItems
        .filter((ci) => ci.instructions && ci.instructions.trim())
        .map(
          (ci) =>
            `${tI18n(ci.item.name_i18n, "en")} x${ci.qty}: ${ci.instructions!.trim()}`,
        );
      const p_service_mode =
        hasFood && hasDrink
          ? serviceMode === "separate"
            ? "separate"
            : "together"
          : "not_applicable";

      const { data, error } = await supabaseDiner().rpc("create_order", {
        p_fulfillment: isTakeawayOrder ? "takeaway" : "dine_in",
        p_table_id: isTakeawayOrder ? null : dineInTableId,
        p_phone: null,
        p_items,
        p_service_mode,
        p_notes: notesList.join("\n") || null,
      });
      if (error) throw new Error(error.message);
      const newOrderId = (data as { order_id?: string } | null)?.order_id;
      if (!newOrderId) throw new Error("Order created but no id returned");
      try {
        localStorage.setItem(orderKey, newOrderId);
        localStorage.removeItem(cartKey);
        localStorage.removeItem(`${orderKey}_dismissed`);
      } catch {
        /* storage unavailable */
      }
      setActiveOrderId(newOrderId);
      setIsActiveBannerDismissed(false);
      setCartLines([]);
      router.push(
        `/${slug}/order/${newOrderId}?table=${effTableId}&lang=${lang}`,
      );
    } catch (err) {
      setPlaceError(err instanceof Error ? err.message : String(err));
      setPlacing(false);
    }
  };

  // Dish Detail click handler
  const openDishDetail = (dish: MenuItem) => {
    setSelectedDish(dish);
    setModalQty(1);
    setModalInstructions("");
    setModalFulfillment("takeaway");
    setModalPhone("");
  };

  // Direct Order click handler (Orders immediately, not Add to Basket)
  const handleDirectOrder = async (dish: MenuItem) => {
    if (placing) return;
    setPlacing(true);
    setPlaceError(null);
    try {
      await ensureDinerSession();
      const isTakeawayOrder =
        modalFulfillment === "takeaway" || effTableId === "takeaway";
      if (!isTakeawayOrder && !dineInTableId)
        throw new Error("No table available for dine-in");
      const { data, error } = await supabaseDiner().rpc("create_order", {
        p_fulfillment: isTakeawayOrder ? "takeaway" : "dine_in",
        p_table_id: isTakeawayOrder ? null : dineInTableId,
        p_phone: modalPhone.trim() || null,
        p_items: [{ menu_item_id: dish.id, quantity: modalQty }],
        p_service_mode: "not_applicable",
        p_notes: modalInstructions.trim() || null,
      });
      if (error) throw new Error(error.message);
      const newOrderId = (data as { order_id?: string } | null)?.order_id;
      if (!newOrderId) throw new Error("Order created but no id returned");
      try {
        localStorage.setItem(orderKey, newOrderId);
        localStorage.removeItem(`${orderKey}_dismissed`);
      } catch {
        /* storage unavailable */
      }
      setActiveOrderId(newOrderId);
      setIsActiveBannerDismissed(false);
      setSelectedDish(null);
      const cleanPhone = encodeURIComponent(modalPhone.trim() || "");
      router.push(
        `/${slug}/order/${newOrderId}?table=${isTakeawayOrder ? "takeaway" : effTableId}&lang=${lang}&phone=${cleanPhone}`,
      );
    } catch (err) {
      setPlaceError(err instanceof Error ? err.message : String(err));
      setPlacing(false);
    }
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 font-sans selection:bg-amber-400 selection:text-black ${
        isDarkMode
          ? "app-bg-dark text-[#f5ebd9]"
          : "app-bg-light text-[#2B1810]"
      }`}
    >
      {/* Arrival table prompt (direct-link diners who skipped the QR) */}
      <ArrivalTablePrompt
        open={showArrivalPrompt && !chosenTableId}
        tables={tables}
        lang={lang}
        onPick={pickArrivalTable}
        onSkip={() => setShowArrivalPrompt(false)}
      />

      {/* Toast Notification — item added to cart */}
      {addedItemNotification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="px-5 py-3 rounded-full bg-[#2B1810] dark:bg-[#3d2417] text-white text-xs font-bold shadow-2xl flex items-center gap-2.5 border border-amber-500/40">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>Added {addedItemNotification} to order</span>
          </div>
        </div>
      )}

      {/* Live order status popup — Instagram/Telegram style slide-in */}
      {livePopup && (
        <div className="fixed top-20 right-4 z-[60] max-w-xs w-[calc(100vw-2rem)] animate-fadeIn">
          <div className={`p-4 rounded-2xl shadow-2xl border flex items-start gap-3 ${isDarkMode ? "bg-[#2B1810] border-amber-500/40" : "bg-white border-amber-300/60 shadow-amber-100"}`}>
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-400/30 flex items-center justify-center shrink-0">
              <Bell size={16} className="animate-bounce" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-[11px] font-extrabold text-amber-700 dark:text-amber-300 uppercase tracking-widest mb-0.5">Order Update</p>
              <p className="text-xs font-semibold text-stone-800 dark:text-stone-100 leading-snug">{livePopup}</p>
            </div>
            <button
              type="button"
              onClick={() => { clearTimeout(livePopupTimer.current); setLivePopup(null); }}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-white transition-colors shrink-0"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* TOP HEADER / APP BAR */}
      <header
        className={`sticky top-0 z-30 transition-colors duration-300 backdrop-blur-xl border-b py-3 px-4 sm:px-8 ${
          isDarkMode
            ? "bg-[#3A241A]/90 border-[#382015] shadow-lg shadow-black/40"
            : "bg-[#FAF5EC]/95 border-[#D4B896] shadow-sm shadow-amber-900/10"
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#FAF7F2] flex items-center justify-center shadow-md overflow-hidden border border-[#2B1810]/20 shrink-0 p-1">
              <img
                src="/skill-coffee-icon.png"
                alt="Skill Coffee"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="font-serif font-bold text-base sm:text-lg tracking-tight leading-tight text-[#2B1810] dark:text-[#f8ede1]">
                Skill Coffee
              </h1>
              <p className="text-[10px] sm:text-xs text-stone-500 dark:text-[#bda490] font-medium hidden sm:block">
                Specialty Roasters & Fine Dining
              </p>
            </div>
          </div>

          {/* Quick Nav / Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={
                isDarkMode ? "Switch to light mode" : "Switch to dark mode"
              }
              title={
                isDarkMode ? "Switch to light mode" : "Switch to dark mode"
              }
              className={`p-2 rounded-full border text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                isDarkMode
                  ? "bg-[#2b1810] border-[#4a2b1c] text-amber-300 hover:bg-[#3A241A]"
                  : "bg-stone-100 border-stone-200 text-neutral-700 hover:bg-stone-200"
              }`}
            >
              {isDarkMode ? (
                <Sun size={15} className="text-amber-400 animate-spin-slow" />
              ) : (
                <Moon size={15} className="text-stone-700" />
              )}
            </button>

            {/* Language Switcher */}
            <LanguageSwitcher currentLang={lang} onChange={setLang} />

            {/* ── Notification Bell (order status updates) ── */}
            {activeOrderId && (
              <div className="relative" ref={bellRef}>
                <button
                  type="button"
                  onClick={() => {
                    const opening = !bellOpen;
                    setBellOpen(opening);
                    if (opening) {
                      void ensureNotifyPermission();
                      // Mark all as read when panel opens
                      setDinerNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
                    }
                  }}
                  aria-label="Order notifications"
                  className={`relative p-2 rounded-full border text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                    isDarkMode
                      ? "bg-[#2b1810] border-[#4a2b1c] text-amber-300 hover:bg-[#3A241A]"
                      : "bg-stone-100 border-stone-200 text-neutral-700 hover:bg-stone-200"
                  }`}
                >
                  <Bell size={15} className={unreadCount > 0 ? "text-amber-500" : ""} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[1.1rem] h-[1.1rem] rounded-full bg-rose-500 text-[9px] font-black text-white flex items-center justify-center px-0.5 border-2 border-white dark:border-[#2b1810] animate-pulse">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* Dropdown panel */}
                {bellOpen && (
                  <div className={`absolute right-0 mt-2 w-72 rounded-2xl shadow-2xl z-50 border overflow-hidden ${isDarkMode ? "bg-[#2B1810] border-[#3D2415]" : "bg-white border-stone-200"}`}>
                    <div className={`flex items-center justify-between px-4 py-2.5 border-b text-xs font-bold ${isDarkMode ? "border-[#3D2415] text-amber-200" : "border-stone-100 text-stone-700"}`}>
                      <div className="flex items-center gap-1.5">
                        <Bell size={13} className="text-amber-500" />
                        <span>Order Updates</span>
                      </div>
                      {dinerNotifs.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setDinerNotifs([])}
                          className="text-[10px] text-stone-400 hover:text-rose-500 transition-colors"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {dinerNotifs.length === 0 ? (
                        <div className={`px-4 py-6 text-center text-xs ${isDarkMode ? "text-stone-500" : "text-stone-400"}`}>
                          <Bell size={20} className="mx-auto mb-2 opacity-30" />
                          No order updates yet.
                        </div>
                      ) : (
                        dinerNotifs.map((n) => (
                          <div
                            key={n.id}
                            className={`flex items-start gap-3 px-4 py-3 border-b last:border-b-0 ${isDarkMode ? "border-[#3D2415]" : "border-stone-50"} ${n.read ? "" : isDarkMode ? "bg-amber-900/20" : "bg-amber-50/60"}`}
                          >
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${n.read ? "bg-stone-200 dark:bg-stone-800" : "bg-amber-500/20"}`}>
                              {n.read ? <CheckCheck size={12} className="text-stone-400" /> : <Bell size={12} className="text-amber-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs leading-snug font-medium ${isDarkMode ? "text-stone-200" : "text-stone-800"}`}>{n.text}</p>
                              <p className="text-[10px] text-stone-400 mt-0.5">{new Date(n.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Orders (placed) + Cart (unpaid basket) — Cart sits to the right */}
            <button
              type="button"
              onClick={() => {
                if (activeOrderId)
                  router.push(
                    `/${slug}/order/${activeOrderId}?table=${tableId}&lang=${lang}`,
                  );
                else setIsDrawerOpen(true);
              }}
              className={`relative p-2 sm:px-3 sm:py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isDarkMode
                  ? "bg-[#2b1810] border-[#4a2b1c] text-white hover:bg-[#3A241A]"
                  : "bg-stone-100 text-[#2B1810] border-stone-300 hover:bg-stone-200"
              }`}
            >
              <ListChecks size={15} className="text-amber-500" />
              {activeOrderId && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#2b1810]" />
              )}
              <span className="hidden sm:inline">Orders</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className={`relative p-2 sm:px-3 sm:py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isDarkMode
                  ? "bg-[#2b1810] border-[#4a2b1c] text-white hover:bg-[#3A241A]"
                  : "bg-[#2B1810] text-white border-transparent hover:bg-[#3D2415]"
              }`}
            >
              <ShoppingBag size={15} className="text-amber-400" />
              <span className="hidden sm:inline">Cart</span>
              {totalCartCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-stone-950 text-[10px] font-extrabold ml-0.5">
                  {totalCartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-28 space-y-10">
        {/* ACTIVE ORDER TRACKER BANNER */}
        {activeOrderId && !isActiveBannerDismissed && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-950/40 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <UtensilsCrossed size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-200">
                  You have an active order
                </p>
                <p className="text-xs text-emerald-300/70">
                  Track its live kitchen status anytime.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/${slug}/order/${activeOrderId}?table=${tableId}&lang=${lang}`,
                  )
                }
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Track My Order
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.setItem(`${orderKey}_dismissed`, "1");
                  } catch {
                    /* ignore */
                  }
                  setIsActiveBannerDismissed(true);
                }}
                className="px-3 py-2 rounded-xl border border-emerald-500/30 text-emerald-300/80 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                title="Dismiss"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* HERO SECTION (Requested in Photo 1) */}
        {/* ========================================================= */}
        <section className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-stone-800/40 min-h-[340px] sm:min-h-[420px] flex items-center bg-stone-950">
          {/* Background image with high quality gastronomy & roast visuals */}
          <img
            src="https://images.unsplash.com/photo-1544025162-d76694265947?w=1600&auto=format&fit=crop&q=85"
            alt="Skill Coffee dining room"
            onError={handleImgError}
            className="absolute inset-0 w-full h-full object-cover object-center scale-105 filter brightness-75"
          />

          {/* Deep dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/75 to-black/40 sm:to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30" />

          {/* Hero Content */}
          <div className="relative z-10 max-w-2xl p-6 sm:p-10 lg:p-12 space-y-4 sm:space-y-6">
            {/* Headline */}
            <h2 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.1]">
              A menu made to be savoured
            </h2>

            {/* Subtitle */}
            <p className="text-xs sm:text-base text-stone-200/90 font-light leading-relaxed max-w-lg">
              Freshly roasted single-origin coffee, artisan pastries and
              authentic Ethiopian dishes — served in the heart of Addis Ababa.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href="#menu-section"
                className="px-6 py-3.5 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-amber-500/25 active:scale-95 transition-all cursor-pointer"
              >
                <span>Browse Menu</span>
                <ArrowDown size={16} strokeWidth={2.5} />
              </a>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SEARCH, CATEGORIES & FULL MENU SECTION */}
        {/* ========================================================= */}
        <div id="menu-section" className="pt-6 space-y-6">
          {/* Section Heading */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-4 border-stone-200 dark:border-stone-800">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-amber-700 dark:text-amber-400">
                Culinary Portfolio
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#2B1810] dark:text-[#f8ede1]">
                Explore Our Complete Menu
              </h3>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto">
            <Search
              size={18}
              className="absolute left-4 top-3.5 text-stone-400"
            />
            <input
              type="text"
              placeholder="Search dishes, coffee, milkshakes, ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-11 pr-10 py-3 rounded-2xl text-xs sm:text-sm focus:outline-none transition-all shadow-sm border ${
                isDarkMode
                  ? "bg-[#3A241A] border-[#442618] text-white placeholder-stone-500 focus:border-amber-500"
                  : "bg-white border-stone-200 text-neutral-900 placeholder-stone-400 focus:border-[#2B1810]"
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-3.5 text-stone-400 hover:text-stone-700 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {catalogError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-3 text-xs">
              Failed to load the menu from the server: {catalogError}
            </div>
          )}

          {/* Category Chips Bar */}
          <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={`px-4 py-2.5 rounded-full text-xs font-bold tracking-wide transition-all shrink-0 cursor-pointer ${
                activeCategory === "all"
                  ? isDarkMode
                    ? "bg-amber-500 text-stone-950 shadow-md font-extrabold"
                    : "bg-[#2B1810] text-white shadow-md"
                  : isDarkMode
                    ? "bg-[#3A241A] border border-[#442618] text-stone-300 hover:bg-[#3A241A]"
                    : "bg-white border border-stone-200 text-neutral-700 hover:bg-stone-50"
              }`}
            >
              All Dishes
            </button>

            {CATEGORIES.map((cat) => {
              const isSelected = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2.5 rounded-full text-xs font-bold tracking-wide transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? isDarkMode
                        ? "bg-amber-500 text-stone-950 shadow-md font-extrabold"
                        : "bg-[#2B1810] text-white shadow-md"
                      : isDarkMode
                        ? "bg-[#3A241A] border border-[#442618] text-stone-300 hover:bg-[#3A241A]"
                        : "bg-white border border-stone-200 text-neutral-700 hover:bg-stone-50"
                  }`}
                >
                  {tI18n(cat.name_i18n, lang)}
                </button>
              );
            })}
          </div>

          {/* ========================================================= */}
          {/* MENU GRID — EVERY CARD IS FULLY CLICKABLE (Requested) */}
          {/* ========================================================= */}
          {catalogLoading ? (
            <div
              role="status"
              aria-live="polite"
              className={`text-center py-20 p-6 rounded-3xl border ${
                isDarkMode
                  ? "bg-[#3A241A] border-[#442417] text-stone-400"
                  : "bg-white border-stone-200 text-neutral-500"
              }`}
            >
              <Utensils size={32} className="mx-auto mb-3 opacity-40" />
              <p className="font-serif text-base font-bold text-neutral-800 dark:text-stone-200">
                Loading menu…
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div
              className={`text-center py-20 p-6 rounded-3xl border ${
                isDarkMode
                  ? "bg-[#3A241A] border-[#442417] text-stone-400"
                  : "bg-white border-stone-200 text-neutral-500"
              }`}
            >
              <Utensils size={32} className="mx-auto mb-3 opacity-40" />
              <p className="font-serif text-base font-bold text-neutral-800 dark:text-stone-200">
                {catalogError ? "Menu unavailable" : "No matching items found"}
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                {catalogError
                  ? "Please try again later."
                  : "Try clearing search terms or selecting a different category."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {filteredItems.map((dish) => {
                const qtyInCart =
                  cartLines.find((l) => l.itemId === dish.id)?.qty || 0;

                return (
                  <div
                    key={dish.id}
                    onClick={() => openDishDetail(dish)}
                    className={`group rounded-3xl overflow-hidden border cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.01] flex flex-col justify-between ${
                      isDarkMode
                        ? "bg-[#3A241A] border-[#442417] shadow-lg shadow-black/30 hover:border-amber-500/50"
                        : "bg-[#FAF5EC] border-[#D4B896] shadow-sm hover:shadow-lg hover:border-amber-600/50"
                    }`}
                  >
                    {/* Dish Image with badges */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100 dark:bg-stone-900">
                      <img
                        src={dish.image_path}
                        onError={handleImgError}
                        alt={tI18n(dish.name_i18n, lang)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />

                      {/* Prep time badge */}
                      <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-sm text-white text-[10px] font-bold flex items-center gap-1 border border-white/10">
                        <Clock size={10} className="text-amber-400" />
                        <span>{dish.avg_prep_minutes}m</span>
                      </div>

                    </div>

                    {/* Dish Info */}
                    <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <h4 className="font-serif text-sm sm:text-base font-bold text-[#2B1810] dark:text-[#f8ede1] leading-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            {tI18n(dish.name_i18n, lang)}
                          </h4>
                          {dish.rating && (
                            <div className="flex items-center gap-0.5 text-[11px] font-bold text-amber-500 shrink-0">
                              <Star size={11} className="fill-amber-500" />
                              <span>{dish.rating}</span>
                            </div>
                          )}
                        </div>

                        <p className="text-[11px] text-stone-500 dark:text-[#a8907f] line-clamp-2 leading-relaxed font-light">
                          {tI18n(dish.description_i18n, lang)}
                        </p>
                      </div>

                      {/* Price and Add button */}
                      <div className="flex items-center justify-between mt-3.5 pt-2.5 border-t border-stone-100 dark:border-stone-800/80">
                        <span className="font-serif text-sm sm:text-base font-bold text-[#2B1810] dark:text-amber-400">
                          {dish.price.toLocaleString()} ETB
                        </span>

                        {qtyInCart > 0 ? (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center bg-[#2B1810] dark:bg-[#3d2417] text-white rounded-full px-2 py-0.5 gap-1.5 shadow-sm border border-stone-700"
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQty(dish.id, qtyInCart - 1);
                              }}
                              className="text-white hover:text-amber-300 p-0.5 text-xs font-bold"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold px-1">
                              {qtyInCart}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(dish.id, 1);
                              }}
                              className="text-white hover:text-amber-300 p-0.5 text-xs font-bold"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(dish.id, 1);
                            }}
                            aria-label={`Add ${tI18n(dish.name_i18n, lang)}`}
                            className="w-8 h-8 rounded-full bg-[#2B1810] hover:bg-[#3D2415] dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-stone-950 text-white flex items-center justify-center shadow-md active:scale-90 transition-transform cursor-pointer"
                          >
                            <Plus size={16} strokeWidth={2.5} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ========================================================= */}
      {/* DISH DETAIL POPUP MODAL (Requested: "when card clicked make show detail") */}
      {/* ========================================================= */}
      {selectedDish && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div
            onClick={() => setSelectedDish(null)}
            className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
          />

          <div
            className={`relative w-full sm:max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl z-10 animate-scale-up border overflow-y-auto max-h-[92vh] hide-scrollbar ${
              isDarkMode
                ? "bg-[#3A241A] border-[#442417] text-[#f7e6d2]"
                : "bg-white border-stone-200 text-[#2B1810]"
            }`}
          >
            {/* Close Button — floats over image */}
            <button
              type="button"
              onClick={() => setSelectedDish(null)}
              className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md cursor-pointer border border-white/20 transition-transform active:scale-90"
            >
              <X size={18} />
            </button>

            {/* Dish Image — scrolls with the modal content */}
            <div className="relative w-full h-64 sm:h-80 overflow-hidden bg-stone-900 rounded-t-[2.5rem] sm:rounded-t-[2.5rem]">
              <img
                src={selectedDish.image_path}
                onError={handleImgError}
                alt={tI18n(selectedDish.name_i18n, lang)}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30" />

              {/* Badges */}
              <div className="absolute top-4 left-4 flex flex-wrap gap-1.5">
                {selectedDish.tag && (
                  <span className="px-3 py-1 rounded-full bg-amber-500 text-stone-950 text-[10px] font-extrabold uppercase tracking-wider shadow">
                    {selectedDish.tag}
                  </span>
                )}
                {selectedDish.dietary_tags?.map((d) => (
                  <span
                    key={d}
                    className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider border border-white/20"
                  >
                    {d}
                  </span>
                ))}
              </div>

              {/* Title & Price */}
              <div className="absolute bottom-4 inset-x-4 flex items-end justify-between">
                <div>
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-white leading-tight">
                    {tI18n(selectedDish.name_i18n, lang)}
                  </h3>
                  {selectedDish.name_i18n.am && lang !== "am" && (
                    <p className="text-xs text-amber-300 font-medium">
                      {selectedDish.name_i18n.am}
                    </p>
                  )}
                </div>
                <span className="font-serif text-xl sm:text-2xl font-bold text-amber-400">
                  {selectedDish.price.toLocaleString()} ETB
                </span>
              </div>
            </div>

            {/* Details Body */}
            <div className="p-5 sm:p-6 space-y-5">
              {/* Rating, Prep Time, Calories Info Row */}
              <div
                className={`grid grid-cols-3 gap-2 p-3 rounded-2xl text-center text-xs font-semibold ${
                  isDarkMode
                    ? "bg-[#3A241A] border border-[#3d2114]"
                    : "bg-stone-50 border border-stone-200"
                }`}
              >
                <div className="flex flex-col items-center justify-center">
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider">
                    {lang === "am"
                      ? "የዝግጅት ጊዜ"
                      : lang === "om"
                        ? "Yeroo Qophii"
                        : "Prep Time"}
                  </span>
                  <span className="font-bold text-[#2B1810] dark:text-stone-200 flex items-center gap-1 mt-0.5">
                    <Clock size={12} className="text-amber-500" />
                    {selectedDish.avg_prep_minutes}{" "}
                    {lang === "am"
                      ? "ደቂቃ"
                      : lang === "om"
                        ? "daqiiqaa"
                        : "mins"}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center border-x border-stone-200 dark:border-stone-800">
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider">
                    {lang === "am"
                      ? "ካሎሪ"
                      : lang === "om"
                        ? "Kaalorii"
                        : "Calories"}
                  </span>
                  <span className="font-bold text-[#2B1810] dark:text-stone-200 flex items-center gap-1 mt-0.5">
                    <Flame size={12} className="text-rose-500" />
                    {selectedDish.calories || 450} kcal
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center">
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider">
                    {lang === "am"
                      ? "ደረጃ"
                      : lang === "om"
                        ? "Sadarkaa"
                        : "Rating"}
                  </span>
                  <span className="font-bold text-[#2B1810] dark:text-stone-200 flex items-center gap-1 mt-0.5">
                    <Star size={12} className="fill-amber-400 text-amber-400" />
                    {selectedDish.rating || 4.9} (
                    {selectedDish.reviews_count || 120})
                  </span>
                </div>
              </div>

              {/* Full Description */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-stone-400">
                  {lang === "am"
                    ? "ዝርዝር መግለጫ"
                    : lang === "om"
                      ? "Ibsa"
                      : "Description"}
                </h4>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-[#c4ad9b] leading-relaxed">
                  {tI18n(selectedDish.description_i18n, lang)}
                </p>
              </div>

              {/* Ingredients Chips */}
              {selectedDish.ingredients &&
                selectedDish.ingredients.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-stone-400">
                      {lang === "am"
                        ? "ንጥረ ነገሮች"
                        : lang === "om"
                          ? "Qabiyyee"
                          : "Fresh Ingredients"}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedDish.ingredients.map((ing, idx) => (
                        <span
                          key={idx}
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${
                            isDarkMode
                              ? "bg-[#3A241A] text-amber-200 border-[#4a2b1b]"
                              : "bg-stone-100 text-neutral-800 border-stone-200"
                          }`}
                        >
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* Special Instructions Note */}
              <div className="space-y-2">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-400">
                  {lang === "am"
                    ? "ልዩ ማስታወሻ / አለርጂ ጥያቄ"
                    : lang === "om"
                      ? "Gabaasa Addaa / Qophii Addaa"
                      : "Special Kitchen Note / Allergen Request"}
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    lang === "am"
                      ? "ለምሳሌ፡ ስኳር ይቀነስ፣ በርበሬ ይጨመርበት፣ ወተት ይቀየር..."
                      : lang === "om"
                        ? "Fkn: Sukkara xiqqeessi, mi'eessituu dabalii..."
                        : "e.g. Less sugar, extra spicy, sauce on the side, oat milk..."
                  }
                  value={modalInstructions}
                  onChange={(e) => setModalInstructions(e.target.value)}
                  className={`w-full p-3 rounded-2xl text-xs sm:text-sm border focus:outline-none transition-all ${
                    isDarkMode
                      ? "bg-[#3A241A] border-[#442417] text-white placeholder-stone-500 focus:border-amber-500"
                      : "bg-stone-50 border-stone-200 text-neutral-900 placeholder-stone-400 focus:border-[#2B1810]"
                  }`}
                />
              </div>

              {/* Dine-in / Takeaway Toggle */}
              <div className="space-y-2">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-400">
                  {lang === "am" ? "አገልግሎት ዓይነት" : "Order Type"}
                </label>
                <div
                  className={`grid grid-cols-2 gap-1.5 p-1 rounded-2xl border ${isDarkMode ? "bg-[#3A241A] border-[#3d2114]" : "bg-stone-100 border-stone-200"}`}
                >
                  <button
                    type="button"
                    onClick={() => setModalFulfillment("dine-in")}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      modalFulfillment === "dine-in"
                        ? "bg-[#2B1810] text-amber-300 shadow-md"
                        : isDarkMode
                          ? "text-stone-400 hover:text-stone-200"
                          : "text-stone-500 hover:text-stone-700"
                    }`}
                  >
                    <UtensilsCrossed size={13} />
                    {lang === "am" ? "ቤት ውስጥ" : "Dine-in"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalFulfillment("takeaway")}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      modalFulfillment === "takeaway"
                        ? "bg-[#2B1810] text-amber-300 shadow-md"
                        : isDarkMode
                          ? "text-stone-400 hover:text-stone-200"
                          : "text-stone-500 hover:text-stone-700"
                    }`}
                  >
                    <ShoppingBag size={13} />
                    {lang === "am" ? "ይዞ መሄድ" : "Takeaway"}
                  </button>
                </div>
                {modalFulfillment === "takeaway" && (
                  <input
                    type="tel"
                    placeholder={
                      lang === "am"
                        ? "የስልክ ቁጥር (ለምሳሌ፡ 0911 234 567)"
                        : "Phone for pickup SMS (e.g. 0911 234 567)"
                    }
                    value={modalPhone}
                    onChange={(e) => setModalPhone(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs border focus:outline-none focus:border-amber-500 transition-colors ${isDarkMode ? "bg-[#3A241A] border-stone-700 text-stone-100 placeholder:text-stone-500" : "bg-white border-stone-200 text-stone-900 placeholder:text-stone-400"}`}
                  />
                )}
              </div>

              {/* Freshly made note */}
              <div className="flex items-center justify-end pt-1">
                <span className="text-[11px] text-stone-400 font-medium">
                  {lang === "am" ? "Freshly made" : "Freshly made to order"}
                </span>
              </div>
            </div>

            {/* Sticky Footer: Stepper + Order Now */}
            <div
              className={`sticky bottom-0 p-4 sm:p-5 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ${
                isDarkMode
                  ? "bg-[#3A241A] border-[#381c10]"
                  : "bg-white border-stone-200"
              }`}
            >
              {/* Quantity Stepper */}
              <div className="flex items-center justify-between sm:justify-start gap-2.5">
                <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
                  {lang === "am" ? "ብዛት" : "Qty"}:
                </span>
                <div
                  className={`flex items-center rounded-full p-1 border shrink-0 ${isDarkMode ? "bg-[#3A241A] border-[#442417]" : "bg-stone-100 border-stone-200"}`}
                >
                  <button
                    type="button"
                    onClick={() => setModalQty((prev) => Math.max(1, prev - 1))}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 cursor-pointer transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center text-sm font-bold text-[#2B1810] dark:text-white">
                    {modalQty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalQty((prev) => prev + 1)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 cursor-pointer transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Order Now CTA */}
              <button
                type="button"
                onClick={() => {
                  addToCart(
                    selectedDish.id,
                    modalQty,
                    modalInstructions.trim() || undefined,
                  );
                  setSelectedDish(null);
                }}
                className="flex-1 py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs sm:text-sm shadow-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <UtensilsCrossed size={15} />
                <span>{lang === "am" ? "ወደ ባስኬት ጨምር" : "Add to Order"}</span>
                <span className="font-serif font-bold ml-0.5">
                  {(selectedDish.price * modalQty).toLocaleString()} ETB
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Call Waiter Button */}
      <CallWaiterButton tableLabel={tableDisplay} />

      {/* ========================================================= */}
      {/* BOTTOM FLOATING CART BAR */}
      {/* ========================================================= */}
      {totalCartCount > 0 && (
        <div className="fixed inset-x-0 bottom-5 z-40 px-4 max-w-xl mx-auto animate-slide-up">
          <div
            onClick={() => setIsDrawerOpen(true)}
            className={`w-full p-4 rounded-3xl shadow-2xl flex items-center justify-between cursor-pointer transition-all duration-200 border active:scale-98 ${
              isDarkMode
                ? "bg-[#3A241A] text-white border-amber-500/40 shadow-black/80"
                : "bg-[#2B1810] text-white border-stone-700"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-amber-400">
                <ShoppingBag size={20} />
              </div>
              <div>
                <p className="text-xs text-stone-300 font-medium">
                  {totalCartCount} item{totalCartCount > 1 ? "s" : ""} in basket
                </p>
                <p className="text-base font-serif font-bold text-white">
                  Total: {grandTotal.toLocaleString()} ETB
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs shadow">
              <span>View Order</span>
              <ArrowRight size={14} />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SIDE CART DRAWER */}
      {/* ========================================================= */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
          />

          <div
            className={`relative max-w-md w-full h-full flex flex-col justify-between z-10 shadow-2xl animate-slide-left border-l ${
              isDarkMode
                ? "bg-[#3A241A] border-[#381c10] text-[#f7e6d2]"
                : "bg-white border-stone-200 text-neutral-900"
            }`}
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#2B1810] dark:bg-[#3d2417] text-white flex items-center justify-center">
                  <ShoppingBag size={18} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base">Your Order</h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                    {tableDisplay}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <Cart
                lines={cartLines}
                menuItems={MENU}
                lang={lang}
                onUpdateQty={updateQty}
                onRemoveItem={removeItem}
              />

              {/* Dining preference prompt if both food and drink in cart */}
              <TogetherOrSeparatePrompt
                hasFood={hasFood}
                hasDrink={hasDrink}
                value={serviceMode}
                onChange={setServiceMode}
              />
            </div>

            {/* Drawer Footer / Place Order */}
            <div
              className={`p-5 border-t space-y-3 ${
                isDarkMode
                  ? "bg-[#3A241A] border-[#381c10]"
                  : "bg-[#EDE0C8] border-[#D4B896]"
              }`}
            >
              <button
                type="button"
                disabled={cartLines.length === 0 || placing}
                onClick={handlePlaceOrder}
                className={`w-full py-4 rounded-2xl text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer ${
                  cartLines.length === 0 || placing
                    ? "bg-stone-300 text-neutral-500 cursor-not-allowed"
                    : "bg-amber-500 hover:bg-amber-400 text-stone-950 active:scale-98"
                }`}
              >
                <span>
                  {placing ? "Placing Order…" : "Place Order & Proceed to Pay"}
                </span>
                {!placing && <ArrowRight size={16} />}
              </button>
              {placeError && (
                <p className="text-[11px] text-rose-600 text-center">
                  {placeError}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* FOOTER — slim, modern single band */}
      {/* ========================================================= */}
      <footer
        className={`mt-16 border-t ${
          isDarkMode
            ? "border-white/10 bg-[#241510]"
            : "border-stone-200 bg-[#FAF5EC]"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#FAF7F2] flex items-center justify-center shadow-md overflow-hidden border border-[#2B1810]/20 p-1 shrink-0">
                <img
                  src="/skill-coffee-icon.png"
                  alt="Skill Coffee"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-center md:text-left">
                <p
                  className={`font-serif text-sm font-bold leading-tight ${isDarkMode ? "text-[#f8ede1]" : "text-[#2B1810]"}`}
                >
                  Skill Coffee
                </p>
                <p
                  className={`text-[11px] ${isDarkMode ? "text-stone-400" : "text-stone-500"}`}
                >
                  Freshly roasted · Addis Ababa
                </p>
              </div>
            </div>

            {/* Social */}
            <div className="hidden">
              <a
                href="https://www.instagram.com/skillcofee"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-amber-400 transition-colors"
              >
                <svg className="w-4 h-4 fill-currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                href="https://www.facebook.com/skillcofee"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-blue-400 transition-colors"
              >
                <svg className="w-4 h-4 fill-currentColor" viewBox="0 0 24 24">
                  <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.667 5H18V0h-3.889C10.667 0 9 1.667 9 4.889V8z" />
                </svg>
              </a>
              <a
                href="https://www.youtube.com/@skillcofee"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-rose-500 transition-colors"
              >
                <svg className="w-4 h-4 fill-currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
            </div>
          </div>

          <div
            className={`border-t pt-5 text-center text-[11px] ${isDarkMode ? "border-white/10 text-stone-400" : "border-stone-200 text-stone-500"}`}
          >
            © 2026 Skill Coffee · Addis Ababa, Ethiopia
          </div>
        </div>
      </footer>
    </div>
  );
}
