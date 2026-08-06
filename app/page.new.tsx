"use client";

import { useMemo, useState } from "react";
import { Menu, X, Plus, Star } from "lucide-react";

const CATEGORIES = ["Mains", "Mouthwatering", "Greens", "Desserts"] as const;

type MenuItem = {
  name: string;
  description: string;
  price: string;
  rating: number;
  img: string;
};

const MENU_ITEMS: Record<(typeof CATEGORIES)[number], MenuItem[]> = {
  Mains: [
    {
      name: "Doro Wat",
      description: "Slow-cooked chicken stew with berbere spices.",
      price: "8.50$",
      rating: 4.9,
      img: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=900",
    },
    {
      name: "Tibs",
      description: "Tender beef sautéed with onions and peppers.",
      price: "9.00$",
      rating: 4.8,
      img: "https://images.unsplash.com/photo-1544025162-d76694265947?w=900",
    },
  ],
  Mouthwatering: [
    {
      name: "Kitfo",
      description: "Minced beef seasoned with mitmita and clarified butter.",
      price: "9.50$",
      rating: 4.8,
      img: "https://images.unsplash.com/photo-1544025162-d76694265947?w=900",
    },
    {
      name: "Gored Gored",
      description: "Spicy cubed beef with rosemary and fresh herbs.",
      price: "9.80$",
      rating: 4.9,
      img: "https://images.unsplash.com/photo-1558030006-450675393462?w=900",
    },
  ],
  Greens: [
    {
      name: "Misir Wat",
      description: "Red lentils simmered in fragrant Ethiopian spices.",
      price: "5.20$",
      rating: 4.7,
      img: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=900",
    },
    {
      name: "Gomen",
      description: "Slow-cooked collard greens with mild aromatics.",
      price: "5.00$",
      rating: 4.6,
      img: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=900",
    },
  ],
  Desserts: [
    {
      name: "Baklava",
      description: "Crispy layers of pastry with honey and nuts.",
      price: "3.50$",
      rating: 4.8,
      img: "https://images.unsplash.com/photo-1519676867240-f03562e64548?w=900",
    },
    {
      name: "Honey Cake",
      description: "Soft spice cake glazed with raw honey.",
      price: "4.00$",
      rating: 4.7,
      img: "https://images.unsplash.com/photo-1519676867240-f03562e64548?w=900",
    },
  ],
};

export default function Page() {
  const [activeCategory, setActiveCategory] =
    useState<(typeof CATEGORIES)[number]>("Mains");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [menuOpen, setMenuOpen] = useState(false);

  const items = MENU_ITEMS[activeCategory];

  const cartItems = useMemo(
    () => Object.values(cart).reduce((sum, qty) => sum + qty, 0),
    [cart],
  );

  const totalPrice = useMemo(
    () =>
      Object.entries(cart).reduce((sum, [name, qty]) => {
        const item = Object.values(MENU_ITEMS)
          .flat()
          .find((menuItem) => menuItem.name === name);
        if (!item) return sum;
        return sum + qty * parseFloat(item.price.replace("$", ""));
      }, 0),
    [cart],
  );

  const addItem = (name: string) => {
    setCart((current) => ({
      ...current,
      [name]: (current[name] ?? 0) + 1,
    }));
  };

  return (
    <main className="min-h-screen bg-[#FAF7F2] text-[#1A1714] overflow-x-hidden">
      <div className="max-w-xl mx-auto px-4 pb-32 pt-6">
        <TopBar
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          cartItems={cartItems}
        />

        <HeroCard />

        <section className="mt-6">
          <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`min-w-[110px] rounded-full border px-4 py-2 text-sm font-medium transition ${
                  activeCategory === category
                    ? "bg-[#1A1714] text-white border-transparent"
                    : "bg-white text-[#5E5448] border-[#E5D9C6]"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-4">
            {items.map((item) => (
              <article
                key={item.name}
                className="rounded-3xl bg-white p-4 shadow-sm border border-[#ECE2D6]"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">{item.name}</h3>
                        <p className="text-xs text-[#8F8273] mt-1">
                          {item.description}
                        </p>
                      </div>
                      <span className="rounded-2xl bg-[#F5E7D8] px-3 py-1 text-sm font-semibold text-[#B0652D]">
                        {item.price}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-1 text-[#E8622C]">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          size={14}
                          fill={
                            index < Math.round(item.rating) ? "#E8622C" : "none"
                          }
                          strokeWidth={1.5}
                        />
                      ))}
                      <span className="text-xs text-[#8F8273] ml-2">
                        {item.rating}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="grid h-11 w-11 place-items-center rounded-2xl bg-[#E8622C] text-white shadow-sm"
                    onClick={() => addItem(item.name)}
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <BottomCart cartItems={cartItems} totalPrice={totalPrice} />
    </main>
  );
}

function TopBar({
  menuOpen,
  setMenuOpen,
  cartItems,
}: {
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  cartItems: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <button
        type="button"
        className="h-11 w-11 rounded-2xl border border-[#E5D9C6] bg-white shadow-sm flex items-center justify-center"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        {menuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      <div className="text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-[#CFA472]">
          digital menu
        </p>
        <h1 className="text-xl font-semibold">Ararat</h1>
      </div>
      <div className="h-11 w-11 rounded-2xl bg-[#1A1714] text-white flex items-center justify-center shadow-sm">
        <span className="text-sm">{cartItems}</span>
      </div>
    </div>
  );
}

function HeroCard() {
  return (
    <div className="mt-6 rounded-[2rem] bg-[#1A1714] text-white overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
      <img
        src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200"
        alt="Featured dish"
        className="h-56 w-full object-cover"
      />
      <div className="p-5">
        <p className="text-sm uppercase tracking-[0.3em] text-[#F0D9BB] mb-3">
          Ethiopian favorites
        </p>
        <h2 className="text-3xl font-semibold leading-tight mb-3">
          Pick your next flavor.
        </h2>
        <p className="text-sm text-[#DCD3C5] leading-relaxed">
          Browse the menu, choose a category, and add your favorites to the
          table order.
        </p>
      </div>
    </div>
  );
}

function BottomCart({
  cartItems,
  totalPrice,
}: {
  cartItems: number;
  totalPrice: number;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#E5D9C6] bg-white px-4 py-4 shadow-[0_-10px_30px_rgba(0,0,0,0.08)]">
      <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-[#7D6E60]">
            {cartItems} item{cartItems === 1 ? "" : "s"} in order
          </p>
          <p className="text-lg font-semibold">
            Total {totalPrice.toFixed(2)}$
          </p>
        </div>
        <button
          type="button"
          className="rounded-3xl bg-[#1A1714] px-6 py-3 text-sm font-semibold text-white shadow-sm"
        >
          View order
        </button>
      </div>
    </div>
  );
}
