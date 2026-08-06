"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  db,
  MenuItem,
  Order,
  CategoryType,
  CATEGORIES,
  OrderStatus,
} from "./utils/store";
import {
  Utensils,
  Globe,
  Moon,
  Sun,
  ShoppingBag,
  Search,
  ArrowRight,
  ArrowDown,
  Trash2,
  MapPin,
  Clock,
  User,
  Calendar,
  Sparkles,
  Egg,
  ChefHat,
  Pizza,
  Flame,
  Coffee,
  Check,
  Heart,
  Settings,
  MessageSquare,
  List,
  Grid,
  Info,
  Plus,
  Minus,
  ChevronRight,
  Star,
  ShieldAlert,
  AlertCircle,
  X,
  Volume2,
  Shield,
  UserCheck,
  Menu,
} from "lucide-react";

// DUAL LANGUAGE / TRANSLATION SYSTEM DICTIONARY
type TranslationKey =
  | "heroTitle"
  | "heroSubtitle"
  | "browseMenu"
  | "reserveTable"
  | "categories"
  | "categoriesSubtitle"
  | "menuTitle"
  | "menuSubtitle"
  | "searchPlaceholder"
  | "filters"
  | "maxPrice"
  | "gridLabel"
  | "listLabel"
  | "addToFavorites"
  | "removeFromFavorites"
  | "orderNow"
  | "quantity"
  | "specialInstructions"
  | "notesPlaceholder"
  | "addToOrder"
  | "itemsInOrder"
  | "viewOrder"
  | "currency"
  | "language"
  | "darkMode"
  | "lightMode"
  | "notifications"
  | "aboutTitle"
  | "aboutText"
  | "homeTab"
  | "favTab"
  | "ordersTab"
  | "feedbackTab"
  | "settingsTab"
  | "noFavs"
  | "noFavsSub"
  | "activeOrders"
  | "orderHistory"
  | "noOrders"
  | "noOrdersSub"
  | "cancelOrder"
  | "confirmReceipt"
  | "status"
  | "estimatedPrep"
  | "minutes"
  | "feedbackRateTitle"
  | "feedbackWriteTitle"
  | "feedbackType"
  | "issue"
  | "suggestion"
  | "feedbackSubmit"
  | "feedbackSuccess"
  | "prepLabel"
  | "calLabel"
  | "ingLabel"
  | "available"
  | "soldOut"
  | "tableNumber"
  | "orderNowImmediate"
  | "popularBadge"
  | "newBadge"
  | "orderSentSuccess"
  | "orderSentSuccessSub"
  | "reserveSuccess"
  | "reserveSuccessSub";

const TRANSLATIONS: Record<
  "en" | "am" | "om",
  Record<TranslationKey, string>
> = {
  en: {
    heroTitle: "A menu made to be savoured",
    heroSubtitle:
      "Seasonal plates, single-origin coffee and craft cocktails — served in the heart of Addis Ababa.",
    browseMenu: "Browse Menu",
    reserveTable: "Reserve a table",
    categories: "Categories",
    categoriesSubtitle: "Explore the kitchen, one section at a time",
    menuTitle: "Menu",
    menuSubtitle: "Everything on the table today",
    searchPlaceholder: "Search dishes, categories or ingredients...",
    filters: "Filters",
    maxPrice: "Max price:",
    gridLabel: "Grid View",
    listLabel: "List View",
    addToFavorites: "Add to Favorites",
    removeFromFavorites: "Remove from Favorites",
    orderNow: "Order Now",
    quantity: "Quantity",
    specialInstructions: "Special instructions",
    notesPlaceholder: "e.g. Extra spicy, allergy...",
    addToOrder: "Add to order",
    itemsInOrder: "items in order",
    viewOrder: "View Order",
    currency: "Currency",
    language: "Language",
    darkMode: "Dark Mode",
    lightMode: "Light Mode",
    notifications: "Notifications",
    aboutTitle: "About Meskel House",
    aboutText:
      "Meskel House blends fine dining with traditional Ethiopian soul, preparing gourmet dishes in the heart of Addis Ababa.",
    homeTab: "Cart",
    favTab: "Favorites",
    ordersTab: "Orders",
    feedbackTab: "Feedback",
    settingsTab: "Settings",
    noFavs: "No favorites saved yet",
    noFavsSub: "Tap the heart icon on any dish to save it here.",
    activeOrders: "Active Orders",
    orderHistory: "Order History",
    noOrders: "No orders placed yet",
    noOrdersSub:
      "Browse the menu and add dishes to place your first table order.",
    cancelOrder: "Cancel Order",
    confirmReceipt: "Confirm Received",
    status: "Status",
    estimatedPrep: "Est. Prep Time:",
    minutes: "minutes",
    feedbackRateTitle: "Rate Your Experience",
    feedbackWriteTitle: "Leave Your Review",
    feedbackType: "Feedback Type",
    issue: "Report Issue",
    suggestion: "Suggestion",
    feedbackSubmit: "Submit Feedback",
    feedbackSuccess: "Thank you for your feedback!",
    prepLabel: "Prep:",
    calLabel: "Calories:",
    ingLabel: "Ingredients:",
    available: "Available",
    soldOut: "Out of Stock",
    tableNumber: "Table Number",
    orderNowImmediate: "Order Now",
    popularBadge: "Popular",
    newBadge: "New",
    orderSentSuccess: "Order Sent!",
    orderSentSuccessSub: "Chef is already on it. Check status on 'Orders' tab.",
    reserveSuccess: "Reservation Confirmed!",
    reserveSuccessSub: "We have saved your table. See you soon!",
  },
  am: {
    heroTitle: "የሚጣጣም እና የሚመረጥ ምግብ ምናሌ",
    heroSubtitle: "ወቅታዊ ምግቦች፣ የኢትዮጵያ ቡና እና ድንቅ ኮክቴሎች — በአዲስ አበባ ልብ ውስጥ።",
    browseMenu: "ምናሌ ይመልከቱ",
    reserveTable: "ጠረጴዛ ያስይዙ",
    categories: "ምድቦች",
    categoriesSubtitle: "የወጥ ቤቱን ጣዕም በየምድቡ ይቃኙ",
    menuTitle: "የምግብ ዝርዝር",
    menuSubtitle: "ዛሬ በጠረጴዛው ላይ የሚቀርቡ ምግቦች",
    searchPlaceholder: "ምግቦችን፣ ምድቦችን ወይም ግብዓቶችን ይፈልጉ...",
    filters: "ማጣሪያዎች",
    maxPrice: "ከፍተኛ ዋጋ:",
    gridLabel: "ሳጥን እይታ",
    listLabel: "ዝርዝር እይታ",
    addToFavorites: "ወደ ተወዳጅ ያክሉ",
    removeFromFavorites: "ከተወዳጅ ያስወግዱ",
    orderNow: "አሁን እዘዝ",
    quantity: "ብዛት",
    specialInstructions: "ልዩ ማስታወሻ",
    notesPlaceholder: "ለምሳሌ፡ ቃሪያ ይብዛበት፣ ሽንኩርት አይግባ...",
    addToOrder: "ትዕዛዝ ውስጥ ያክሉ",
    itemsInOrder: "ምግቦች በትዕዛዝ ላይ",
    viewOrder: "ትዕዛዝ ይመልከቱ",
    currency: "ገንዘብ",
    language: "ቋንቋ",
    darkMode: "ጨለማ ሁነታ",
    lightMode: "ብርሃን ሁነታ",
    notifications: "ማሳወቂያዎች",
    aboutTitle: "ስለ መስቀል ቤት",
    aboutText:
      "መስቀል ቤት ጥራት ያለውን ምግብ ከኢትዮጵያ ባህላዊ ጣዕም ጋር በማዋሃድ በአዲስ አበባ እምብርት ላይ ያቀርባል።",
    homeTab: "ትዕዛዝ",
    favTab: "ተወዳጆች",
    ordersTab: "ሁኔታ",
    feedbackTab: "አስተያየት",
    settingsTab: "ቅንብሮች",
    noFavs: "እስካሁን ምንም ተወዳጅ የለም",
    noFavsSub: "ምግቦችን እዚህ ለማስቀመጥ የልብ ምልክቱን ይጫኑ።",
    activeOrders: "አሁን ያሉ ትዕዛዞች",
    orderHistory: "ያለፉ ትዕዛዞች",
    noOrders: "እስካሁን ምንም ትዕዛዝ አልተቀመጠም",
    noOrdersSub: "ትዕዛዝ ለማስገባት ምናሌውን በመመልከት ምግቦችን ያክሉ።",
    cancelOrder: "ትዕዛዝ ሰርዝ",
    confirmReceipt: "ምግቡ ደርሶኛል",
    status: "ሁኔታ",
    estimatedPrep: "የዝግጅት ጊዜ:",
    minutes: "ደቂቃዎች",
    feedbackRateTitle: "ደረጃ ይስጡን",
    feedbackWriteTitle: "አስተያየትዎን ይጻፉ",
    feedbackType: "የአስተያየት አይነት",
    issue: "ችግር ሪፖርት ያድርጉ",
    suggestion: "የሃሳብ ጥቆማ",
    feedbackSubmit: "አስተያየት አስገባ",
    feedbackSuccess: "ለአስተያየትዎ እናመሰግናለን!",
    prepLabel: "ዝግጅት:",
    calLabel: "ካሎሪ:",
    ingLabel: "ግብዓቶች:",
    available: "አለ",
    soldOut: "አልቋል",
    tableNumber: "የጠረጴዛ ቁጥር",
    orderNowImmediate: "አሁኑኑ እዘዝ",
    popularBadge: "ተወዳጅ",
    newBadge: "አዲስ",
    orderSentSuccess: "ትዕዛዝ ተልኳል!",
    orderSentSuccessSub: "ሼፍ ማብሰል ጀምሯል። ሁኔታውን 'ትዕዛዞች' ውስጥ ይከታተሉ።",
    reserveSuccess: "ጠረጴዛ ተይዟል!",
    reserveSuccessSub: "ቦታዎን አስቀምጠናል። በደስታ እንጠብቅዎታለን!",
  },
  om: {
    heroTitle: "Dhadhamamuuf kan qophaaye",
    heroSubtitle:
      "Nyaata addaa, buna handhuura Oromiyaa fi kookteelota babbareedoo — handhuura Finfinneetti.",
    browseMenu: "Menu Ilaali",
    reserveTable: "Teessuma Qabadhu",
    categories: "Ramaddiiwwan",
    categoriesSubtitle: "Kukkitoota keenya addaan baasanii ilaalaan",
    menuTitle: "Tarree Nyaataa",
    menuSubtitle: "Waan har'a ጠረጴዛ irra jiru",
    searchPlaceholder: "Nyaata, ramaddii ykn makaa barbaadi...",
    filters: "Gurgurtoo",
    maxPrice: "Gatiin Olaanaa:",
    gridLabel: "Grid View",
    listLabel: "List View",
    addToFavorites: "Jaalatamtootatti dabali",
    removeFromFavorites: "Jaalatamtootarraa balleessi",
    orderNow: "Amma Ajaji",
    quantity: "Baay'ina",
    specialInstructions: "Qajeelfama addaa",
    notesPlaceholder: "fkn. Barbareen haa baay'atu...",
    addToOrder: "Ajajatti dabali",
    itemsInOrder: "nyaata ajajame",
    viewOrder: "Ajaja Ilaali",
    currency: "Maallaqa",
    language: "Afaan",
    darkMode: "Haala Dukkanaa",
    lightMode: "Haala Ifaa",
    notifications: "Beeksisa",
    aboutTitle: "Waa'ee Meskel House",
    aboutText:
      "Meskel House nyaata mi'aawaa aadaa Oromoo fi Itiyoophiyaa waliin makee handhuura Finfinneetti dhiheessa.",
    homeTab: "Karta",
    favTab: "Jaalatamoo",
    ordersTab: "Ajajoota",
    feedbackTab: "Yaada",
    settingsTab: "Sajataa",
    noFavs: "Jaalatamtootni hin jiran",
    noFavsSub:
      "Nyaata jaalattu tarree kana keessatti galmeessuuf mallattoo jaalalaa tuqi.",
    activeOrders: "Ajajoota Ammaa",
    orderHistory: "Seenaa Ajajoota",
    noOrders: "Ajajni hin jiru",
    noOrdersSub: "Ajaja jalqabuuf menu irraa nyaata filadhu.",
    cancelOrder: "Ajaja Haqi",
    confirmReceipt: "Nyaata fudhadheera",
    status: "Haala",
    estimatedPrep: "Yeroo Qophii:",
    minutes: "daqiiqaa",
    feedbackRateTitle: "Sadarkaa Kenni",
    feedbackWriteTitle: "Yaada kee barreessi",
    feedbackType: "Gosa Yaadaa",
    issue: "Dhimma Gabaasi",
    suggestion: "Yaada Kenni",
    feedbackSubmit: "Yaada Ergi",
    feedbackSuccess: "Yaada keetiif galatoomi!",
    prepLabel: "Qophii:",
    calLabel: "Kaalorii:",
    ingLabel: "Makaa:",
    available: "Kan jiru",
    soldOut: "Dhumateera",
    tableNumber: "Lakk. Teessumaa",
    orderNowImmediate: "Amma Ajaji",
    popularBadge: "Beekamaa",
    newBadge: "Haaraa",
    orderSentSuccess: "Ajajni Ergamedha!",
    orderSentSuccessSub:
      "Kukkiin hojii jalqabeera. Tarree 'Ajajoota' keessatti hordofi.",
    reserveSuccess: "Teessumni Qabameera!",
    reserveSuccessSub: "Bakka keessan qopheessineerra. Isin eegna!",
  },
};

const CATEGORY_ICONS: Record<CategoryType, any> = {
  Breakfast: Egg,
  Lunch: Utensils,
  Dinner: ChefHat,
  Pizza: Pizza,
  Burgers: Flame,
  Pasta: Coffee, // using Coffee as generic fallback
  "Ethiopian Food": Flame,
  Drinks: Globe,
  Coffee: Coffee,
  Desserts: Sparkles,
  Cocktails: Globe,
};

export default function CustomerSPA() {
  const router = useRouter();

  // Unified Drawer tab: cart, favorites, orders list, feedback rating
  const [cartDrawerTab, setCartDrawerTab] = useState<
    "cart" | "fav" | "orders" | "feedback"
  >("cart");

  // App settings & layout state (persisted)
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [currency, setCurrency] = useState<"ETB" | "USD">("ETB");
  const [language, setLanguage] = useState<"en" | "am" | "om">("en");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [notifications, setNotifications] = useState(true);

  // Lists state
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});

  // Navigation anchors & filters
  const [activeCategory, setActiveCategory] = useState<CategoryType | "All">(
    "All",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [maxPrice, setMaxPrice] = useState(1500);
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);

  // Modals / forms states
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [detailQty, setDetailQty] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState("");

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState("12");
  const [kitchenNote, setKitchenNote] = useState("");

  const [isReserveOpen, setIsReserveOpen] = useState(false);
  const [reserveName, setReserveName] = useState("");
  const [reservePhone, setReservePhone] = useState("");
  const [reserveGuests, setReserveGuests] = useState("2");
  const [reserveDate, setReserveDate] = useState("");
  const [reserveTime, setReserveTime] = useState("");

  const [orderStatus, setOrderStatus] = useState<
    "idle" | "loading" | "success"
  >("idle");
  const [reserveStatus, setReserveStatus] = useState<
    "idle" | "loading" | "success"
  >("idle");

  // Feedback states
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackType, setFeedbackType] = useState<
    "feedback" | "issue" | "suggestion"
  >("feedback");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Toast Notification state
  const [toastMessage, setToastMessage] = useState("");

  // Sync data from store / localStorage
  const syncData = () => {
    setMenuItems(db.getMenuItems());
    setOrders(db.getOrders());
    setFavorites(db.getFavorites());
  };

  useEffect(() => {
    // Load persisted settings
    if (typeof window !== "undefined") {
      const storedTheme = localStorage.getItem("meskel_theme") as any;
      if (storedTheme) setTheme(storedTheme);

      const storedCurrency = localStorage.getItem("meskel_currency") as any;
      if (storedCurrency) setCurrency(storedCurrency);

      const storedLanguage = localStorage.getItem("meskel_language") as any;
      if (storedLanguage) setLanguage(storedLanguage);

      const storedViewMode = localStorage.getItem("meskel_view_mode") as any;
      if (storedViewMode) setViewMode(storedViewMode);

      const storedTable = localStorage.getItem("meskel_table");
      if (storedTable) setTableNumber(storedTable);
    }

    syncData();
    window.addEventListener("storage", syncData);
    window.addEventListener("meskel_db_change", syncData);

    return () => {
      window.removeEventListener("storage", syncData);
      window.removeEventListener("meskel_db_change", syncData);
    };
  }, []);

  // Listen to order status transitions to show toasts
  const [prevOrdersStates, setPrevOrdersStates] = useState<
    Record<string, OrderStatus>
  >({});

  useEffect(() => {
    if (orders.length === 0 || !notifications) return;
    const currentStates: Record<string, OrderStatus> = {};
    orders.forEach((o) => {
      currentStates[o.id] = o.status;
    });

    // Detect transitions
    Object.keys(currentStates).forEach((id) => {
      const oldState = prevOrdersStates[id];
      const newState = currentStates[id];
      if (oldState && oldState !== newState) {
        let msg = "";
        if (newState === "Accepted")
          msg = `Order #${id} has been accepted by the kitchen!`;
        if (newState === "Preparing")
          msg = `Chef has started preparing Order #${id}!`;
        if (newState === "Ready")
          msg = `Order #${id} is cooked and ready for service!`;
        if (newState === "Served")
          msg = `Waiter is serving Order #${id} to Table ${tableNumber}!`;
        if (newState === "Completed")
          msg = `Order #${id} is completed. Thank you!`;

        if (msg) {
          setToastMessage(msg);
          // Play a micro sound in background
          try {
            const context = new (
              window.AudioContext || (window as any).webkitAudioContext
            )();
            const osc = context.createOscillator();
            osc.frequency.setValueAtTime(440, context.currentTime);
            osc.connect(context.destination);
            osc.start();
            osc.stop(context.currentTime + 0.15);
          } catch (e) {}
          setTimeout(() => setToastMessage(""), 5000);
        }
      }
    });

    setPrevOrdersStates(currentStates);
  }, [orders, notifications, tableNumber]);

  // Translate helpers
  const t = (key: TranslationKey) => {
    return TRANSLATIONS[language][key] ?? TRANSLATIONS["en"][key] ?? "";
  };

  const handleToggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("meskel_theme", nextTheme);
  };

  const handleToggleCurrency = (cur: "USD" | "ETB") => {
    setCurrency(cur);
    localStorage.setItem("meskel_currency", cur);
  };

  const handleToggleLanguage = (lang: "en" | "am" | "om") => {
    setLanguage(lang);
    localStorage.setItem("meskel_language", lang);
  };

  const handleToggleViewMode = () => {
    const nextMode = viewMode === "grid" ? "list" : "grid";
    setViewMode(nextMode);
    localStorage.setItem("meskel_view_mode", nextMode);
  };

  const formatPrice = (etbPrice: number) => {
    if (currency === "USD") {
      const converted = etbPrice / 120; // 1 USD = 120 ETB conversion
      return `$${converted.toFixed(2)}`;
    }
    return `${etbPrice} ETB`;
  };

  // CART LOGIC
  const cartTotalItems = useMemo(
    () => Object.values(cart).reduce((sum, qty) => sum + qty, 0),
    [cart],
  );

  const subtotal = useMemo(() => {
    return Object.entries(cart).reduce((sum, [name, qty]) => {
      const item = menuItems.find((i) => i.name === name);
      if (!item) return sum;
      return sum + qty * item.price;
    }, 0);
  }, [cart, menuItems]);

  const tax = useMemo(() => subtotal * 0.15, [subtotal]);
  const serviceCharge = useMemo(() => (subtotal > 0 ? 25 : 0), [subtotal]); // 25 ETB flat
  const grandTotal = useMemo(
    () => subtotal + tax + serviceCharge,
    [subtotal, tax, serviceCharge],
  );

  const addToCart = (name: string, qty = 1) => {
    setCart((current) => ({
      ...current,
      [name]: (current[name] ?? 0) + qty,
    }));
  };

  const removeFromCart = (name: string) => {
    setCart((current) => {
      const copy = { ...current };
      if (copy[name] > 1) copy[name] -= 1;
      else delete copy[name];
      return copy;
    });
  };

  const removeAllFromCart = (name: string) => {
    setCart((current) => {
      const copy = { ...current };
      delete copy[name];
      return copy;
    });
  };

  const handleToggleFav = (name: string) => {
    db.toggleFavorite(name);
    syncData();
  };

  // PLACING CUSTOMER ORDER
  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (cartTotalItems === 0) return;

    setOrderStatus("loading");
    localStorage.setItem("meskel_table", tableNumber);

    setTimeout(() => {
      const itemsList = Object.entries(cart).map(([name, qty]) => {
        const item = menuItems.find((i) => i.name === name);
        return {
          name,
          quantity: qty,
          price: item ? item.price : 0,
        };
      });

      db.addOrder({
        tableNumber,
        items: itemsList,
        notes: kitchenNote || undefined,
        estimatedTime: itemsList.reduce((max, it) => {
          const itemObj = menuItems.find((m) => m.name === it.name);
          return Math.max(max, itemObj ? itemObj.prepTime : 15);
        }, 15),
      });

      setOrderStatus("success");
      setTimeout(() => {
        setCart({});
        setKitchenNote("");
        setOrderStatus("idle");
        setIsCartOpen(false);
        setCartDrawerTab("orders"); // Open drawer directly to tracking page!
        setIsCartOpen(true);
      }, 3000);
    }, 1500);
  };

  // PLACING RESERVATION
  const handlePlaceReservation = (e: React.FormEvent) => {
    e.preventDefault();
    setReserveStatus("loading");

    setTimeout(() => {
      setReserveStatus("success");
      setTimeout(() => {
        setReserveStatus("idle");
        setReserveName("");
        setReservePhone("");
        setReserveGuests("2");
        setReserveDate("");
        setReserveTime("");
        setIsReserveOpen(false);
      }, 2500);
    }, 1500);
  };

  // PLACING FEEDBACK
  const handlePlaceFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;

    db.addFeedback(feedbackRating, feedbackText, feedbackType);
    setFeedbackSubmitted(true);
    setFeedbackText("");
    setFeedbackRating(5);
    setTimeout(() => {
      setFeedbackSubmitted(false);
    }, 4000);
  };

  // FILTERED CATALOG MENU ITEMS
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory =
        activeCategory === "All" || item.category === activeCategory;
      const matchesSearch =
        searchQuery === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.ingredients.some((ing) =>
          ing.toLowerCase().includes(searchQuery.toLowerCase()),
        );

      const matchesPrice = item.price <= maxPrice;

      let matchesTag = true;
      if (activeTagFilter) {
        if (activeTagFilter === "Vegetarian") matchesTag = !!item.isVegetarian;
        else if (activeTagFilter === "Vegan") matchesTag = !!item.isVegan;
        else if (activeTagFilter === "Halal") matchesTag = !!item.isHalal;
        else if (activeTagFilter === "Gluten free")
          matchesTag = !!item.isGlutenFree;
        else if (activeTagFilter === "Spicy") matchesTag = !!item.isSpicy;
        else if (activeTagFilter === "Popular")
          matchesTag = item.tag === "Popular" || item.tag === "Best Seller";
        else if (activeTagFilter === "New") matchesTag = item.tag === "New";
      }

      return matchesCategory && matchesSearch && matchesPrice && matchesTag;
    });
  }, [menuItems, activeCategory, searchQuery, maxPrice, activeTagFilter]);

  // CATEGORIES SLIDES IN HERO VIEW
  const homeCategories = useMemo(() => {
    return Array.from(new Set(menuItems.map((item) => item.category)));
  }, [menuItems]);

  const activeCustomerOrders = useMemo(() => {
    return orders.filter(
      (o) => o.status !== "Completed" && o.tableNumber === tableNumber,
    );
  }, [orders, tableNumber]);

  const historicalCustomerOrders = useMemo(() => {
    return orders.filter(
      (o) => o.status === "Completed" && o.tableNumber === tableNumber,
    );
  }, [orders, tableNumber]);

  const openDrawerWithTab = (tab: "cart" | "fav" | "orders" | "feedback") => {
    setCartDrawerTab(tab);
    setIsCartOpen(true);
  };

  return (
    <div
      className={
        theme === "dark"
          ? "dark bg-[#080d1a] text-slate-100 min-h-screen transition-colors duration-300 font-sans"
          : "bg-[#FAF7F2] text-[#1A1714] min-h-screen transition-colors duration-300 font-sans"
      }
    >
      {/* TOAST REALTIME POPUP */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
          <div className="bg-[#132d66] border border-white/20 text-white rounded-2xl p-4 shadow-2xl flex items-center gap-3 animate-slide-down">
            <Volume2 className="text-amber-400 shrink-0 animate-pulse" />
            <div className="text-xs font-semibold">{toastMessage}</div>
          </div>
        </div>
      )}

      {/* HEADER CAPSULE */}
      <header className="sticky top-4 z-40 mx-4 md:mx-auto max-w-4xl rounded-full border border-white/20 dark:border-slate-800/40 bg-white/70 dark:bg-[#0c1428]/75 backdrop-blur-md shadow-lg transition-all duration-300 py-2.5 px-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#132d66] flex items-center justify-center text-white shadow-inner">
            <Utensils size={20} strokeWidth={2} />
          </div>
          <div>
            <h1 className="font-serif font-bold text-base md:text-lg leading-tight tracking-wide text-[#1A1714] dark:text-white">
              Meskel House
            </h1>
            <p className="font-sans text-[10px] md:text-xs text-neutral-500 dark:text-slate-400 font-medium">
              Fine dining & Ethiopian soul
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Header language toggles switcher (inline text selector) */}
          <div className="flex bg-neutral-100 dark:bg-slate-900/60 p-0.5 rounded-full border border-neutral-200 dark:border-slate-800 text-[10px] font-bold">
            {(["en", "am", "om"] as const).map((langCode) => (
              <button
                key={langCode}
                onClick={() => handleToggleLanguage(langCode)}
                className={`px-2 py-1 rounded-full uppercase cursor-pointer transition-colors ${
                  language === langCode
                    ? "bg-[#132d66] text-white"
                    : "text-neutral-500 dark:text-slate-400 hover:text-neutral-700 dark:hover:text-slate-200"
                }`}
              >
                {langCode === "en" ? "EN" : langCode === "am" ? "አማ" : "OR"}
              </button>
            ))}
          </div>

          {/* Theme toggler */}
          <button
            onClick={handleToggleTheme}
            className="p-2 rounded-full text-neutral-700 dark:text-slate-200 hover:bg-neutral-100 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
            aria-label="Toggle Theme"
          >
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {/* Hamburger menu button to open utilities tabs */}
          <button
            onClick={() => openDrawerWithTab("orders")}
            className="p-2 rounded-full text-neutral-700 dark:text-slate-200 hover:bg-neutral-100 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
            aria-label="Staff Dashboard Options Menu"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* CORE HOME & MENU VIEW */}
      <main className="max-w-6xl mx-auto px-4 pt-6 pb-16">
        <div className="space-y-12">
          {/* HERO BANNER */}
          <section className="relative rounded-[2.5rem] overflow-hidden min-h-[60vh] flex flex-col justify-between p-6 md:p-12 bg-slate-950 shadow-2xl">
            <div className="absolute inset-0 z-0">
              <img
                src="https://images.unsplash.com/photo-1544025162-d76694265947?w=1600&auto=format&fit=crop&q=80"
                alt="Premium Restaurant Dining Experience"
                className="w-full h-full object-cover opacity-60 mix-blend-luminosity scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-[#051130]/95 via-[#060e24]/85 to-slate-950/20" />
            </div>

            <div className="relative z-10 self-start">
              <div className="flex items-center gap-2 bg-white/10 dark:bg-slate-900/40 backdrop-blur-md text-white border border-white/20 dark:border-slate-800/40 rounded-full py-1.5 px-4 text-xs font-semibold tracking-wider">
                <span className="text-amber-400">★</span>
                <span>4.9 · Addis Ababa</span>
              </div>
            </div>

            <div className="relative z-10 max-w-3xl mt-auto">
              <h2 className="font-serif text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white mb-4 leading-[1.1]">
                {t("heroTitle")}
              </h2>
              <p className="font-sans text-xs sm:text-sm md:text-base text-slate-200/90 leading-relaxed max-w-xl mb-6 font-light">
                {t("heroSubtitle")}
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    const el = document.getElementById("catalog-section");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="bg-amber-500 hover:bg-amber-400 active:scale-95 text-neutral-950 font-bold tracking-wide px-6 py-3 rounded-full shadow-lg transition-all flex items-center gap-2 text-xs cursor-pointer"
                >
                  {t("browseMenu")} <ArrowDown size={14} />
                </button>
                <button
                  onClick={() => setIsReserveOpen(true)}
                  className="bg-white/15 hover:bg-white/25 active:scale-95 text-white font-semibold tracking-wide px-6 py-3 rounded-full border border-white/20 backdrop-blur-sm transition-all text-xs cursor-pointer"
                >
                  {t("reserveTable")}
                </button>
              </div>
            </div>
          </section>

          {/* CATEGORIES SECTION */}
          <section className="scroll-mt-24">
            <div className="mb-6">
              <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-[#1A1714] dark:text-white">
                {t("categories")}
              </h2>
              <p className="text-xs md:text-sm text-neutral-500 dark:text-slate-400 mt-1 font-medium">
                {t("categoriesSubtitle")}
              </p>
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {homeCategories.slice(0, 4).map((catName) => {
                const itemsCount = menuItems.filter(
                  (item) => item.category === catName,
                ).length;
                const Icon = CATEGORY_ICONS[catName] || Egg;
                let img =
                  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400";
                if (catName === "Ethiopian Food")
                  img =
                    "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400";
                if (catName === "Drinks")
                  img =
                    "https://images.unsplash.com/photo-1536935338788-846bb9981813?w=400";
                if (catName === "Coffee")
                  img =
                    "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400";
                if (catName === "Desserts")
                  img =
                    "https://images.unsplash.com/photo-1519676867240-f03562e64548?w=400";

                return (
                  <div
                    key={catName}
                    onClick={() => {
                      setActiveCategory(catName);
                      const el = document.getElementById("catalog-section");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="relative group aspect-[16/11] rounded-3xl overflow-hidden shadow-md cursor-pointer hover:shadow-lg transition-all border border-neutral-200/60 dark:border-slate-800/40"
                  >
                    <img
                      src={img}
                      alt={catName}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />

                    <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 backdrop-blur-md text-white flex items-center justify-center">
                      <Icon size={14} />
                    </div>

                    <div className="absolute bottom-3 left-3 text-white">
                      <h3 className="font-serif text-sm font-bold tracking-wide">
                        {catName}
                      </h3>
                      <p className="text-[9px] text-slate-300 font-light mt-0.5">
                        {itemsCount} items
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* INTERACTIVE CATALOG SECTION */}
          <section
            id="catalog-section"
            className="scroll-mt-24 pt-6 border-t border-neutral-200 dark:border-slate-800/60"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-[#1A1714] dark:text-white">
                  {t("menuTitle")}
                </h2>
                <p className="text-xs text-neutral-500 dark:text-slate-400 mt-0.5">
                  {t("menuSubtitle")}
                </p>
              </div>
            </div>

            {/* SEARCH & FILTERS CONTROLS */}
            <div className="space-y-4 mb-8">
              {/* Search input field */}
              <div className="relative">
                <span className="absolute inset-y-0 left-3.5 flex items-center text-neutral-400 dark:text-slate-500">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  placeholder={t("searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-neutral-300 dark:border-slate-800 bg-white dark:bg-[#0c1428]/20 focus:outline-none focus:ring-2 focus:ring-[#132d66] focus:border-transparent text-sm transition-all placeholder:text-neutral-400 dark:placeholder:text-slate-550 text-neutral-900 dark:text-slate-100"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-3.5 flex items-center text-neutral-400 dark:text-slate-500 hover:text-neutral-600 dark:hover:text-slate-300"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Horizontal Category Scroll Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                <button
                  onClick={() => setActiveCategory("All")}
                  className={`px-4.5 py-2 rounded-full text-xs font-semibold tracking-wide transition-all border shrink-0 ${
                    activeCategory === "All"
                      ? "bg-[#132d66] text-white border-transparent shadow-md"
                      : "bg-white dark:bg-[#0c1428]/40 text-neutral-600 dark:text-slate-300 border-neutral-300/80 dark:border-slate-800 hover:border-neutral-400 dark:hover:border-slate-700"
                  }`}
                >
                  All
                </button>
                {CATEGORIES.map((catName) => {
                  const count = menuItems.filter(
                    (i) => i.category === catName,
                  ).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={catName}
                      onClick={() => setActiveCategory(catName)}
                      className={`px-4.5 py-2 rounded-full text-xs font-semibold tracking-wide transition-all border shrink-0 ${
                        activeCategory === catName
                          ? "bg-[#132d66] text-white border-transparent shadow-md"
                          : "bg-white dark:bg-[#0c1428]/40 text-neutral-600 dark:text-slate-300 border-neutral-300/80 dark:border-slate-800 hover:border-neutral-400 dark:hover:border-slate-700"
                      }`}
                    >
                      {catName}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RENDER DUAL VIEW LAYOUT */}
            {filteredMenuItems.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-[#0c1428]/10 rounded-3xl border border-dashed border-neutral-200 dark:border-slate-800">
                <p className="text-neutral-500 dark:text-slate-400">
                  No dishes match your query.
                </p>
              </div>
            ) : (
              /* GRID VIEW (PREMIUM CARD LAYOUT DESIGN MATCHING SCREENSHOT) */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredMenuItems.map((item) => {
                  const isFav = favorites.includes(item.name);
                  const qtyInCart = cart[item.name] ?? 0;
                  return (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-[#0c1428]/30 border border-neutral-200/80 dark:border-slate-800/50 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                    >
                      {/* Image overlay container */}
                      <div
                        className="relative aspect-[4/3] w-full cursor-pointer"
                        onClick={() => {
                          setSelectedItem(item);
                          setDetailQty(1);
                        }}
                      >
                        <img
                          src={item.img}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                        {/* Top Badges */}
                        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1 z-10">
                          {item.originalPrice && (
                            <span className="bg-amber-500 text-neutral-950 font-bold text-[8px] uppercase tracking-wider py-0.5 px-2 rounded-full shadow-sm">
                              -
                              {Math.round(
                                ((item.originalPrice - item.price) /
                                  item.originalPrice) *
                                  100,
                              )}
                              %
                            </span>
                          )}
                          {item.tag && (
                            <span className="bg-[#132d66] text-white font-bold text-[8px] uppercase tracking-wider py-0.5 px-2 rounded-full flex items-center gap-0.5 shadow-sm">
                              ★{" "}
                              {item.tag === "Popular"
                                ? t("popularBadge")
                                : item.tag === "New"
                                  ? t("newBadge")
                                  : item.tag}
                            </span>
                          )}
                          {!item.availability && (
                            <span className="bg-rose-500 text-white font-bold text-[8px] uppercase tracking-wider py-0.5 px-2 rounded-full shadow-sm">
                              {t("soldOut")}
                            </span>
                          )}
                        </div>

                        {/* Heart favorite icon inside a beige circle with a white border */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFav(item.name);
                          }}
                          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-[#DDD5C7]/70 border border-white text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-transform shadow-md"
                        >
                          <Heart
                            size={11}
                            fill={isFav ? "#f43f5e" : "none"}
                            className={
                              isFav
                                ? "text-rose-500 fill-rose-500"
                                : "text-white"
                            }
                          />
                        </button>
                      </div>

                      {/* Card details */}
                      <div className="p-3 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-1.5 mb-1">
                            <h3
                              onClick={() => {
                                setSelectedItem(item);
                                setDetailQty(1);
                              }}
                              className="font-serif text-xs sm:text-sm font-bold text-neutral-900 dark:text-white cursor-pointer hover:underline tracking-wide leading-tight line-clamp-1"
                            >
                              {item.name}
                            </h3>
                            <div className="flex items-center gap-0.5 text-[10px] font-bold text-amber-500 shrink-0">
                              <Star
                                size={10}
                                fill="#eab308"
                                className="text-amber-500 animate-pulse"
                              />
                              <span>{item.rating}</span>
                            </div>
                          </div>
                          <p className="text-[10px] sm:text-xs text-neutral-500 dark:text-slate-400 line-clamp-1 leading-normal mb-2">
                            {item.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-neutral-100 dark:border-slate-800/40">
                          <div className="flex items-baseline gap-1">
                            <span className="font-serif text-xs sm:text-sm font-bold text-neutral-900 dark:text-white tracking-wide">
                              {formatPrice(item.price)}
                            </span>
                            {item.originalPrice && (
                              <span className="text-[9px] text-neutral-400 dark:text-slate-500 line-through">
                                {formatPrice(item.originalPrice)}
                              </span>
                            )}
                          </div>

                          {item.availability ? (
                            qtyInCart > 0 ? (
                              <div className="flex items-center bg-[#132d66]/10 dark:bg-slate-800/50 rounded-full p-0.5 border border-[#132d66]/20 shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeFromCart(item.name);
                                  }}
                                  className="w-6 h-6 rounded-full bg-white dark:bg-[#132d66] text-[#132d66] dark:text-white flex items-center justify-center hover:scale-105 transition-transform"
                                >
                                  <Minus size={10} />
                                </button>
                                <span className="px-1.5 font-bold text-[10px] text-neutral-900 dark:text-white">
                                  {qtyInCart}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addToCart(item.name);
                                  }}
                                  className="w-6 h-6 rounded-full bg-[#132d66] text-white flex items-center justify-center hover:scale-105 transition-transform"
                                >
                                  <Plus size={10} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(item.name);
                                }}
                                className="bg-[#132d66] hover:bg-[#1f4287] text-white font-bold py-1 px-3 rounded-full hover:scale-105 active:scale-95 transition-transform flex items-center gap-1 text-[10px] shadow-sm shrink-0"
                              >
                                <Plus size={10} /> Add
                              </button>
                            )
                          ) : (
                            <span className="text-rose-500 font-bold uppercase tracking-wider text-[9px] shrink-0">
                              {t("soldOut")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-neutral-200 dark:border-slate-900 bg-neutral-100 dark:bg-[#050914] py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#132d66] flex items-center justify-center text-white">
              <Utensils size={18} />
            </div>
            <div>
              <p className="font-serif font-bold text-base dark:text-white">
                Meskel House
              </p>
              <p className="text-[10px] text-neutral-500 dark:text-slate-400 font-light">
                Fine Dining & Ethiopian Soul
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-6 md:gap-10 text-sm font-semibold text-neutral-600 dark:text-slate-300">
            <a
              onClick={() => {
                setActiveCategory("All");
                const el = document.getElementById("catalog-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="hover:text-[#132d66] dark:hover:text-amber-400 transition-colors cursor-pointer"
            >
              Menu
            </a>
            <a
              onClick={() => openDrawerWithTab("fav")}
              className="hover:text-[#132d66] dark:hover:text-amber-400 transition-colors cursor-pointer"
            >
              Favorites
            </a>
            <a
              onClick={() => openDrawerWithTab("orders")}
              className="hover:text-[#132d66] dark:hover:text-amber-400 transition-colors cursor-pointer"
            >
              Track Order
            </a>
            <a
              onClick={() => setIsReserveOpen(true)}
              className="hover:text-[#132d66] dark:hover:text-amber-400 transition-colors cursor-pointer"
            >
              Reservations
            </a>
          </div>

          <p className="text-xs text-neutral-400 dark:text-slate-500">
            © 2026 Meskel House. All rights reserved.
          </p>
        </div>
      </footer>

      {/* FIXED BOTTOM FLOATING CART SLIDE BAR */}
      {cartTotalItems > 0 && !isCartOpen && (
        <div className="fixed inset-x-0 bottom-4 z-30 px-4 md:px-0">
          <div className="max-w-xl mx-auto bg-[#132d66] text-white rounded-2xl shadow-xl flex items-center justify-between p-4 border border-white/10 backdrop-blur-md animate-slide-up">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <ShoppingBag size={18} />
              </div>
              <div>
                <p className="text-xs text-slate-300 font-medium">
                  {cartTotalItems} {t("itemsInOrder")}
                </p>
                <p className="text-base font-bold text-amber-400">
                  Total: {formatPrice(grandTotal)}
                </p>
              </div>
            </div>
            <button
              onClick={() => openDrawerWithTab("cart")}
              className="bg-amber-500 hover:bg-amber-400 active:scale-95 text-neutral-950 font-bold text-xs uppercase tracking-wider py-2.5 px-5 rounded-xl shadow-md transition-all cursor-pointer"
            >
              {t("viewOrder")}
            </button>
          </div>
        </div>
      )}

      {/* ITEM DETAILS MODAL popup */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setSelectedItem(null)}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />

          <div className="relative w-full max-w-md bg-white dark:bg-[#0a0f1d] border border-neutral-200 dark:border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden z-10 animate-scale-up">
            <div className="relative h-56">
              <img
                src={selectedItem.img}
                alt={selectedItem.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 cursor-pointer"
              >
                <X size={16} />
              </button>

              <div className="absolute top-4 left-4 flex flex-col gap-1.5">
                {selectedItem.tag && (
                  <span className="bg-amber-500 text-neutral-950 font-bold text-[9px] uppercase tracking-wider py-1 px-2.5 rounded-full">
                    {selectedItem.tag === "Popular"
                      ? t("popularBadge")
                      : selectedItem.tag === "New"
                        ? t("newBadge")
                        : selectedItem.tag}
                  </span>
                )}
                {!selectedItem.availability && (
                  <span className="bg-rose-500 text-white font-bold text-[9px] uppercase tracking-wider py-1 px-2.5 rounded-full">
                    {t("soldOut")}
                  </span>
                )}
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto pr-2 hide-scrollbar">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="font-serif text-xl font-bold text-neutral-900 dark:text-white">
                    {selectedItem.name}
                  </h3>
                  <p className="text-[10px] text-neutral-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                    {selectedItem.category}
                  </p>
                </div>
                <span className="font-bold text-[#132d66] dark:text-amber-400 text-lg whitespace-nowrap">
                  {formatPrice(selectedItem.price)}
                </span>
              </div>

              <p className="text-xs text-neutral-500 dark:text-slate-400 leading-relaxed">
                {selectedItem.description}
              </p>

              <div className="flex gap-4 p-3 bg-neutral-100 dark:bg-slate-900/40 rounded-2xl text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-slate-400">
                <span>
                  ⏱️ {t("prepLabel")} {selectedItem.prepTime} {t("minutes")}
                </span>
                <span>
                  🔥 {t("calLabel")} {selectedItem.calories} kcal
                </span>
              </div>

              {selectedItem.ingredients &&
                selectedItem.ingredients.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-slate-500">
                      {t("ingLabel")}
                    </p>
                    <p className="text-xs text-neutral-600 dark:text-slate-300 leading-normal">
                      {selectedItem.ingredients.join(", ")}
                    </p>
                  </div>
                )}

              {selectedItem.availability && (
                <div className="space-y-4 pt-3 border-t border-neutral-100 dark:border-slate-800/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-700 dark:text-slate-300">
                      {t("quantity")}
                    </span>
                    <div className="flex items-center bg-neutral-100 dark:bg-slate-900 rounded-full p-1 border border-neutral-200/80 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setDetailQty(Math.max(1, detailQty - 1))}
                        className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 text-neutral-500 flex items-center justify-center"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="px-4 font-bold text-sm text-neutral-900 dark:text-white">
                        {detailQty}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDetailQty(detailQty + 1)}
                        className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 text-neutral-500 flex items-center justify-center"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-slate-500 mb-1">
                      {t("specialInstructions")}
                    </label>
                    <input
                      type="text"
                      placeholder={t("notesPlaceholder")}
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-neutral-900 dark:text-white focus:outline-none focus:border-[#132d66]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => handleToggleFav(selectedItem.name)}
                      className={`py-3 px-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer border ${
                        favorites.includes(selectedItem.name)
                          ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                          : "bg-white dark:bg-slate-900 text-neutral-500 dark:text-slate-400 border-neutral-200 dark:border-slate-800"
                      }`}
                    >
                      <Heart
                        size={14}
                        fill={
                          favorites.includes(selectedItem.name)
                            ? "currentColor"
                            : "none"
                        }
                      />
                      {favorites.includes(selectedItem.name)
                        ? "Liked"
                        : t("addToFavorites")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        addToCart(selectedItem.name, detailQty);
                        if (specialInstructions.trim())
                          setKitchenNote(specialInstructions);
                        setSelectedItem(null);
                        setToastMessage(
                          `${detailQty}x ${selectedItem.name} added to cart`,
                        );
                        setTimeout(() => setToastMessage(""), 4000);
                      }}
                      className="bg-[#132d66] text-white font-bold py-3 rounded-xl text-xs shadow hover:bg-[#1f4287] transition-all cursor-pointer"
                    >
                      {t("addToOrder")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DOCK CART DRAWER PANEL (HOUSES CART, FAVORITES, ACTIVE ORDERS, AND FEEDBACK) */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            onClick={() => setIsCartOpen(false)}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />

          <div className="relative max-w-md w-full h-full bg-white dark:bg-[#080d1a] border-l border-neutral-200 dark:border-slate-800 flex flex-col justify-between z-10 shadow-2xl">
            {/* Drawer Header & Tab Selector (Fav, Orders, Feedback, Cart) */}
            <div className="border-b border-neutral-100 dark:border-slate-800/60 bg-neutral-50 dark:bg-[#0c1428]/45">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#132d66] text-white flex items-center justify-center shadow-inner">
                    <ShoppingBag size={15} />
                  </div>
                  <span className="font-serif text-base font-bold text-neutral-900 dark:text-white">
                    Meskel Services
                  </span>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-1.5 rounded-full hover:bg-neutral-200 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Sub tabs in Drawer */}
              <div className="flex border-t border-neutral-200/60 dark:border-slate-850 text-xs font-semibold px-2">
                {[
                  { id: "cart", label: t("homeTab"), count: cartTotalItems },
                  { id: "fav", label: t("favTab"), count: favorites.length },
                  {
                    id: "orders",
                    label: t("ordersTab"),
                    count: activeCustomerOrders.length,
                  },
                  { id: "feedback", label: t("feedbackTab"), count: 0 },
                ].map((tb) => (
                  <button
                    key={tb.id}
                    onClick={() => setCartDrawerTab(tb.id as any)}
                    className={`flex-1 py-3 text-center border-b-2 relative transition-all cursor-pointer ${
                      cartDrawerTab === tb.id
                        ? "border-[#132d66] dark:border-amber-500 text-neutral-900 dark:text-white font-bold"
                        : "border-transparent text-neutral-500 dark:text-slate-450 hover:text-neutral-700 dark:hover:text-slate-200"
                    }`}
                  >
                    <span className="flex items-center justify-center gap-1 text-[11px] md:text-xs">
                      {tb.label}
                      {tb.count > 0 && (
                        <span className="bg-amber-500 text-neutral-950 font-bold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center">
                          {tb.count}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Drawer Content Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* TAB A: ORDER / CART */}
              {cartDrawerTab === "cart" && (
                <>
                  {cartTotalItems === 0 ? (
                    <div className="text-center py-20 flex flex-col items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-neutral-100 dark:bg-slate-800/40 text-neutral-400 dark:text-slate-650 flex items-center justify-center mb-4">
                        <ShoppingBag size={24} />
                      </div>
                      <p className="font-serif text-sm font-bold text-neutral-800 dark:text-slate-200">
                        Your table order is empty
                      </p>
                      <button
                        onClick={() => setIsCartOpen(false)}
                        className="mt-4 bg-[#132d66] text-white text-[10px] font-bold py-2 px-5 rounded-full cursor-pointer"
                      >
                        Add Dishes +
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-fade-in">
                      {Object.entries(cart).map(([itemName, quantity]) => {
                        const menuItem = menuItems.find(
                          (i) => i.name === itemName,
                        );
                        if (!menuItem) return null;
                        return (
                          <div
                            key={itemName}
                            className="flex gap-3 p-3 rounded-2xl bg-neutral-55 dark:bg-slate-900/35 border border-neutral-200/80 dark:border-slate-800/50"
                          >
                            <img
                              src={menuItem.img}
                              alt={menuItem.name}
                              className="w-12 h-12 rounded-xl object-cover shrink-0"
                            />
                            <div className="flex-1 flex flex-col justify-between min-w-0">
                              <div className="flex justify-between items-start gap-2">
                                <h4 className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                                  {menuItem.name}
                                </h4>
                                <button
                                  onClick={() => removeAllFromCart(itemName)}
                                  className="text-neutral-400 hover:text-rose-500"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                              <div className="flex justify-between items-center mt-1.5">
                                <span className="text-xs font-bold text-[#132d66] dark:text-amber-400">
                                  {formatPrice(menuItem.price * quantity)}
                                </span>

                                <div className="flex items-center bg-white dark:bg-slate-850 rounded-full border border-neutral-200 dark:border-slate-800 scale-90">
                                  <button
                                    onClick={() => removeFromCart(itemName)}
                                    className="w-5 h-5 rounded-full text-neutral-500 flex items-center justify-center"
                                  >
                                    <Minus size={10} />
                                  </button>
                                  <span className="px-2 text-[10px] font-bold text-neutral-900 dark:text-white">
                                    {quantity}
                                  </span>
                                  <button
                                    onClick={() => addToCart(itemName)}
                                    className="w-5 h-5 rounded-full text-neutral-500 flex items-center justify-center"
                                  >
                                    <Plus size={10} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* TAB B: FAVORITES */}
              {cartDrawerTab === "fav" && (
                <div className="space-y-4 animate-fade-in">
                  {favorites.length === 0 ? (
                    <div className="text-center py-20">
                      <Heart
                        size={28}
                        className="text-slate-400 mx-auto mb-3"
                      />
                      <p className="font-serif text-sm font-bold text-neutral-800 dark:text-slate-200">
                        {t("noFavs")}
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-slate-450 mt-1 max-w-[200px] mx-auto leading-normal">
                        {t("noFavsSub")}
                      </p>
                    </div>
                  ) : (
                    favorites.map((favName) => {
                      const item = menuItems.find((i) => i.name === favName);
                      if (!item) return null;
                      return (
                        <div
                          key={item.id}
                          className="flex gap-3 p-3 rounded-2xl bg-neutral-55 dark:bg-slate-900/30 border border-neutral-200/80 dark:border-slate-800/45 items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={item.img}
                              alt={item.name}
                              className="w-12 h-12 rounded-xl object-cover shrink-0"
                            />
                            <div className="min-w-0">
                              <h4 className="text-xs font-semibold text-neutral-900 dark:text-white truncate max-w-[120px]">
                                {item.name}
                              </h4>
                              <span className="text-[10px] font-bold text-[#132d66] dark:text-amber-400">
                                {formatPrice(item.price)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleFav(item.name)}
                              className="text-rose-500 p-1.5 hover:scale-105 active:scale-95"
                            >
                              <Heart size={14} fill="currentColor" />
                            </button>
                            <button
                              onClick={() => {
                                addToCart(item.name);
                                setToastMessage(`${item.name} added to cart`);
                                setTimeout(() => setToastMessage(""), 3000);
                              }}
                              className="bg-[#132d66] text-white text-[10px] font-bold py-1.5 px-3.5 rounded-full hover:scale-105 cursor-pointer shadow-sm"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB C: TRACK ORDERS PROGRESS */}
              {cartDrawerTab === "orders" && (
                <div className="space-y-6 animate-fade-in">
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {t("activeOrders")}
                    </h3>
                    {activeCustomerOrders.length === 0 ? (
                      <p className="text-xs text-neutral-500 dark:text-slate-400 italic font-light">
                        {t("noOrders")}
                      </p>
                    ) : (
                      activeCustomerOrders.map((order) => {
                        const total = order.items.reduce(
                          (s, it) => s + it.quantity * it.price,
                          0,
                        );
                        const isCancelable = order.status === "Pending";

                        const getStepIndex = (status: OrderStatus) => {
                          if (status === "Pending") return 1;
                          if (status === "Accepted" || status === "Preparing")
                            return 2;
                          if (status === "Ready") return 3;
                          if (status === "Served") return 4;
                          return 5;
                        };
                        const currentStep = getStepIndex(order.status);

                        return (
                          <div
                            key={order.id}
                            className="bg-neutral-50 dark:bg-slate-900/35 border border-neutral-200/80 dark:border-slate-800/40 rounded-2xl p-4 space-y-4 shadow-sm"
                          >
                            <div className="flex justify-between items-center text-xs pb-1.5 border-b border-neutral-100 dark:border-slate-800/20">
                              <span className="font-bold text-neutral-900 dark:text-white">
                                #{order.id}
                              </span>
                              <span className="font-bold text-[#132d66] dark:text-amber-400">
                                {formatPrice(total)}
                              </span>
                            </div>

                            <div className="space-y-1 text-xs">
                              {order.items.map((it, i) => (
                                <p
                                  key={i}
                                  className="text-neutral-755 dark:text-slate-300"
                                >
                                  {it.quantity}x {it.name}
                                </p>
                              ))}
                            </div>

                            <div className="flex items-center justify-between text-[10px] pt-2 border-t border-neutral-100 dark:border-slate-800/20">
                              <span className="text-neutral-500 dark:text-slate-400">
                                Prep time: {order.estimatedTime}m
                              </span>
                              {isCancelable && (
                                <button
                                  onClick={() => db.cancelOrder(order.id)}
                                  className="bg-rose-500 hover:bg-rose-400 text-white font-bold px-3 py-1 rounded-lg text-[9px] uppercase tracking-wider transition-colors cursor-pointer"
                                >
                                  {t("cancelOrder")}
                                </button>
                              )}
                              {order.status === "Served" && (
                                <button
                                  onClick={() =>
                                    db.updateOrderStatus(order.id, "Completed")
                                  }
                                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1 rounded-lg text-[9px] uppercase tracking-wider transition-colors cursor-pointer"
                                >
                                  {t("confirmReceipt")}
                                </button>
                              )}
                            </div>

                            {/* Simple Step Bar */}
                            <div className="flex justify-between items-center text-[9px] font-bold text-neutral-400 dark:text-slate-500 pt-2 border-t border-neutral-100 dark:border-slate-800/25">
                              <span
                                className={
                                  currentStep >= 1
                                    ? "text-emerald-500 font-extrabold"
                                    : ""
                                }
                              >
                                Placed
                              </span>
                              <span
                                className={
                                  currentStep >= 2
                                    ? "text-emerald-500 font-extrabold"
                                    : ""
                                }
                              >
                                Cooking
                              </span>
                              <span
                                className={
                                  currentStep >= 3
                                    ? "text-emerald-500 font-extrabold"
                                    : ""
                                }
                              >
                                Ready
                              </span>
                              <span
                                className={
                                  currentStep >= 4
                                    ? "text-emerald-500 font-extrabold"
                                    : ""
                                }
                              >
                                Served
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="space-y-3 pt-4 border-t border-neutral-200 dark:border-slate-800/50">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {t("orderHistory")}
                    </h3>
                    {historicalCustomerOrders.length === 0 ? (
                      <p className="text-xs text-neutral-400 dark:text-slate-500 italic font-light">
                        No completed orders.
                      </p>
                    ) : (
                      historicalCustomerOrders.map((order) => {
                        const total = order.items.reduce(
                          (s, it) => s + it.quantity * it.price,
                          0,
                        );
                        return (
                          <div
                            key={order.id}
                            className="bg-neutral-50 dark:bg-slate-900/10 rounded-xl p-3 flex justify-between items-center text-xs opacity-70"
                          >
                            <span>
                              #{order.id} (
                              {new Date(order.timestamp).toLocaleDateString()})
                            </span>
                            <span className="font-bold text-neutral-800 dark:text-slate-400">
                              {formatPrice(total)}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB D: FEEDBACK LOGS */}
              {cartDrawerTab === "feedback" && (
                <div className="animate-fade-in">
                  {feedbackSubmitted ? (
                    <div className="text-center py-16 flex flex-col items-center justify-center bg-neutral-50 dark:bg-slate-900/20 rounded-3xl p-6 border border-neutral-150 dark:border-slate-800/40">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center mb-3 animate-bounce">
                        <Check size={22} />
                      </div>
                      <p className="font-serif text-base font-bold text-neutral-800 dark:text-slate-200">
                        {t("feedbackSuccess")}
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handlePlaceFeedback} className="space-y-5">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                          {t("feedbackRateTitle")}
                        </label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setFeedbackRating(star)}
                              className="text-amber-500 transition-transform active:scale-110"
                            >
                              <Star
                                size={26}
                                fill={
                                  star <= feedbackRating
                                    ? "currentColor"
                                    : "none"
                                }
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                          {t("feedbackType")}
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { type: "feedback", label: "Review" },
                            { type: "issue", label: t("issue") },
                            { type: "suggestion", label: t("suggestion") },
                          ].map((btn) => (
                            <button
                              key={btn.type}
                              type="button"
                              onClick={() => setFeedbackType(btn.type as any)}
                              className={`py-2 px-1 text-[10px] font-bold uppercase tracking-wider border rounded-xl cursor-pointer ${
                                feedbackType === btn.type
                                  ? "bg-[#132d66] text-white border-transparent"
                                  : "bg-white dark:bg-slate-900 text-neutral-500 dark:text-slate-400 border-neutral-200 dark:border-slate-800"
                              }`}
                            >
                              {btn.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                          {t("feedbackWriteTitle")}
                        </label>
                        <textarea
                          required
                          rows={4}
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          className="w-full text-xs px-3.5 py-3 rounded-xl border border-neutral-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-neutral-900 dark:text-white focus:outline-none focus:border-[#132d66] resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-[#132d66] hover:bg-[#1f4287] text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow active:scale-98 transition-all"
                      >
                        {t("feedbackSubmit")}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Drawer checkout options footer (ONLY VISIBLE ON CART TAB) */}
            {cartDrawerTab === "cart" && cartTotalItems > 0 && (
              <div className="p-6 border-t border-neutral-100 dark:border-slate-800/60 bg-neutral-50 dark:bg-[#0c1428]/40 space-y-4">
                {/* Math calculations list */}
                <div className="space-y-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-slate-500">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="text-neutral-900 dark:text-white">
                      {formatPrice(subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>VAT (15%)</span>
                    <span className="text-neutral-900 dark:text-white">
                      {formatPrice(tax)}
                    </span>
                  </div>
                  <div className="flex justify-between pb-1.5 border-b border-neutral-200 dark:border-slate-800/60">
                    <span>Service Fee</span>
                    <span className="text-neutral-900 dark:text-white">
                      {formatPrice(serviceCharge)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-neutral-900 dark:text-white pt-1.5">
                    <span>Grand Total</span>
                    <span className="text-amber-500 font-bold text-sm">
                      {formatPrice(grandTotal)}
                    </span>
                  </div>
                </div>

                {/* Checkout forms */}
                <form onSubmit={handlePlaceOrder} className="space-y-3 pt-1">
                  <div className="flex gap-3">
                    <div className="w-20">
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Table
                      </label>
                      <input
                        type="text"
                        required
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        className="w-full text-center px-3 py-2 border border-neutral-300 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs font-bold text-neutral-900 dark:text-white focus:outline-none focus:border-[#132d66]"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Note
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Spiced, allergies..."
                        value={kitchenNote}
                        onChange={(e) => setKitchenNote(e.target.value)}
                        className="w-full px-3.5 py-2 border border-neutral-300 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-[#132d66]"
                      />
                    </div>
                  </div>

                  {orderStatus === "loading" ? (
                    <button
                      type="button"
                      disabled
                      className="w-full bg-[#132d66]/50 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-xs cursor-not-allowed"
                    >
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending Order...
                    </button>
                  ) : orderStatus === "success" ? (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center text-emerald-400">
                      <p className="font-bold text-xs">
                        {t("orderSentSuccess")}
                      </p>
                      <p className="text-[9px] mt-0.5 font-light">
                        {t("orderSentSuccessSub")}
                      </p>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      className="w-full bg-[#132d66] hover:bg-[#1f4287] text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider shadow active:scale-[0.98] transition-all cursor-pointer"
                    >
                      {t("orderNow")}
                    </button>
                  )}
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RESERVE A TABLE POPUP MODAL */}
      {isReserveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setIsReserveOpen(false)}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />

          <div className="relative w-full max-w-sm bg-white dark:bg-[#0a0f1d] border border-neutral-200 dark:border-slate-800 rounded-[2rem] shadow-2xl p-6 z-10 animate-scale-up">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-slate-800 pb-3 mb-4">
              <h4 className="font-serif text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                <Sparkles size={16} className="text-amber-500" />{" "}
                {t("reserveTable")}
              </h4>
              <button
                onClick={() => setIsReserveOpen(false)}
                className="p-1 rounded-full hover:bg-neutral-105 text-slate-400 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {reserveStatus === "success" ? (
              <div className="p-6 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center mb-3">
                  <Check size={24} />
                </div>
                <h5 className="font-serif text-lg font-bold text-neutral-900 dark:text-white">
                  {t("reserveSuccess")}
                </h5>
                <p className="text-[10px] text-neutral-500 dark:text-slate-400 mt-1 max-w-[200px] leading-normal">
                  {t("reserveSuccessSub")}
                </p>
              </div>
            ) : (
              <form onSubmit={handlePlaceReservation} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={reserveName}
                    onChange={(e) => setReserveName(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-neutral-900 dark:text-white focus:outline-none focus:border-[#132d66]"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={reservePhone}
                    onChange={(e) => setReservePhone(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-neutral-900 dark:text-white focus:outline-none focus:border-[#132d66]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Guests
                    </label>
                    <select
                      value={reserveGuests}
                      onChange={(e) => setReserveGuests(e.target.value)}
                      className="w-full text-xs px-2.5 py-2.5 rounded-xl border border-neutral-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-neutral-900 dark:text-white focus:outline-none focus:border-[#132d66]"
                    >
                      <option value="1">1 Person</option>
                      <option value="2">2 People</option>
                      <option value="3">3 People</option>
                      <option value="4">4 People</option>
                      <option value="5">5+ People</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      required
                      value={reserveDate}
                      onChange={(e) => setReserveDate(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-neutral-900 dark:text-white focus:outline-none focus:border-[#132d66]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    required
                    value={reserveTime}
                    onChange={(e) => setReserveTime(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-neutral-900 dark:text-white focus:outline-none focus:border-[#132d66]"
                  />
                </div>

                {reserveStatus === "loading" ? (
                  <button
                    type="button"
                    disabled
                    className="w-full bg-[#132d66]/50 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-xs cursor-not-allowed mt-2"
                  >
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Checking Availability...
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-xl text-xs transition-all shadow cursor-pointer mt-2"
                  >
                    Confirm Reservation
                  </button>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
