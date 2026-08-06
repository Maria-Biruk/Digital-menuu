"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { db, Order, MenuItem, OrderStatus } from "../utils/store";
import { Utensils, LogOut, CheckCircle, Clock, ToggleLeft, ToggleRight, Flame, Hourglass, Play, Check } from "lucide-react";

export default function KitchenDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");

  const syncData = () => {
    // Check authentication
    const user = localStorage.getItem("meskel_active_user");
    if (!user) {
      router.push("/login");
      return;
    }
    const parsed = JSON.parse(user);
    if (parsed.role !== "kitchen" && parsed.role !== "admin") {
      router.push("/login");
      return;
    }

    setOrders(db.getOrders());
    setMenuItems(db.getMenuItems());
  };

  useEffect(() => {
    syncData();
    // Listen to changes in other tabs
    window.addEventListener("storage", syncData);
    // Listen to changes in the same tab
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

  // Kitchen preparation queue: active orders sorted by time (OLDEST FIRST)
  const activeOrders = useMemo(() => {
    return orders
      .filter(o => o.status !== "Completed")
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [orders]);

  // Order history (Completed)
  const completedOrders = useMemo(() => {
    return orders
      .filter(o => o.status === "Completed")
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [orders]);

  const handleAdvanceStatus = (id: string, currentStatus: OrderStatus) => {
    let nextStatus: OrderStatus = "Pending";
    if (currentStatus === "Pending") nextStatus = "Accepted";
    else if (currentStatus === "Accepted") nextStatus = "Preparing";
    else if (currentStatus === "Preparing") nextStatus = "Ready";
    else if (currentStatus === "Ready") nextStatus = "Completed";

    db.updateOrderStatus(id, nextStatus);
  };

  const handleToggleAvailability = (id: string, currentAvailability: boolean) => {
    db.updateMenuItemAvailability(id, !currentAvailability);
  };

  const getStatusBadgeClass = (status: OrderStatus) => {
    switch (status) {
      case "Pending":
        return "bg-rose-500/10 border border-rose-500/30 text-rose-400 animate-pulse";
      case "Accepted":
        return "bg-amber-500/10 border border-amber-500/30 text-amber-400";
      case "Preparing":
        return "bg-blue-500/10 border border-blue-500/30 text-blue-400";
      case "Ready":
        return "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400";
      case "Served":
        return "bg-indigo-500/10 border border-indigo-500/30 text-indigo-400";
      default:
        return "bg-slate-500/10 border border-slate-500/30 text-slate-400";
    }
  };

  const getActionButtonLabel = (status: OrderStatus) => {
    switch (status) {
      case "Pending":
        return "Accept Order";
      case "Accepted":
        return "Start Preparing";
      case "Preparing":
        return "Mark as Ready";
      case "Ready":
        return "Mark Completed";
      default:
        return "";
    }
  };

  const getActionButtonIcon = (status: OrderStatus) => {
    switch (status) {
      case "Pending":
        return <Check size={16} />;
      case "Accepted":
        return <Play size={16} fill="currentColor" />;
      case "Preparing":
        return <Flame size={16} />;
      case "Ready":
        return <CheckCircle size={16} />;
      default:
        return null;
    }
  };

  const getActionButtonClass = (status: OrderStatus) => {
    switch (status) {
      case "Pending":
        return "bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold";
      case "Accepted":
        return "bg-blue-500 hover:bg-blue-400 text-white font-bold";
      case "Preparing":
        return "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold";
      case "Ready":
        return "bg-slate-700 hover:bg-slate-600 text-white font-semibold";
      default:
        return "bg-slate-800 text-slate-500 cursor-not-allowed";
    }
  };

  return (
    <div className="min-h-screen bg-[#070b19] text-slate-100 font-sans">
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0c1428]/90 border-b border-slate-800/80 backdrop-blur-md py-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#132d66] text-white flex items-center justify-center shadow-md">
            <Utensils size={20} />
          </div>
          <div>
            <h1 className="font-serif font-bold text-lg md:text-xl tracking-wide text-white">
              Kitchen Console
            </h1>
            <p className="text-[10px] md:text-xs text-emerald-400 font-semibold tracking-wide uppercase">
              • Chef Session Active
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

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Order Queue (2 cols) */}
        <main className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab("active")}
                className={`pb-3 font-semibold text-sm relative tracking-wider transition-all cursor-pointer ${
                  activeTab === "active" ? "text-amber-500 font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                Active Queue ({activeOrders.length})
                {activeTab === "active" && (
                  <span className="absolute bottom-0 inset-x-0 h-0.5 bg-amber-500 rounded-full" />
                )}
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`pb-3 font-semibold text-sm relative tracking-wider transition-all cursor-pointer ${
                  activeTab === "history" ? "text-amber-500 font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                Prepared History ({completedOrders.length})
                {activeTab === "history" && (
                  <span className="absolute bottom-0 inset-x-0 h-0.5 bg-amber-500 rounded-full" />
                )}
              </button>
            </div>
            <span className="text-[10px] bg-slate-900/80 border border-slate-800/80 text-slate-400 px-3 py-1 rounded-full font-medium flex items-center gap-1.5">
              <Hourglass size={12} /> Auto-Sync Enabled
            </span>
          </div>

          {activeTab === "active" ? (
            activeOrders.length === 0 ? (
              <div className="text-center py-20 bg-[#0c1428]/25 border border-dashed border-slate-800 rounded-[2rem] flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-slate-900 text-slate-600 flex items-center justify-center mb-4">
                  <CheckCircle size={28} />
                </div>
                <h3 className="font-serif text-lg font-bold text-slate-300">All caught up!</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-[240px]">
                  No pending or active cooking orders at the moment.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeOrders.map((order, index) => (
                  <div
                    key={order.id}
                    className="bg-[#0c1428]/40 border border-slate-800/80 rounded-[2rem] p-6 shadow-lg flex flex-col justify-between hover:border-slate-700/80 transition-all"
                  >
                    {/* Card Top */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/40">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-base text-white">
                          #{order.id}
                        </span>
                        <span className="bg-slate-900 text-amber-500 text-xs font-bold px-3 py-1 rounded-full border border-slate-800">
                          Table {order.tableNumber}
                        </span>
                        {index === 0 && (
                          <span className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                            Oldest
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wide ${getStatusBadgeClass(order.status)}`}>
                          {order.status}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                          <Clock size={12} /> {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="space-y-2 mb-5">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex justify-between items-center text-sm">
                          <span className="text-slate-300 font-medium">
                            <span className="text-amber-500 font-bold mr-2 text-base">
                              {item.quantity}x
                            </span> 
                            {item.name}
                          </span>
                        </div>
                      ))}
                      {order.notes && (
                        <div className="mt-3 p-3 bg-rose-500/5 rounded-2xl border border-rose-500/10 text-rose-300 text-xs leading-normal">
                          <span className="font-bold uppercase tracking-wider text-[9px] text-rose-400 block mb-1">
                            Chef instructions:
                          </span>
                          {order.notes}
                        </div>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-800/40">
                      <span className="text-xs text-slate-400">
                        {order.status === "Served" 
                          ? "Waiting for customer to confirm" 
                          : `Estimated prep: ${order.estimatedTime} mins`}
                      </span>
                      {order.status !== "Served" && (
                        <button
                          onClick={() => handleAdvanceStatus(order.id, order.status)}
                          className={`px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95 ${getActionButtonClass(
                            order.status
                          )}`}
                        >
                          {getActionButtonIcon(order.status)}
                          {getActionButtonLabel(order.status)}
                        </button>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            )
          ) : (
            completedOrders.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                No orders compiled in history yet.
              </div>
            ) : (
              <div className="space-y-4">
                {completedOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-[#0c1428]/20 border border-slate-800/60 rounded-[2rem] p-5 opacity-70"
                  >
                    <div className="flex justify-between mb-2">
                      <span className="font-bold">#{order.id} (Table {order.tableNumber})</span>
                      <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle size={12} /> Prepared & Closed
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 space-y-1">
                      {order.items.map((it, i) => (
                        <p key={i}>
                          {it.quantity}x {it.name}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </main>

        {/* Right Side: Availability Toggle Panel (1 col) */}
        <aside className="space-y-6">
          <div className="bg-[#0c1428]/40 border border-slate-800/80 rounded-[2rem] p-6 shadow-xl sticky top-24">
            <h2 className="font-serif text-lg font-bold text-white mb-1">
              Dish Availability
            </h2>
            <p className="text-[10px] text-slate-400 font-medium mb-6">
              Toggle switch to instantly hide/show menu items on the digital menu.
            </p>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 hide-scrollbar">
              {menuItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/30 border border-slate-800/40 hover:border-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={item.img}
                      alt={item.name}
                      className="w-10 h-10 rounded-lg object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate max-w-[120px]">
                        {item.name}
                      </p>
                      <p className="text-[9px] text-slate-500 font-medium">
                        {item.category}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleAvailability(item.id, item.availability)}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                    aria-label={`Toggle availability for ${item.name}`}
                  >
                    {item.availability ? (
                      <div className="text-emerald-400 flex items-center gap-1 font-bold text-[10px]">
                        Available <ToggleRight size={24} />
                      </div>
                    ) : (
                      <div className="text-rose-500 flex items-center gap-1 font-bold text-[10px]">
                        Sold Out <ToggleLeft size={24} />
                      </div>
                    )}
                  </button>
                </div>
              ))}
            </div>

          </div>
        </aside>

      </div>

    </div>
  );
}
