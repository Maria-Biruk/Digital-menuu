"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { db, MenuItem, Order, User, Feedback, CATEGORIES, CategoryType } from "../utils/store";
import { 
  Utensils, LogOut, TrendingUp, DollarSign, Calendar, RefreshCw, Plus, 
  Trash2, Edit, AlertCircle, ShoppingCart, Award, CheckCircle, BarChart3, 
  Users, Layers, Clock, ShieldAlert, Ban, UserCheck, ToggleLeft, ToggleRight, X, Heart
} from "lucide-react";

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"analytics" | "menu" | "orders" | "staff">("analytics");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);

  // Menu Form Modal state
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCategory, setItemCategory] = useState<CategoryType>("Breakfast");
  const [itemPrepTime, setItemPrepTime] = useState("15");
  const [itemCalories, setItemCalories] = useState("500");
  const [itemImg, setItemImg] = useState("");
  const [itemIngredients, setItemIngredients] = useState("");
  const [itemTag, setItemTag] = useState<string>("");

  // Staff Form Modal state
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffUsername, setStaffUsername] = useState("");
  const [staffFullName, setStaffFullName] = useState("");
  const [staffRole, setStaffRole] = useState<"kitchen" | "waiter" | "admin">("kitchen");
  const [isStaffEditing, setIsStaffEditing] = useState(false);

  const syncData = () => {
    // Check authentication
    const activeUser = localStorage.getItem("meskel_active_user");
    if (!activeUser) {
      router.push("/login");
      return;
    }
    const parsed = JSON.parse(activeUser);
    if (parsed.role !== "admin") {
      router.push("/login");
      return;
    }

    setMenuItems(db.getMenuItems());
    setOrders(db.getOrders());
    setUsers(db.getUsers());
    setFeedback(db.getFeedback());
  };

  useEffect(() => {
    syncData();
    window.addEventListener("storage", syncData);
    window.addEventListener("meskel_db_change", syncData);
    return () => {
      window.removeEventListener("storage", syncData);
      window.removeEventListener("meskel_db_change", syncData);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("meskel_active_user");
    router.push("/login");
  };

  // ANALYTICS CALCULATIONS
  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.status === "Completed").length;
    const activeOrders = orders.filter(o => o.status !== "Completed").length;

    // Calculate revenue
    const revenue = orders.reduce((sum, order) => {
      const orderTotal = order.items.reduce((itemSum, item) => itemSum + item.quantity * item.price, 0);
      return sum + orderTotal;
    }, 0);

    // Calculate most/least popular items
    const itemSales: Record<string, number> = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        itemSales[item.name] = (itemSales[item.name] ?? 0) + item.quantity;
      });
    });

    const sortedSales = Object.entries(itemSales).sort((a, b) => b[1] - a[1]);
    const topItem = sortedSales.length > 0 ? `${sortedSales[0][0]} (${sortedSales[0][1]} sold)` : "None";
    const bottomItem = sortedSales.length > 0 ? `${sortedSales[sortedSales.length - 1][0]} (${sortedSales[sortedSales.length - 1][1]} sold)` : "None";

    return {
      totalOrders,
      completedOrders,
      activeOrders,
      revenue,
      topItem,
      bottomItem
    };
  }, [orders]);

  // MENU CRUD HANDLERS
  const openAddMenuModal = () => {
    setEditingItem(null);
    setItemName("");
    setItemDescription("");
    setItemPrice("");
    setItemCategory("Breakfast");
    setItemPrepTime("15");
    setItemCalories("500");
    setItemImg("https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600");
    setItemIngredients("Ingredient 1, Ingredient 2");
    setItemTag("");
    setIsMenuModalOpen(true);
  };

  const openEditMenuModal = (item: MenuItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemDescription(item.description);
    setItemPrice(item.price.toString());
    setItemCategory(item.category);
    setItemPrepTime(item.prepTime.toString());
    setItemCalories(item.calories.toString());
    setItemImg(item.img);
    setItemIngredients(item.ingredients.join(", "));
    setItemTag(item.tag ?? "");
    setIsMenuModalOpen(true);
  };

  const handleSaveMenuItem = (e: React.FormEvent) => {
    e.preventDefault();
    const list = db.getMenuItems();
    const ingredientsArr = itemIngredients.split(",").map(i => i.trim()).filter(Boolean);

    if (editingItem) {
      // Edit
      const updated = list.map(item => {
        if (item.id === editingItem.id) {
          return {
            ...item,
            name: itemName,
            description: itemDescription,
            price: parseFloat(itemPrice),
            category: itemCategory,
            prepTime: parseInt(itemPrepTime),
            calories: parseInt(itemCalories),
            img: itemImg,
            ingredients: ingredientsArr,
            tag: (itemTag as any) || undefined
          };
        }
        return item;
      });
      db.saveMenuItems(updated);
    } else {
      // Add
      const newItem: MenuItem = {
        id: "ITEM-" + Math.floor(1000 + Math.random() * 9000),
        name: itemName,
        description: itemDescription,
        price: parseFloat(itemPrice),
        category: itemCategory,
        prepTime: parseInt(itemPrepTime),
        calories: parseInt(itemCalories),
        img: itemImg,
        availability: true,
        ingredients: ingredientsArr,
        tag: (itemTag as any) || undefined,
        rating: 4.5 + Math.random() * 0.5
      };
      list.push(newItem);
      db.saveMenuItems(list);
    }

    setIsMenuModalOpen(false);
  };

  const handleDeleteMenuItem = (id: string) => {
    if (confirm("Are you sure you want to delete this menu item?")) {
      const list = db.getMenuItems();
      const filtered = list.filter(item => item.id !== id);
      db.saveMenuItems(filtered);
    }
  };

  // STAFF CRUD HANDLERS
  const openAddStaffModal = () => {
    setIsStaffEditing(false);
    setStaffUsername("");
    setStaffFullName("");
    setStaffRole("kitchen");
    setIsStaffModalOpen(true);
  };

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (isStaffEditing) {
      // Demo allows simple role update
      const list = db.getUsers();
      const updated = list.map(u => u.username === staffUsername ? { ...u, fullName: staffFullName, role: staffRole } : u);
      db.saveUsers(updated);
    } else {
      const newUser: User = {
        username: staffUsername.trim().toLowerCase(),
        fullName: staffFullName,
        role: staffRole,
        isActive: true
      };
      db.addUser(newUser);
    }
    setIsStaffModalOpen(false);
  };

  const handleToggleStaffStatus = (username: string, currentStatus: boolean) => {
    const list = db.getUsers();
    const updated = list.map(u => u.username === username ? { ...u, isActive: !currentStatus } : u);
    db.saveUsers(updated);
  };

  const handleDeleteStaff = (username: string) => {
    if (username === "admin") {
      alert("Main admin account cannot be deleted.");
      return;
    }
    if (confirm(`Delete user account "${username}"?`)) {
      db.deleteUser(username);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b19] text-slate-100 font-sans flex flex-col">
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0c1428]/95 border-b border-slate-800/80 backdrop-blur-md py-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#132d66] text-white flex items-center justify-center shadow-md">
            <Utensils size={20} />
          </div>
          <div>
            <h1 className="font-serif font-bold text-lg md:text-xl tracking-wide text-white">
              Admin Hub
            </h1>
            <p className="text-[10px] md:text-xs text-amber-500 font-semibold tracking-wide uppercase">
              • Meskel House HQ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white transition-colors bg-slate-900/50 py-2 px-4 rounded-full border border-slate-800 cursor-pointer"
          >
            <LogOut size={14} /> Log out
          </button>
        </div>
      </header>

      {/* Admin Panel Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Navigation Sidebar (1 col) */}
        <aside className="lg:col-span-1">
          <div className="bg-[#0c1428]/40 border border-slate-800/80 rounded-[2rem] p-6 shadow-xl sticky top-24 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-3">
              Management
            </p>
            
            <button
              onClick={() => setActiveTab("analytics")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold tracking-wide cursor-pointer transition-all ${
                activeTab === "analytics"
                  ? "bg-[#132d66] text-white shadow-md font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/40"
              }`}
            >
              <BarChart3 size={18} /> Analytics & Reports
            </button>
            
            <button
              onClick={() => setActiveTab("menu")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold tracking-wide cursor-pointer transition-all ${
                activeTab === "menu"
                  ? "bg-[#132d66] text-white shadow-md font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/40"
              }`}
            >
              <Layers size={18} /> Menu Editor
            </button>
            
            <button
              onClick={() => setActiveTab("orders")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold tracking-wide cursor-pointer transition-all ${
                activeTab === "orders"
                  ? "bg-[#132d66] text-white shadow-md font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/40"
              }`}
            >
              <ShoppingCart size={18} /> Order Audit Log
            </button>
            
            <button
              onClick={() => setActiveTab("staff")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold tracking-wide cursor-pointer transition-all ${
                activeTab === "staff"
                  ? "bg-[#132d66] text-white shadow-md font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/40"
              }`}
            >
              <Users size={18} /> Employee Accounts
            </button>

          </div>
        </aside>

        {/* Content Display (3 cols) */}
        <main className="lg:col-span-3 space-y-6">
          
          {/* ANALYTICS TAB */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                <div className="bg-[#0c1428]/40 border border-slate-800/80 rounded-3xl p-5 shadow-lg flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center shadow-inner">
                    <DollarSign size={22} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Gross Revenue</p>
                    <p className="text-xl font-bold text-white mt-0.5">{stats.revenue.toLocaleString()} ETB</p>
                  </div>
                </div>

                <div className="bg-[#0c1428]/40 border border-slate-800/80 rounded-3xl p-5 shadow-lg flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shadow-inner">
                    <CheckCircle size={22} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Completed Orders</p>
                    <p className="text-xl font-bold text-white mt-0.5">{stats.completedOrders}</p>
                  </div>
                </div>

                <div className="bg-[#0c1428]/40 border border-slate-800/80 rounded-3xl p-5 shadow-lg flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center shadow-inner">
                    <TrendingUp size={22} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Active Queue</p>
                    <p className="text-xl font-bold text-white mt-0.5">{stats.activeOrders}</p>
                  </div>
                </div>

              </div>

              {/* Advanced Analytics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="bg-[#0c1428]/20 border border-slate-800/80 rounded-[2rem] p-6 space-y-4">
                  <h3 className="font-serif text-base font-bold text-white flex items-center gap-2">
                    <Award size={18} className="text-amber-500" /> Best Sellers
                  </h3>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400">Highest Volume Item</p>
                    <p className="text-sm font-bold text-slate-200">{stats.topItem}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400">Lowest Volume Item</p>
                    <p className="text-sm font-bold text-slate-200">{stats.bottomItem}</p>
                  </div>
                </div>

                <div className="bg-[#0c1428]/20 border border-slate-800/80 rounded-[2rem] p-6 flex flex-col justify-between">
                  <h3 className="font-serif text-base font-bold text-white flex items-center gap-2">
                    <Layers size={18} className="text-cyan-400" /> Category Breakdown
                  </h3>
                  <div className="flex gap-2 flex-wrap mt-3">
                    {CATEGORIES.map(cat => {
                      const count = menuItems.filter(i => i.category === cat).length;
                      return (
                        <span key={cat} className="text-[10px] bg-slate-900 border border-slate-800 text-slate-300 py-1 px-2.5 rounded-full">
                          {cat}: <strong>{count}</strong>
                        </span>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Feedback Audit Panel */}
              <div className="bg-[#0c1428]/20 border border-slate-800/80 rounded-[2rem] p-6 space-y-4">
                <h3 className="font-serif text-base font-bold text-white flex items-center gap-2">
                  <Heart size={18} className="text-rose-500" /> Customer Feedback Log ({feedback.length})
                </h3>
                {feedback.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No feedback entries recorded yet.</p>
                ) : (
                  <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 hide-scrollbar">
                    {feedback.map(fb => (
                      <div key={fb.id} className="p-4 bg-slate-950/40 rounded-2xl border border-slate-800/60 text-xs">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-slate-300 capitalize">
                            [{fb.type}] {fb.rating} Stars
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(fb.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-slate-400 leading-normal">{fb.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* MENU EDITOR TAB */}
          {activeTab === "menu" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-bold text-white">Menu Catalog ({menuItems.length})</h3>
                <button
                  onClick={openAddMenuModal}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 px-5 rounded-full text-xs flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer shadow"
                >
                  <Plus size={16} /> Add Menu Item
                </button>
              </div>

              <div className="bg-[#0c1428]/20 border border-slate-800/80 rounded-[2rem] overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                        <th className="p-4">Dish</th>
                        <th className="p-4">Category</th>
                        <th className="p-4">Price</th>
                        <th className="p-4 text-center">Availability</th>
                        <th className="p-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {menuItems.map(item => (
                        <tr key={item.id} className="hover:bg-slate-900/10">
                          <td className="p-4 flex items-center gap-3">
                            <img src={item.img} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />
                            <div>
                              <p className="font-semibold text-slate-200">{item.name}</p>
                              <p className="text-[10px] text-slate-500 font-light truncate max-w-[150px]">{item.description}</p>
                            </div>
                          </td>
                          <td className="p-4 text-slate-400 font-medium">{item.category}</td>
                          <td className="p-4 font-semibold text-slate-200">{item.price} ETB</td>
                          <td className="p-4 text-center">
                            <span className={`inline-block py-1 px-3 rounded-full text-[10px] font-bold ${
                              item.availability ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}>
                              {item.availability ? "Active" : "Sold Out"}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => openEditMenuModal(item)}
                                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-colors cursor-pointer"
                                title="Edit"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteMenuItem(item.id)}
                                className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950 text-rose-400 transition-colors cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ORDER TRACKER AUDIT TAB */}
          {activeTab === "orders" && (
            <div className="space-y-4">
              <h3 className="font-serif text-lg font-bold text-white">Placed Orders Log ({orders.length})</h3>

              <div className="space-y-4">
                {orders.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No orders logged.</p>
                ) : (
                  orders.map(order => {
                    const orderTotal = order.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
                    return (
                      <div key={order.id} className="bg-[#0c1428]/40 border border-slate-800/80 rounded-[2rem] p-5 space-y-3">
                        
                        {/* Order info bar */}
                        <div className="flex justify-between items-center pb-2.5 border-b border-slate-800/40 text-xs">
                          <div>
                            <span className="font-bold text-white text-sm">#{order.id}</span>
                            <span className="bg-slate-900 border border-slate-800 text-amber-500 py-0.5 px-2.5 rounded ml-2 text-[10px] font-bold">
                              Table {order.tableNumber}
                            </span>
                          </div>
                          <span className="text-slate-400 font-semibold">{orderTotal.toLocaleString()} ETB</span>
                        </div>

                        {/* Order items lists */}
                        <div className="space-y-1 text-xs">
                          {order.items.map((it, i) => (
                            <p key={i} className="text-slate-300">
                              <strong className="text-amber-500">{it.quantity}x</strong> {it.name} <span className="text-slate-500 font-light">(${it.price})</span>
                            </p>
                          ))}
                        </div>

                        {/* Complete timestamps flow */}
                        <div className="pt-2 border-t border-slate-800/40 flex flex-wrap gap-x-6 gap-y-2 text-[9px] text-slate-500 font-medium">
                          <span>Placed: <strong>{new Date(order.timestamp).toLocaleTimeString()}</strong></span>
                          {order.acceptedTimestamp && (
                            <span>Accepted: <strong>{new Date(order.acceptedTimestamp).toLocaleTimeString()}</strong></span>
                          )}
                          {order.completedTimestamp && (
                            <span>Ready: <strong>{new Date(order.completedTimestamp).toLocaleTimeString()}</strong></span>
                          )}
                          {order.deliveredTimestamp && (
                            <span>Served: <strong>{new Date(order.deliveredTimestamp).toLocaleTimeString()}</strong></span>
                          )}
                          <span>Status: <strong className="text-amber-500 uppercase">{order.status}</strong></span>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* STAFF ACCOUNTS TAB */}
          {activeTab === "staff" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-bold text-white">Employee Accounts ({users.length})</h3>
                <button
                  onClick={openAddStaffModal}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 px-5 rounded-full text-xs flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer shadow"
                >
                  <Plus size={16} /> Add Staff Account
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {users.map(u => (
                  <div key={u.username} className="bg-[#0c1428]/40 border border-slate-800/80 rounded-3xl p-5 flex items-center justify-between">
                    <div>
                      <p className="font-serif text-base font-bold text-white">{u.fullName}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">@{u.username}</p>
                      <span className="inline-block mt-2 py-0.5 px-2 bg-slate-900 border border-slate-800 text-[10px] text-cyan-400 font-bold uppercase rounded">
                        {u.role}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleStaffStatus(u.username, u.isActive)}
                        className="text-slate-400 hover:text-white cursor-pointer"
                        title="Toggle Active Status"
                      >
                        {u.isActive ? (
                          <span className="text-emerald-400 flex items-center gap-0.5 text-[10px] font-bold">
                            Active <ToggleRight size={22} />
                          </span>
                        ) : (
                          <span className="text-rose-500 flex items-center gap-0.5 text-[10px] font-bold">
                            Disabled <ToggleLeft size={22} />
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteStaff(u.username)}
                        disabled={u.username === "admin"}
                        className={`p-2 rounded-lg bg-slate-800 hover:bg-rose-950 text-rose-400 cursor-pointer ${
                          u.username === "admin" ? "opacity-35 cursor-not-allowed" : ""
                        }`}
                        title="Delete User"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>

      </div>

      {/* DISH FORM DIALOG MODAL */}
      {isMenuModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsMenuModalOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg bg-[#0a0f1d] border border-slate-800 rounded-[2rem] shadow-2xl p-6 overflow-hidden z-10">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h4 className="font-serif text-lg font-bold text-white">
                {editingItem ? "Modify Menu Item" : "Create Menu Item"}
              </h4>
              <button onClick={() => setIsMenuModalOpen(false)} className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMenuItem} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 hide-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Name</label>
                  <input type="text" required value={itemName} onChange={(e) => setItemName(e.target.value)} className="w-full text-xs px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/40 focus:outline-none focus:border-[#132d66]" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Price (ETB)</label>
                  <input type="number" step="0.01" required value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} className="w-full text-xs px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/40 focus:outline-none focus:border-[#132d66]" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Description</label>
                <textarea required rows={2} value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} className="w-full text-xs px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/40 focus:outline-none focus:border-[#132d66] resize-none" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Category</label>
                  <select value={itemCategory} onChange={(e) => setItemCategory(e.target.value as any)} className="w-full text-xs px-2 py-2 rounded-xl border border-slate-800 bg-slate-900/40 focus:outline-none focus:border-[#132d66]">
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Prep Time (min)</label>
                  <input type="number" required value={itemPrepTime} onChange={(e) => setItemPrepTime(e.target.value)} className="w-full text-xs px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/40 focus:outline-none focus:border-[#132d66]" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Calories</label>
                  <input type="number" required value={itemCalories} onChange={(e) => setItemCalories(e.target.value)} className="w-full text-xs px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/40 focus:outline-none focus:border-[#132d66]" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Image URL</label>
                <input type="text" required value={itemImg} onChange={(e) => setItemImg(e.target.value)} className="w-full text-xs px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/40 focus:outline-none focus:border-[#132d66]" />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Ingredients (comma-separated)</label>
                <input type="text" value={itemIngredients} onChange={(e) => setItemIngredients(e.target.value)} className="w-full text-xs px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/40 focus:outline-none focus:border-[#132d66]" placeholder="Egg, Milk, Flour..." />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Special Label / Tag (optional)</label>
                <select value={itemTag} onChange={(e) => setItemTag(e.target.value)} className="w-full text-xs px-2 py-2 rounded-xl border border-slate-800 bg-slate-900/40 focus:outline-none focus:border-[#132d66]">
                  <option value="">None</option>
                  <option value="Popular">Popular</option>
                  <option value="New">New</option>
                  <option value="Chef's Choice">Chef's Choice</option>
                  <option value="Best Seller">Best Seller</option>
                </select>
              </div>

              <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-xl text-xs shadow transition-all cursor-pointer">
                Commit Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* STAFF FORM DIALOG MODAL */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsStaffModalOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-[#0a0f1d] border border-slate-800 rounded-[2rem] shadow-2xl p-6 z-10">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h4 className="font-serif text-lg font-bold text-white">Create Staff Login</h4>
              <button onClick={() => setIsStaffModalOpen(false)} className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Full Name</label>
                <input type="text" required value={staffFullName} onChange={(e) => setStaffFullName(e.target.value)} className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-900/40 focus:outline-none focus:border-[#132d66]" />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Username</label>
                <input type="text" required value={staffUsername} onChange={(e) => setStaffUsername(e.target.value)} className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-900/40 focus:outline-none focus:border-[#132d66]" />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Role</label>
                <select value={staffRole} onChange={(e) => setStaffRole(e.target.value as any)} className="w-full text-xs px-2 py-2.5 rounded-xl border border-slate-800 bg-slate-900/40 focus:outline-none focus:border-[#132d66]">
                  <option value="kitchen">Kitchen Staff</option>
                  <option value="waiter">Waiter</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-xl text-xs transition-all shadow cursor-pointer">
                Confirm Registration
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
