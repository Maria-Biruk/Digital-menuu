'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  Heart,
  ThumbsUp,
  Sparkles,
  Calendar,
  User,
  Phone,
  Moon,
  Sun,
  Coffee,
  CheckCircle2,
  ChevronRight,
  MessageSquare,
  ShieldCheck,
  SlidersHorizontal,
  UtensilsCrossed,
} from 'lucide-react';
import { Lang, ServiceMode, MenuItem, FulfillmentType } from '../lib/types';
import { MENU, CATEGORIES, TABLES, SLUG, tI18n, addTicketToStorage } from '../lib/mock';
import LanguageSwitcher from './LanguageSwitcher';
import CallWaiterButton from './CallWaiterButton';
import Cart, { CartLine } from './Cart';
import TogetherOrSeparatePrompt from './TogetherOrSeparatePrompt';

interface DigitalMenuViewProps {
  tableId?: string;
  slug?: string;
  initialLang?: Lang;
}

export default function DigitalMenuView({
  tableId = 't1',
  slug = SLUG,
  initialLang = 'en',
}: DigitalMenuViewProps) {
  const router = useRouter();

  // Language & Theme State
  const [lang, setLang] = useState<Lang>(initialLang);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Search & Filter State
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDietary, setSelectedDietary] = useState<string | null>(null);

  // Cart State
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [serviceMode, setServiceMode] = useState<ServiceMode>('together');
  const [addedItemNotification, setAddedItemNotification] = useState<string | null>(null);

  // Detail Modal State
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null);
  const [modalQty, setModalQty] = useState(1);
  const [modalInstructions, setModalInstructions] = useState('');
  const [modalFulfillment, setModalFulfillment] = useState<FulfillmentType>('takeaway');
  const [modalPhone, setModalPhone] = useState('');
  const [itemLikes, setItemLikes] = useState<Record<string, number>>({});
  const [userLikedItems, setUserLikedItems] = useState<Record<string, boolean>>({});

  // Reservation Modal State
  const [isReserveOpen, setIsReserveOpen] = useState(false);
  const [reserveName, setReserveName] = useState('');
  const [reservePhone, setReservePhone] = useState('');
  const [reserveGuests, setReserveGuests] = useState('2');
  const [reserveDate, setReserveDate] = useState('');
  const [reserveTime, setReserveTime] = useState('19:00');
  const [reserveNotes, setReserveNotes] = useState('');
  const [reserveStatus, setReserveStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Theme toggle handler
  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  // Table label resolution
  const tableObj = TABLES.find((t) => t.id === tableId);
  const tableDisplay =
    tableId === 'takeaway'
      ? 'Takeaway Order'
      : tableObj
      ? `Table ${tableObj.label}`
      : `Table ${tableId.toUpperCase()}`;

  // Filter menu items
  const filteredItems = useMemo(() => {
    return MENU.filter((item) => {
      const matchCat =
        activeCategory === 'all' || item.category_id === activeCategory;
      const matchSearch =
        !searchQuery.trim() ||
        tI18n(item.name_i18n, lang).toLowerCase().includes(searchQuery.toLowerCase()) ||
        tI18n(item.description_i18n, lang).toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.ingredients && item.ingredients.some((ing) => ing.toLowerCase().includes(searchQuery.toLowerCase())));
      const matchDietary =
        !selectedDietary || (item.dietary_tags && item.dietary_tags.includes(selectedDietary));
      return matchCat && matchSearch && matchDietary;
    });
  }, [activeCategory, searchQuery, selectedDietary, lang]);

  // Featured Categories & Milkshakes for Top Showcase
  const topCoffeeItems = useMemo(() => {
    return MENU.filter((m) => m.category_id === 'cat-coffee-drinks').slice(0, 4);
  }, []);

  const topMilkshakeItems = useMemo(() => {
    return MENU.filter((m) => m.category_id === 'cat-milkshakes').slice(0, 4);
  }, []);

  // Cart operations
  const addToCart = (itemId: string, qty: number = 1, instructions?: string) => {
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
            : l
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
        prev.map((l) => (l.itemId === itemId ? { ...l, qty: newQty } : l))
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
    .filter(Boolean) as { itemId: string; qty: number; instructions?: string; item: MenuItem }[];

  const subtotal = cartItems.reduce((s, cur) => s + cur.item.price * cur.qty, 0);
  const grandTotal = subtotal + Math.round(subtotal * 0.15) + (cartLines.length > 0 ? 25 : 0);

  const hasFood = cartItems.some((ci) => ci.item.station === 'kitchen');
  const hasDrink = cartItems.some((ci) => ci.item.station === 'bar');

  const handlePlaceOrder = () => {
    if (cartLines.length === 0) return;
    const fakeOrderId = `ord-${Math.floor(1000 + Math.random() * 9000)}`;
    router.push(`/${slug}/order/${fakeOrderId}?table=${tableId}&lang=${lang}`);
  };

  // Dish Detail click handler
  const openDishDetail = (dish: MenuItem) => {
    setSelectedDish(dish);
    setModalQty(1);
    setModalInstructions('');
    setModalFulfillment('takeaway');
    setModalPhone('');
  };

  // Direct Order click handler (Orders immediately, not Add to Basket)
  const handleDirectOrder = (dish: MenuItem) => {
    const isTakeaway = modalFulfillment === 'takeaway' || tableId === 'takeaway';
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const fakeOrderId = `ord-${randNum}${isTakeaway ? '-takeaway' : ''}`;
    const pickupCode = `${Math.floor(1000 + Math.random() * 9000)}`;

    const tableLabelText = isTakeaway
      ? (modalPhone.trim() ? `Takeaway (${modalPhone.trim()})` : 'Takeaway Order')
      : tableDisplay;

    addTicketToStorage({
      id: `tkt-${Date.now().toString().slice(-6)}`,
      order_id: fakeOrderId,
      station: dish.station,
      table_label: tableLabelText,
      items: [
        {
          name: tI18n(dish.name_i18n, 'en'),
          quantity: modalQty,
          notes: modalInstructions.trim() || undefined,
        },
      ],
      status: 'queue',
      pickup_code: pickupCode,
      notes: isTakeaway
        ? `TAKEAWAY / TO-GO PACKAGING${modalPhone.trim() ? ` • Phone: ${modalPhone.trim()}` : ''}`
        : undefined,
      created_at: new Date().toISOString(),
      elapsed_minutes: 0,
    });

    setSelectedDish(null);

    const cleanPhone = encodeURIComponent(modalPhone.trim() || '');
    router.push(
      `/${slug}/order/${fakeOrderId}?table=${isTakeaway ? 'takeaway' : tableId}&lang=${lang}&item=${dish.id}&qty=${modalQty}&fulfillment=${isTakeaway ? 'takeaway' : 'dine-in'}&phone=${cleanPhone}`
    );
  };

  // Like click handler
  const handleToggleLike = (itemId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isLiked = userLikedItems[itemId];
    setUserLikedItems((prev) => ({ ...prev, [itemId]: !isLiked }));
    setItemLikes((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + (isLiked ? -1 : 1),
    }));
  };

  const getItemLikeCount = (item: MenuItem) => {
    const baseLikes = item.likes || 25;
    const offset = itemLikes[item.id] || 0;
    return baseLikes + offset;
  };

  // Reservation submit handler
  const handlePlaceReservation = (e: React.FormEvent) => {
    e.preventDefault();
    setReserveStatus('loading');
    setTimeout(() => {
      setReserveStatus('success');
      setTimeout(() => {
        setIsReserveOpen(false);
        setReserveStatus('idle');
        setReserveName('');
        setReservePhone('');
        setReserveNotes('');
      }, 3000);
    }, 1200);
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 font-sans selection:bg-amber-400 selection:text-black ${
        isDarkMode
          ? 'bg-[#150c07] text-[#f5ebd9]'
          : 'bg-[#F5ECD7] text-[#2B1810]'
      }`}
    >
      {/* Toast Notification */}
      {addedItemNotification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="px-5 py-3 rounded-full bg-[#2B1810] dark:bg-[#3d2417] text-white text-xs font-bold shadow-2xl flex items-center gap-2.5 border border-amber-500/40">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>Added {addedItemNotification} to order</span>
          </div>
        </div>
      )}

      {/* TOP HEADER / APP BAR */}
      <header
        className={`sticky top-0 z-30 transition-colors duration-300 backdrop-blur-xl border-b py-3 px-4 sm:px-8 ${
          isDarkMode
            ? 'bg-[#1e110a]/90 border-[#382015] shadow-lg shadow-black/40'
            : 'bg-[#FAF5EC]/95 border-[#D4B896] shadow-sm shadow-amber-900/10'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#FAF7F2] flex items-center justify-center shadow-md overflow-hidden border border-[#2B1810]/20 shrink-0">
              <img
                src="/skill-coffee-icon.png"
                alt="Skill Coffee"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="font-serif font-bold text-base sm:text-lg tracking-tight leading-tight text-[#2B1810] dark:text-[#f8ede1]">
                Skill Coffee
              </h1>
              <p className="text-[10px] sm:text-xs text-stone-500 dark:text-[#bda490] font-medium hidden sm:block">
                Meskel House Addis Ababa · Specialty Roasters & Fine Dining
              </p>
            </div>
          </div>

          {/* Quick Nav / Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle Dark Mode"
              className={`p-2 sm:px-3 sm:py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isDarkMode
                  ? 'bg-[#2b1810] border-[#4a2b1c] text-amber-300 hover:bg-[#3a2115]'
                  : 'bg-stone-100 border-stone-200 text-neutral-700 hover:bg-stone-200'
              }`}
            >
              {isDarkMode ? (
                <>
                  <Sun size={15} className="text-amber-400 animate-spin-slow" />
                  <span className="hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon size={15} className="text-stone-700" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              )}
            </button>

            {/* Language Switcher */}
            <LanguageSwitcher currentLang={lang} onChange={setLang} />

            {/* Cart Trigger in header */}
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className={`relative p-2 sm:px-3 sm:py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isDarkMode
                  ? 'bg-[#2b1810] border-[#4a2b1c] text-white hover:bg-[#3a2115]'
                  : 'bg-[#2B1810] text-white border-transparent hover:bg-[#3D2415]'
              }`}
            >
              <ShoppingBag size={15} className="text-amber-400" />
              <span className="hidden sm:inline">Order</span>
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
        {/* ========================================================= */}
        {/* HERO SECTION (Requested in Photo 1) */}
        {/* ========================================================= */}
        <section className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-stone-800/40 min-h-[340px] sm:min-h-[420px] flex items-center bg-stone-950">
          {/* Background image with high quality gastronomy & roast visuals */}
          <img
            src="https://images.unsplash.com/photo-1544025162-d76694265947?w=1600&auto=format&fit=crop&q=85"
            alt="A menu made to be savoured"
            className="absolute inset-0 w-full h-full object-cover object-center scale-105 filter brightness-75"
          />

          {/* Deep dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/75 to-black/40 sm:to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30" />

          {/* Hero Content */}
          <div className="relative z-10 max-w-2xl p-6 sm:p-10 lg:p-12 space-y-4 sm:space-y-6">
            {/* Top Star Rating & Location Badge */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-xs sm:text-sm font-semibold border border-white/15 shadow-lg">
              <Star size={14} className="fill-amber-400 text-amber-400" />
              <span>4.9 · Addis Ababa</span>
            </div>

            {/* Headline */}
            <h2 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.1]">
              A menu made to be savoured
            </h2>

            {/* Subtitle */}
            <p className="text-xs sm:text-base text-stone-200/90 font-light leading-relaxed max-w-lg">
              Seasonal plates, single-origin coffee and craft cocktails — served in the heart of Addis Ababa.
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

              <button
                type="button"
                onClick={() => setIsReserveOpen(true)}
                className="px-6 py-3.5 rounded-full bg-stone-900/80 hover:bg-stone-800 text-white border border-stone-700/80 backdrop-blur-md font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-xl active:scale-95 transition-all cursor-pointer"
              >
                <Calendar size={15} className="text-amber-400" />
                <span>Reserve a table</span>
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* FRESHLY ROASTED COFFEE BANNER (From Photo 2) */}
        {/* ========================================================= */}
        <section
          className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 border transition-all ${
            isDarkMode
              ? 'bg-gradient-to-r from-[#29170e] via-[#3d2315] to-[#1c0f08] border-[#4a2a19] shadow-xl'
              : 'bg-gradient-to-r from-[#C8956C]/30 via-[#D4A574]/20 to-[#C8956C]/30 border-[#D4B896] shadow-sm'
          }`}
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-700 dark:text-amber-400">
                Freshly Roasted
              </span>
              <h3 className="font-serif text-2xl sm:text-4xl font-bold tracking-tight text-[#2B1810] dark:text-[#f7e6d2]">
                COFFEE & ARTISAN ROASTS
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-[#bda490] max-w-md">
                Hand-selected Yirgacheffe and Sidama Arabica beans roasted daily on site. Smooth crema, rich body.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <a
                href="#menu-section"
                onClick={() => setActiveCategory('cat-coffee-drinks')}
                className="px-6 py-3 rounded-full bg-[#2B1810] hover:bg-[#3D2415] text-white dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-stone-950 font-serif font-bold text-xs sm:text-sm shadow-lg active:scale-95 transition-transform"
              >
                Shop Now
              </a>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* TOP CATEGORIES / DRINKS (From Photo 2) */}
        {/* ========================================================= */}
        <section className="space-y-4">
          <div className="text-center space-y-1">
            <h3 className="font-serif text-sm sm:text-base font-bold uppercase tracking-widest text-[#2B1810] dark:text-[#E2A66C]">
              TOP CATEGORIES
            </h3>
            <p className="text-[11px] sm:text-xs text-stone-500 dark:text-[#b89e8b]">
              Explore The Recent Most Bought Drinks This Week
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {topCoffeeItems.map((item) => (
              <div
                key={item.id}
                onClick={() => openDishDetail(item)}
                className={`group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] border ${
                  isDarkMode
                    ? 'bg-[#26150d] border-[#442618] shadow-md shadow-black/40 hover:border-amber-500/50'
                    : 'bg-[#FAF5EC] border-[#D4B896] shadow-sm hover:shadow-md hover:border-amber-600/40'
                }`}
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100 dark:bg-stone-900">
                  <img
                    src={item.image_path}
                    alt={tI18n(item.name_i18n, lang)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-2.5 inset-x-2.5 text-center">
                    <p className="font-serif text-xs sm:text-sm font-bold text-white tracking-wide truncate">
                      {tI18n(item.name_i18n, lang)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================= */}
        {/* TOP MILK SHAKES (From Photo 2) */}
        {/* ========================================================= */}
        <section className="space-y-4">
          <div className="text-center space-y-1">
            <h3 className="font-serif text-sm sm:text-base font-bold uppercase tracking-widest text-[#2B1810] dark:text-[#E2A66C]">
              TOP MILK SHAKES
            </h3>
            <p className="text-[11px] sm:text-xs text-stone-500 dark:text-[#b89e8b]">
              Explore The Recent Most Bought Shakes This Week
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {topMilkshakeItems.map((item) => (
              <div
                key={item.id}
                onClick={() => openDishDetail(item)}
                className={`group relative overflow-hidden rounded-3xl p-3 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:scale-[1.02] border ${
                  isDarkMode
                    ? 'bg-[#24130b] border-[#442417] shadow-lg shadow-black/40 hover:border-amber-500/50'
                    : 'bg-[#FAF5EC] border-[#D4B896] shadow-sm hover:shadow-md hover:border-amber-600/40'
                }`}
              >
                {/* Image & Like Badge */}
                <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-900 mb-2.5">
                  <img
                    src={item.image_path}
                    alt={tI18n(item.name_i18n, lang)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Thumbs up badge (From Photo 2) */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleLike(item.id, e)}
                    className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/65 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 border border-white/10 hover:bg-black/80 transition-colors"
                  >
                    <ThumbsUp
                      size={10}
                      className={userLikedItems[item.id] ? 'text-amber-400 fill-amber-400' : 'text-stone-300'}
                    />
                    <span>{getItemLikeCount(item)}</span>
                  </button>

                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-amber-500 text-stone-950 text-[9px] font-extrabold uppercase">
                    {item.avg_prep_minutes}m
                  </div>
                </div>

                {/* Shake Title */}
                <div className="text-center py-1">
                  <h4 className="font-serif text-xs sm:text-sm font-bold text-[#2B1810] dark:text-[#f8ede1] leading-tight truncate">
                    {tI18n(item.name_i18n, lang)}
                  </h4>
                </div>

                {/* Price and Buy Now Pill Button (From Photo 2) */}
                <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-stone-100 dark:border-stone-800/80">
                  <span className="px-2 py-1 rounded-lg bg-stone-100 dark:bg-[#1a0e08] text-[10px] sm:text-xs font-bold text-stone-800 dark:text-stone-300 border border-stone-200 dark:border-stone-800">
                    {item.price} ETB
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDishDetail(item);
                    }}
                    className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      isDarkMode
                        ? 'bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md'
                        : 'bg-[#2B1810] hover:bg-[#3D2415] text-white shadow-sm'
                    }`}
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            ))}
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

            {/* Quick Dietary Filter Badges */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
              {['vegetarian', 'vegan', 'halal', 'spicy', 'gluten-free'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedDietary(selectedDietary === tag ? null : tag)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0 border ${
                    selectedDietary === tag
                      ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-sm'
                      : isDarkMode
                      ? 'bg-[#26150d] text-stone-300 border-[#442618] hover:bg-[#331c11]'
                      : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {tag}
                </button>
              ))}
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
                  ? 'bg-[#26150d] border-[#442618] text-white placeholder-stone-500 focus:border-amber-500'
                  : 'bg-white border-stone-200 text-neutral-900 placeholder-stone-400 focus:border-[#2B1810]'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-3.5 text-stone-400 hover:text-stone-700 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Category Chips Bar */}
          <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`px-4 py-2.5 rounded-full text-xs font-bold tracking-wide transition-all shrink-0 cursor-pointer ${
                activeCategory === 'all'
                  ? isDarkMode
                    ? 'bg-amber-500 text-stone-950 shadow-md font-extrabold'
                    : 'bg-[#2B1810] text-white shadow-md'
                  : isDarkMode
                  ? 'bg-[#26150d] border border-[#442618] text-stone-300 hover:bg-[#351e13]'
                  : 'bg-white border border-stone-200 text-neutral-700 hover:bg-stone-50'
              }`}
            >
              All Dishes ({MENU.length})
            </button>

            {CATEGORIES.map((cat) => {
              const count = MENU.filter((m) => m.category_id === cat.id).length;
              const isSelected = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2.5 rounded-full text-xs font-bold tracking-wide transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? isDarkMode
                        ? 'bg-amber-500 text-stone-950 shadow-md font-extrabold'
                        : 'bg-[#2B1810] text-white shadow-md'
                      : isDarkMode
                      ? 'bg-[#26150d] border border-[#442618] text-stone-300 hover:bg-[#351e13]'
                      : 'bg-white border border-stone-200 text-neutral-700 hover:bg-stone-50'
                  }`}
                >
                  <span>{tI18n(cat.name_i18n, lang)}</span>
                  <span
                    className={`text-[10px] ${
                      isSelected
                        ? isDarkMode
                          ? 'text-stone-950'
                          : 'text-amber-300'
                        : 'text-stone-400'
                    }`}
                  >
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>

          {/* ========================================================= */}
          {/* MENU GRID — EVERY CARD IS FULLY CLICKABLE (Requested) */}
          {/* ========================================================= */}
          {filteredItems.length === 0 ? (
            <div
              className={`text-center py-20 p-6 rounded-3xl border ${
                isDarkMode
                  ? 'bg-[#24130b] border-[#442417] text-stone-400'
                  : 'bg-white border-stone-200 text-neutral-500'
              }`}
            >
              <Utensils size={32} className="mx-auto mb-3 opacity-40" />
              <p className="font-serif text-base font-bold text-neutral-800 dark:text-stone-200">
                No matching items found
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                Try clearing search terms or selecting a different category.
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
                        ? 'bg-[#24130b] border-[#442417] shadow-lg shadow-black/30 hover:border-amber-500/50'
                        : 'bg-[#FAF5EC] border-[#D4B896] shadow-sm hover:shadow-lg hover:border-amber-600/50'
                    }`}
                  >
                    {/* Dish Image with badges */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100 dark:bg-stone-900">
                      <img
                        src={dish.image_path}
                        alt={tI18n(dish.name_i18n, lang)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />

                      {/* Prep time badge */}
                      <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-sm text-white text-[10px] font-bold flex items-center gap-1 border border-white/10">
                        <Clock size={10} className="text-amber-400" />
                        <span>{dish.avg_prep_minutes}m</span>
                      </div>

                      {/* Dietary / Special Tag */}
                      <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1">
                        {dish.tag && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 text-[9px] font-extrabold uppercase tracking-wider shadow-sm">
                            {dish.tag}
                          </span>
                        )}
                        {dish.dietary_tags?.[0] && (
                          <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-[9px] font-bold uppercase tracking-wider border border-white/10">
                            {dish.dietary_tags[0]}
                          </span>
                        )}
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
                            <span className="text-xs font-bold px-1">{qtyInCart}</span>
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
                ? 'bg-[#1e1009] border-[#442417] text-[#f7e6d2]'
                : 'bg-white border-stone-200 text-[#2B1810]'
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
                  <span key={d} className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider border border-white/20">
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
                  {selectedDish.name_i18n.am && lang !== 'am' && (
                    <p className="text-xs text-amber-300 font-medium">{selectedDish.name_i18n.am}</p>
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
                    ? 'bg-[#29160d] border border-[#3d2114]'
                    : 'bg-stone-50 border border-stone-200'
                }`}
              >
                <div className="flex flex-col items-center justify-center">
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider">
                    {lang === 'am' ? 'የዝግጅት ጊዜ' : lang === 'om' ? 'Yeroo Qophii' : 'Prep Time'}
                  </span>
                  <span className="font-bold text-[#2B1810] dark:text-stone-200 flex items-center gap-1 mt-0.5">
                    <Clock size={12} className="text-amber-500" />
                    {selectedDish.avg_prep_minutes} {lang === 'am' ? 'ደቂቃ' : lang === 'om' ? 'daqiiqaa' : 'mins'}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center border-x border-stone-200 dark:border-stone-800">
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider">
                    {lang === 'am' ? 'ካሎሪ' : lang === 'om' ? 'Kaalorii' : 'Calories'}
                  </span>
                  <span className="font-bold text-[#2B1810] dark:text-stone-200 flex items-center gap-1 mt-0.5">
                    <Flame size={12} className="text-rose-500" />
                    {selectedDish.calories || 450} kcal
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center">
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider">
                    {lang === 'am' ? 'ደረጃ' : lang === 'om' ? 'Sadarkaa' : 'Rating'}
                  </span>
                  <span className="font-bold text-[#2B1810] dark:text-stone-200 flex items-center gap-1 mt-0.5">
                    <Star size={12} className="fill-amber-400 text-amber-400" />
                    {selectedDish.rating || 4.9} ({selectedDish.reviews_count || 120})
                  </span>
                </div>
              </div>

              {/* Full Description */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-stone-400">
                  {lang === 'am' ? 'ዝርዝር መግለጫ' : lang === 'om' ? 'Ibsa' : 'Description'}
                </h4>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-[#c4ad9b] leading-relaxed">
                  {tI18n(selectedDish.description_i18n, lang)}
                </p>
              </div>

              {/* Ingredients Chips */}
              {selectedDish.ingredients && selectedDish.ingredients.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-stone-400">
                    {lang === 'am' ? 'ንጥረ ነገሮች' : lang === 'om' ? 'Qabiyyee' : 'Fresh Ingredients'}
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDish.ingredients.map((ing, idx) => (
                      <span
                        key={idx}
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${
                          isDarkMode
                            ? 'bg-[#29160d] text-amber-200 border-[#4a2b1b]'
                            : 'bg-stone-100 text-neutral-800 border-stone-200'
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
                  {lang === 'am'
                    ? 'ልዩ ማስታወሻ / አለርጂ ጥያቄ'
                    : lang === 'om'
                    ? 'Gabaasa Addaa / Qophii Addaa'
                    : 'Special Kitchen Note / Allergen Request'}
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    lang === 'am'
                      ? 'ለምሳሌ፡ ስኳር ይቀነስ፣ በርበሬ ይጨመርበት፣ ወተት ይቀየር...'
                      : lang === 'om'
                      ? 'Fkn: Sukkara xiqqeessi, mi\'eessituu dabalii...'
                      : 'e.g. Less sugar, extra spicy, sauce on the side, oat milk...'
                  }
                  value={modalInstructions}
                  onChange={(e) => setModalInstructions(e.target.value)}
                  className={`w-full p-3 rounded-2xl text-xs sm:text-sm border focus:outline-none transition-all ${
                    isDarkMode
                      ? 'bg-[#29160d] border-[#442417] text-white placeholder-stone-500 focus:border-amber-500'
                      : 'bg-stone-50 border-stone-200 text-neutral-900 placeholder-stone-400 focus:border-[#2B1810]'
                  }`}
                />
              </div>

              {/* Dine-in / Takeaway Toggle */}
              <div className="space-y-2">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-400">
                  {lang === 'am' ? 'አገልግሎት ዓይነት' : 'Order Type'}
                </label>
                <div className={`grid grid-cols-2 gap-1.5 p-1 rounded-2xl border ${isDarkMode ? 'bg-[#29160d] border-[#3d2114]' : 'bg-stone-100 border-stone-200'}`}>
                  <button
                    type="button"
                    onClick={() => setModalFulfillment('dine-in')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      modalFulfillment === 'dine-in'
                        ? 'bg-[#2B1810] text-amber-300 shadow-md'
                        : isDarkMode ? 'text-stone-400 hover:text-stone-200' : 'text-stone-500 hover:text-stone-700'
                    }`}
                  >
                    <UtensilsCrossed size={13} />
                    {lang === 'am' ? 'ቤት ውስጥ' : 'Dine-in'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalFulfillment('takeaway')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      modalFulfillment === 'takeaway'
                        ? 'bg-[#2B1810] text-amber-300 shadow-md'
                        : isDarkMode ? 'text-stone-400 hover:text-stone-200' : 'text-stone-500 hover:text-stone-700'
                    }`}
                  >
                    <ShoppingBag size={13} />
                    {lang === 'am' ? 'ይዞ መሄድ' : 'Takeaway'}
                  </button>
                </div>
                {modalFulfillment === 'takeaway' && (
                  <input
                    type="tel"
                    placeholder={lang === 'am' ? 'የስልክ ቁጥር (ለምሳሌ፡ 0911 234 567)' : 'Phone for pickup SMS (e.g. 0911 234 567)'}
                    value={modalPhone}
                    onChange={(e) => setModalPhone(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs border focus:outline-none focus:border-amber-500 transition-colors ${isDarkMode ? 'bg-[#1C1109] border-stone-700 text-stone-100 placeholder:text-stone-500' : 'bg-white border-stone-200 text-stone-900 placeholder:text-stone-400'}`}
                  />
                )}
              </div>

              {/* Interactive Like & Share */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => handleToggleLike(selectedDish.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                    userLikedItems[selectedDish.id]
                      ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                      : isDarkMode
                      ? 'bg-[#29160d] text-stone-300 border-[#3d2114]'
                      : 'bg-stone-100 text-stone-700 border-stone-200'
                  }`}
                >
                  <ThumbsUp
                    size={14}
                    className={userLikedItems[selectedDish.id] ? 'fill-rose-500 text-rose-500' : ''}
                  />
                  <span>
                    {userLikedItems[selectedDish.id]
                      ? (lang === 'am' ? 'ተወዷል!' : 'Liked!')
                      : (lang === 'am' ? 'ይህን ምግብ ውደድ' : 'Like this item')}{' '}
                    ({getItemLikeCount(selectedDish)})
                  </span>
                </button>
                <span className="text-[11px] text-stone-400 font-medium">
                  {lang === 'am' ? 'Freshly made' : 'Freshly made to order'}
                </span>
              </div>
            </div>

            {/* Sticky Footer: Stepper + Order Now */}
            <div
              className={`sticky bottom-0 p-4 sm:p-5 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ${
                isDarkMode
                  ? 'bg-[#1e1009] border-[#381c10]'
                  : 'bg-white border-stone-200'
              }`}
            >
              {/* Quantity Stepper */}
              <div className="flex items-center justify-between sm:justify-start gap-2.5">
                <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
                  {lang === 'am' ? 'ብዛት' : 'Qty'}:
                </span>
                <div className={`flex items-center rounded-full p-1 border shrink-0 ${isDarkMode ? 'bg-[#29160d] border-[#442417]' : 'bg-stone-100 border-stone-200'}`}>
                  <button
                    type="button"
                    onClick={() => setModalQty((prev) => Math.max(1, prev - 1))}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 cursor-pointer transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center text-sm font-bold text-[#2B1810] dark:text-white">{modalQty}</span>
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
                  addToCart(selectedDish.id, modalQty, modalInstructions.trim() || undefined);
                  setSelectedDish(null);
                }}
                className="flex-1 py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs sm:text-sm shadow-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <UtensilsCrossed size={15} />
                <span>{lang === 'am' ? 'አሁን ይዘዙ' : 'Order Now'}</span>
                <span className="font-serif font-bold ml-0.5">{(selectedDish.price * modalQty).toLocaleString()} ETB</span>
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ========================================================= */}
      {/* TABLE RESERVATION MODAL */}
      {/* ========================================================= */}
      {isReserveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setIsReserveOpen(false)}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          <div
            className={`relative w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl z-10 animate-scale-up border ${
              isDarkMode
                ? 'bg-[#1c0f08] border-[#442417] text-[#f7e6d2]'
                : 'bg-white border-stone-200 text-[#2B1810]'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 mb-4 border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-amber-500" />
                <h4 className="font-serif text-lg font-bold">
                  Reserve a Table
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsReserveOpen(false)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {reserveStatus === 'success' ? (
              <div className="py-8 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                  <CheckCircle2 size={32} />
                </div>
                <h5 className="font-serif text-xl font-bold">
                  Reservation Confirmed!
                </h5>
                <p className="text-xs text-stone-400 max-w-xs leading-relaxed">
                  We look forward to welcoming you at Meskel House & Skill Coffee. A confirmation SMS will be sent.
                </p>
              </div>
            ) : (
              <form onSubmit={handlePlaceReservation} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sara Haile"
                    value={reserveName}
                    onChange={(e) => setReserveName(e.target.value)}
                    className={`w-full text-xs px-3.5 py-2.5 rounded-xl border focus:outline-none ${
                      isDarkMode
                        ? 'bg-[#26150d] border-[#442417] text-white focus:border-amber-500'
                        : 'bg-stone-50 border-stone-200 text-neutral-900 focus:border-[#2B1810]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 0911 234 567"
                    value={reservePhone}
                    onChange={(e) => setReservePhone(e.target.value)}
                    className={`w-full text-xs px-3.5 py-2.5 rounded-xl border focus:outline-none ${
                      isDarkMode
                        ? 'bg-[#26150d] border-[#442417] text-white focus:border-amber-500'
                        : 'bg-stone-50 border-stone-200 text-neutral-900 focus:border-[#2B1810]'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                      Guests
                    </label>
                    <select
                      value={reserveGuests}
                      onChange={(e) => setReserveGuests(e.target.value)}
                      className={`w-full text-xs px-2.5 py-2.5 rounded-xl border focus:outline-none ${
                        isDarkMode
                          ? 'bg-[#26150d] border-[#442417] text-white'
                          : 'bg-stone-50 border-stone-200 text-neutral-900'
                      }`}
                    >
                      <option value="1">1 Person</option>
                      <option value="2">2 People</option>
                      <option value="3">3 People</option>
                      <option value="4">4 People</option>
                      <option value="5">5+ People</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      required
                      value={reserveDate}
                      onChange={(e) => setReserveDate(e.target.value)}
                      className={`w-full text-xs px-2.5 py-2.5 rounded-xl border focus:outline-none ${
                        isDarkMode
                          ? 'bg-[#26150d] border-[#442417] text-white'
                          : 'bg-stone-50 border-stone-200 text-neutral-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      required
                      value={reserveTime}
                      onChange={(e) => setReserveTime(e.target.value)}
                      className={`w-full text-xs px-2 py-2.5 rounded-xl border focus:outline-none ${
                        isDarkMode
                          ? 'bg-[#26150d] border-[#442417] text-white'
                          : 'bg-stone-50 border-stone-200 text-neutral-900'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                    Special Seating / Occasion
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Window table, Birthday, Quiet patio"
                    value={reserveNotes}
                    onChange={(e) => setReserveNotes(e.target.value)}
                    className={`w-full text-xs px-3.5 py-2.5 rounded-xl border focus:outline-none ${
                      isDarkMode
                        ? 'bg-[#26150d] border-[#442417] text-white focus:border-amber-500'
                        : 'bg-stone-50 border-stone-200 text-neutral-900 focus:border-[#2B1810]'
                    }`}
                  />
                </div>

                {reserveStatus === 'loading' ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-3.5 rounded-xl bg-amber-500/50 text-stone-950 font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed"
                  >
                    <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                    <span>Confirming Table...</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg active:scale-95 transition-all cursor-pointer"
                  >
                    Confirm Reservation
                  </button>
                )}
              </form>
            )}
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
                ? 'bg-[#29160d] text-white border-amber-500/40 shadow-black/80'
                : 'bg-[#2B1810] text-white border-stone-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-amber-400">
                <ShoppingBag size={20} />
              </div>
              <div>
                <p className="text-xs text-stone-300 font-medium">
                  {totalCartCount} item{totalCartCount > 1 ? 's' : ''} in basket
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
                ? 'bg-[#180e08] border-[#381c10] text-[#f7e6d2]'
                : 'bg-white border-stone-200 text-neutral-900'
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
                  ? 'bg-[#120804] border-[#381c10]'
                  : 'bg-[#EDE0C8] border-[#D4B896]'
              }`}
            >
              <button
                type="button"
                disabled={cartLines.length === 0}
                onClick={handlePlaceOrder}
                className={`w-full py-4 rounded-2xl text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer ${
                  cartLines.length === 0
                    ? 'bg-stone-300 text-neutral-500 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-400 text-stone-950 active:scale-98'
                }`}
              >
                <span>Place Order & Proceed to Pay</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* COFFEEHOUSE FOOTER (From Photo 2) */}
      {/* ========================================================= */}
      <footer
        className={`mt-20 border-t ${
          isDarkMode
            ? 'bg-[#0f0704] text-[#cfb7a5] border-[#291309]'
            : 'bg-[#2B1810] text-[#E8DFD8] border-[#3D2415]'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-12 space-y-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {/* Products Column */}
            <div className="space-y-3">
              <h5 className="font-serif text-sm font-bold uppercase tracking-wider text-white">
                Products
              </h5>
              <ul className="text-xs space-y-2 opacity-80">
                <li>Mocha Coffee</li>
                <li>Espresso Coffee</li>
                <li>Lata Coffee</li>
                <li>Biscoff Milkshakes</li>
                <li>Doro Wat Platter</li>
                <li>Beyaynetu Feast</li>
              </ul>
            </div>

            {/* Category Column */}
            <div className="space-y-3">
              <h5 className="font-serif text-sm font-bold uppercase tracking-wider text-white">
                Category
              </h5>
              <ul className="text-xs space-y-2 opacity-80">
                <li>Coffee & Hot Drinks</li>
                <li>Specialty Milkshakes</li>
                <li>Traditional Breakfast</li>
                <li>Authentic Ethiopian</li>
                <li>Pizza & Sourdough</li>
                <li>Artisan Desserts</li>
              </ul>
            </div>

            {/* Company Info Column */}
            <div className="space-y-3">
              <h5 className="font-serif text-sm font-bold uppercase tracking-wider text-white">
                Company Info
              </h5>
              <ul className="text-xs space-y-2 opacity-80">
                <li>About Meskel House</li>
                <li>Skill Coffee Roastery</li>
                <li>Table Reservations</li>
                <li>Contact & Location</li>
                <li>Customer Support</li>
              </ul>
            </div>

            {/* Follow Us Column */}
            <div className="space-y-3">
              <h5 className="font-serif text-sm font-bold uppercase tracking-wider text-white">
                Follow Us
              </h5>
              <p className="text-xs opacity-75">
                Join our coffee lovers community in Addis Ababa:
              </p>
              <div className="flex items-center gap-3 pt-1">
                <a
                  href="#instagram"
                  aria-label="Instagram"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-amber-400 transition-colors"
                >
                  <svg className="w-4 h-4 fill-currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a
                  href="#facebook"
                  aria-label="Facebook"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-blue-400 transition-colors"
                >
                  <svg className="w-4 h-4 fill-currentColor" viewBox="0 0 24 24">
                    <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.667 5H18V0h-3.889C10.667 0 9 1.667 9 4.889V8z"/>
                  </svg>
                </a>
                <a
                  href="#youtube"
                  aria-label="YouTube"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-rose-500 transition-colors"
                >
                  <svg className="w-4 h-4 fill-currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] opacity-70 gap-2">
            <p>© 2026 Meskel House & Skill Coffee · Addis Ababa, Ethiopia.</p>
            <div className="flex items-center gap-4">
              <span>Privacy Policy</span>
              <span>•</span>
              <span>Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
