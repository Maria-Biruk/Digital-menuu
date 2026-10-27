"use client";

export type CategoryType = 
  | "Breakfast" 
  | "Lunch" 
  | "Dinner" 
  | "Pizza" 
  | "Burgers" 
  | "Pasta" 
  | "Ethiopian Food" 
  | "Drinks" 
  | "Coffee" 
  | "Desserts" 
  | "Cocktails";

export const CATEGORIES: CategoryType[] = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Pizza",
  "Burgers",
  "Pasta",
  "Ethiopian Food",
  "Drinks",
  "Coffee",
  "Desserts",
  "Cocktails"
];

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number; // in ETB
  originalPrice?: number; // for discounts
  rating: number;
  img: string;
  category: CategoryType;
  prepTime: number; // in minutes
  calories: number; // in kcal
  availability: boolean;
  ingredients: string[];
  isSpicy?: boolean;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isHalal?: boolean;
  isGlutenFree?: boolean;
  tag?: "Popular" | "New" | "Chef's Choice" | "Best Seller";
};

export type OrderStatus = "Pending" | "Accepted" | "Preparing" | "Ready" | "Served" | "Completed";

export type OrderItem = {
  name: string;
  quantity: number;
  price: number; // in ETB at purchase time
};

export type Order = {
  id: string;
  tableNumber: string;
  items: OrderItem[];
  notes?: string;
  status: OrderStatus;
  estimatedTime: number; // countdown in minutes
  timestamp: string; // ISO string
  acceptedTimestamp?: string;
  completedTimestamp?: string;
  deliveredTimestamp?: string;
};

export type Feedback = {
  id: string;
  rating: number;
  text: string;
  type: "feedback" | "issue" | "suggestion";
  timestamp: string;
};

export type UserRole = "admin" | "kitchen" | "waiter";

export type User = {
  username: string;
  role: UserRole;
  isActive: boolean;
  fullName: string;
};

// INITIAL MOCK DATA
const INITIAL_MENU_ITEMS: MenuItem[] = [
  {
    id: "1",
    name: "Doro Wat Platter",
    description: "Slow-braised tender chicken drumsticks cooked in hot berbere pepper stew with boiled egg, served on fresh injera with ayib.",
    price: 480,
    rating: 4.9,
    img: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&auto=format&fit=crop&q=80",
    category: "Ethiopian Food",
    prepTime: 25,
    calories: 780,
    availability: true,
    ingredients: ["Chicken drumstick", "Berbere spices", "Niter Kibbeh (spiced butter)", "Injera", "Hard-boiled egg", "Ayib (cottage cheese)"],
    isSpicy: true,
    isHalal: true,
    tag: "Popular"
  },
  {
    id: "2",
    name: "Beyaynetu Feast",
    description: "Twelve colorful, delicious seasonal vegan stews including lentils, chickpea powder, cabbage, carrots, greens, served on fresh injera.",
    price: 351,
    originalPrice: 390,
    rating: 4.7,
    img: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop&q=80",
    category: "Ethiopian Food",
    prepTime: 20,
    calories: 620,
    availability: true,
    ingredients: ["Red Lentils (Misir)", "Yellow Split Peas (Kik)", "Collard Greens (Gomen)", "Cabbage & Carrots (Alicha)", "Shiro Stew", "Injera"],
    isSpicy: true,
    isVegetarian: true,
    isVegan: true,
    isHalal: true,
    tag: "New"
  },
  {
    id: "3",
    name: "Special Beef Tibs",
    description: "Sizzling prime beef cubes pan-seared with red onions, garlic, jalapeño peppers, and fresh rosemary sprigs.",
    price: 580,
    rating: 4.8,
    img: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80",
    category: "Lunch",
    prepTime: 18,
    calories: 720,
    availability: true,
    ingredients: ["Prime beef cuts", "Red onions", "Garlic", "Green pepper", "Rosemary", "Injera"],
    isSpicy: true,
    isHalal: true,
    tag: "Chef's Choice"
  },
  {
    id: "4",
    name: "Traditional Chechebsa",
    description: "Shredded flatbread (kita) simmered in niter kibbeh (clarified butter) and berbere, served with a side of yogurt and raw honey.",
    price: 290,
    rating: 4.8,
    img: "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=600&auto=format&fit=crop&q=80",
    category: "Breakfast",
    prepTime: 12,
    calories: 540,
    availability: true,
    ingredients: ["Wheat flour", "Clarified butter", "Berbere", "Fresh yogurt", "Raw honey"],
    isVegetarian: true
  },
  {
    id: "5",
    name: "Shahan Ful",
    description: "Fava beans slow-simmered with onions, cumin, green pepper, fresh tomatoes, olive oil, and topped with crumbled feta cheese.",
    price: 250,
    rating: 4.7,
    img: "https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=600&auto=format&fit=crop&q=80",
    category: "Breakfast",
    prepTime: 10,
    calories: 410,
    availability: true,
    ingredients: ["Fava beans", "Chopped tomatoes", "Cumin", "Onions", "Green chilies", "Olive oil", "Feta cheese", "Crusty bread rolls"],
    isVegetarian: true,
    isHalal: true
  },
  {
    id: "6",
    name: "Kitfo Special",
    description: "Very finely minced raw beef marinated in hot mitmita and spiced butter, served with cottage cheese (ayib) and collard greens.",
    price: 640,
    rating: 4.9,
    img: "https://images.unsplash.com/photo-1558030006-450675393462?w=600&auto=format&fit=crop&q=80",
    category: "Dinner",
    prepTime: 15,
    calories: 810,
    availability: true,
    ingredients: ["Tender beef mince", "Mitmita spices", "Clarified butter", "Ayib", "Gomen"],
    isSpicy: true,
    tag: "Best Seller"
  },
  {
    id: "7",
    name: "Margherita Meskel Pizza",
    description: "Artisanal thin crust topped with vine-ripened tomato marinara sauce, fresh milk mozzarella cheese, and fresh sweet basil leaves.",
    price: 420,
    rating: 4.6,
    img: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80",
    category: "Pizza",
    prepTime: 15,
    calories: 690,
    availability: true,
    ingredients: ["Sourdough crust", "Tomato marinara", "Fresh mozzarella", "Basil leaves", "Olive oil"],
    isVegetarian: true
  },
  {
    id: "8",
    name: "Spicy Beef Tibs Pizza",
    description: "Our signature pizza crust topped with seasoned beef tibs, sliced red onions, bell peppers, mozzarella, and a berbere-spiced sauce.",
    price: 560,
    rating: 4.9,
    img: "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=600&auto=format&fit=crop&q=80",
    category: "Pizza",
    prepTime: 18,
    calories: 830,
    availability: true,
    ingredients: ["Pizza crust", "Beef tibs", "Spiced sauce", "Onions", "Green peppers", "Mozzarella"],
    isSpicy: true
  },
  {
    id: "9",
    name: "Skill Coffee Burger",
    description: "Double house-blend beef patties, melted cheddar, local spiced butter caramelized onions, and house secret sauce on brioche bun.",
    price: 510,
    rating: 4.8,
    img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80",
    category: "Burgers",
    prepTime: 15,
    calories: 890,
    availability: true,
    ingredients: ["Beef patties", "Brioche bun", "Cheddar cheese", "Caramelized onions", "Lettuce", "House sauce"],
    isHalal: true
  },
  {
    id: "10",
    name: "Truffle Mushroom Pasta",
    description: "Sautéed wild forest mushrooms and spaghetti tossed in rich, creamy parmesan cheese sauce infused with white truffle oil.",
    price: 490,
    rating: 4.7,
    img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80",
    category: "Pasta",
    prepTime: 15,
    calories: 740,
    availability: true,
    ingredients: ["Spaghetti pasta", "Forest mushrooms", "Cream", "Parmesan cheese", "Truffle oil", "Parsley"],
    isVegetarian: true
  },
  {
    id: "11",
    name: "Traditional Ethiopian Buna",
    description: "Organic premium coffee brewed from dark-roasted Harrar beans, traditionally prepared and served in finjal cups with smoking incense.",
    price: 90,
    rating: 4.9,
    img: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80",
    category: "Coffee",
    prepTime: 5,
    calories: 5,
    availability: true,
    ingredients: ["Organic Harrar coffee beans", "Water"],
    isVegetarian: true,
    isVegan: true,
    isHalal: true
  },
  {
    id: "12",
    name: "House-Brewed Tej (Honey Wine)",
    description: "A traditional fermented sweet honey wine brewed in clay pots using local raw honey and gesho leaves.",
    price: 180,
    rating: 4.8,
    img: "https://images.unsplash.com/photo-1516600171743-4641973ffb96?w=600&auto=format&fit=crop&q=80",
    category: "Drinks",
    prepTime: 5,
    calories: 150,
    availability: true,
    ingredients: ["Raw honey", "Gesho leaves (hops)", "Water"]
  },
  {
    id: "13",
    name: "Passion Fruit Cold Juice",
    description: "Freshly blended local passion fruits strained and served ice cold. Natural, tropical, and thirst-quenching.",
    price: 140,
    rating: 4.6,
    img: "https://images.unsplash.com/photo-1536935338788-846bb9981813?w=600&auto=format&fit=crop&q=80",
    category: "Drinks",
    prepTime: 5,
    calories: 110,
    availability: true,
    ingredients: ["Fresh passion fruit", "Sugar syrup", "Water", "Ice"],
    isVegetarian: true,
    isVegan: true,
    isHalal: true
  },
  {
    id: "14",
    name: "Honey Walnut Baklava",
    description: "Flaky crispy layers of buttered phyllo pastry filled with crushed walnuts and cardamom, soaked in raw orange-blossom honey.",
    price: 120,
    rating: 4.7,
    img: "https://images.unsplash.com/photo-1519676867240-f03562e64548?w=600&auto=format&fit=crop&q=80",
    category: "Desserts",
    prepTime: 5,
    calories: 320,
    availability: true,
    ingredients: ["Phyllo dough", "Walnuts", "Cardamom", "Clarified butter", "Honey syrup"],
    isVegetarian: true
  },
  {
    id: "15",
    name: "Honey Chocolate Mousse",
    description: "Elegant, light, and airy dark Belgian chocolate mousse whipped with local organic honey, finished with chocolate shavings.",
    price: 160,
    rating: 4.8,
    img: "https://images.unsplash.com/photo-1519676867240-f03562e64548?w=600&auto=format&fit=crop&q=80",
    category: "Desserts",
    prepTime: 5,
    calories: 280,
    availability: true,
    ingredients: ["Dark chocolate", "Organic honey", "Whipping cream", "Egg whites"],
    isVegetarian: true
  },
  {
    id: "16",
    name: "Hibiscus Wild Gin Cocktail",
    description: "Artisanal dry gin shaken with fresh lime juice, crushed garden mint, house-steeped wild red hibiscus flower syrup, topped with soda.",
    price: 320,
    rating: 4.9,
    img: "https://images.unsplash.com/photo-1536935338788-846bb9981813?w=600&auto=format&fit=crop&q=80",
    category: "Cocktails",
    prepTime: 7,
    calories: 180,
    availability: true,
    ingredients: ["Dry gin", "Wild hibiscus flowers", "Lime juice", "Mint leaves", "Sugar syrup", "Soda water"]
  }
];

const INITIAL_USERS: User[] = [
  { username: "admin", role: "admin", isActive: true, fullName: "Main Administrator" },
  { username: "kitchen", role: "kitchen", isActive: true, fullName: "Head Chef" },
  { username: "waiter", role: "waiter", isActive: true, fullName: "Senior Waiter" }
];

// STATE MANAGEMENT HELPERS
const STORAGE_KEYS = {
  MENU: "meskel_menu",
  ORDERS: "meskel_orders",
  USERS: "meskel_users",
  FEEDBACK: "meskel_feedback",
  FAVORITES: "meskel_favorites"
};

// Dispatches a storage update event for internal components
const broadcastUpdate = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("meskel_db_change"));
  }
};

export const db = {
  // MENU ITEMS
  getMenuItems(): MenuItem[] {
    if (typeof window === "undefined") return INITIAL_MENU_ITEMS;
    const stored = localStorage.getItem(STORAGE_KEYS.MENU);
    if (!stored) {
      localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify(INITIAL_MENU_ITEMS));
      return INITIAL_MENU_ITEMS;
    }
    return JSON.parse(stored);
  },

  saveMenuItems(items: MenuItem[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify(items));
    broadcastUpdate();
  },

  updateMenuItemAvailability(id: string, available: boolean): void {
    const items = this.getMenuItems();
    const updated = items.map(item => item.id === id ? { ...item, availability: available } : item);
    this.saveMenuItems(updated);
  },

  // ORDERS
  getOrders(): Order[] {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(STORAGE_KEYS.ORDERS);
    return stored ? JSON.parse(stored) : [];
  },

  saveOrders(orders: Order[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    broadcastUpdate();
  },

  addOrder(order: Omit<Order, "id" | "timestamp" | "status">): Order {
    const newOrder: Order = {
      ...order,
      id: "ORD-" + Math.floor(1000 + Math.random() * 9000),
      status: "Pending",
      timestamp: new Date().toISOString()
    };
    const orders = this.getOrders();
    // Add to the front so newest appear first in audit, though kitchen sorts oldest first
    orders.unshift(newOrder);
    this.saveOrders(orders);
    return newOrder;
  },

  updateOrderStatus(id: string, status: OrderStatus): void {
    const orders = this.getOrders();
    const now = new Date().toISOString();
    const updated = orders.map(order => {
      if (order.id === id) {
        const orderCopy = { ...order, status };
        if (status === "Accepted") orderCopy.acceptedTimestamp = now;
        if (status === "Ready") orderCopy.completedTimestamp = now;
        if (status === "Served") orderCopy.deliveredTimestamp = now;
        // Adjust estimated countdown times dynamically
        if (status === "Preparing") orderCopy.estimatedTime = Math.max(5, order.estimatedTime - 5);
        if (status === "Ready") orderCopy.estimatedTime = 0;
        return orderCopy;
      }
      return order;
    });
    this.saveOrders(updated);
  },

  cancelOrder(id: string): boolean {
    const orders = this.getOrders();
    const order = orders.find(o => o.id === id);
    if (!order || order.status !== "Pending") return false; // Can only cancel before accepted
    const updated = orders.filter(o => o.id !== id);
    this.saveOrders(updated);
    return true;
  },

  // FAVORITES (Persisted per customer client-side)
  getFavorites(): string[] {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    return stored ? JSON.parse(stored) : [];
  },

  toggleFavorite(itemName: string): boolean {
    const favorites = this.getFavorites();
    const index = favorites.indexOf(itemName);
    let isFav = false;
    if (index >= 0) {
      favorites.splice(index, 1);
    } else {
      favorites.push(itemName);
      isFav = true;
    }
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    broadcastUpdate();
    return isFav;
  },

  // FEEDBACK LOGS
  getFeedback(): Feedback[] {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(STORAGE_KEYS.FEEDBACK);
    return stored ? JSON.parse(stored) : [];
  },

  addFeedback(rating: number, text: string, type: "feedback" | "issue" | "suggestion"): Feedback {
    const feedbackList = this.getFeedback();
    const newFeedback: Feedback = {
      id: "FB-" + Math.floor(1000 + Math.random() * 9000),
      rating,
      text,
      type,
      timestamp: new Date().toISOString()
    };
    feedbackList.unshift(newFeedback);
    localStorage.setItem(STORAGE_KEYS.FEEDBACK, JSON.stringify(feedbackList));
    broadcastUpdate();
    return newFeedback;
  },

  // STAFF USERS
  getUsers(): User[] {
    if (typeof window === "undefined") return INITIAL_USERS;
    const stored = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!stored) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    return JSON.parse(stored);
  },

  saveUsers(users: User[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    broadcastUpdate();
  },

  addUser(user: User): void {
    const users = this.getUsers();
    users.push(user);
    this.saveUsers(users);
  },

  updateUser(updatedUser: User): void {
    const users = this.getUsers();
    const updated = users.map(u => u.username === updatedUser.username ? updatedUser : u);
    this.saveUsers(updated);
  },

  deleteUser(username: string): void {
    const users = this.getUsers();
    const filtered = users.filter(u => u.username !== username);
    this.saveUsers(filtered);
  }
};
