"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { db, Order, OrderStatus } from "../utils/store";
import { Utensils, LogOut, CheckCircle, Clock, Bell, UserCheck } from "lucide-react";

export default function WaiterDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);

  const syncData = () => {
    // Check authentication
    const user = localStorage.getItem("meskel_active_user");
    if (!user) {
      router.push("/login");
      return;
    }
    const parsed = JSON.parse(user);
    if (parsed.role !== "waiter" && parsed.role !== "admin") {
      router.push("/login");
      return;
    }

    setOrders(db.getOrders());
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

  // Waiter Queue: Orders marked "Ready" by the kitchen. Waiter must deliver and mark as Served.
  const readyOrders = useMemo(() => {
    return orders
      .filter(o => o.status === "Ready")
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [orders]);

  // Orders served / active
  const servedOrders = useMemo(() => {
    return orders
      .filter(o => o.status === "Served")
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [orders]);

  const handleMarkServed = (id: string) => {
    db.updateOrderStatus(id, "Served");
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
              Waiter Console
            </h1>
            <p className="text-[10px] md:text-xs text-cyan-400 font-semibold tracking-wide uppercase">
              • Waiter Session Active
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
      <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-8">
        
        {/* Ready to Serve Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <h2 className="font-serif text-lg md:text-xl font-bold text-white flex items-center gap-2">
              <Bell size={18} className="text-amber-500 animate-swing" /> 
              Ready for Service ({readyOrders.length})
            </h2>
            <span className="text-[10px] text-slate-500 font-medium">Deliver to tables immediately</span>
          </div>

          {readyOrders.length === 0 ? (
            <div className="text-center py-16 bg-[#0c1428]/20 border border-slate-800/80 rounded-[2rem] flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-slate-900 text-slate-600 flex items-center justify-center mb-3">
                <CheckCircle size={22} />
              </div>
              <p className="font-semibold text-slate-400 text-sm">No ready orders</p>
              <p className="text-xs text-slate-600 mt-0.5">Kitchen is still cooking.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {readyOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-[#0c1428]/50 border border-slate-800/80 rounded-3xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800/40">
                      <span className="font-bold text-slate-200">#{order.id}</span>
                      <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold px-3 py-1 rounded-full">
                        Table {order.tableNumber}
                      </span>
                    </div>

                    <div className="space-y-1.5 mb-4">
                      {order.items.map((item, i) => (
                        <div key={i} className="text-xs text-slate-300">
                          <span className="text-amber-400 font-bold mr-1.5">{item.quantity}x</span>
                          {item.name}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleMarkServed(order.id)}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer shadow"
                  >
                    <UserCheck size={14} /> Mark as Served
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Served Queue Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <h2 className="font-serif text-lg font-bold text-slate-400">
              Served & Pending Table Confirmation ({servedOrders.length})
            </h2>
            <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
              <Clock size={12} /> Syncing live
            </span>
          </div>

          {servedOrders.length === 0 ? (
            <div className="text-center py-10 text-slate-600 text-xs">
              No orders served and awaiting confirmation.
            </div>
          ) : (
            <div className="space-y-3">
              {servedOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-[#0c1428]/20 border border-slate-800/60 rounded-2xl p-4 flex items-center justify-between opacity-80"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-300">
                      #{order.id} — Table {order.tableNumber}
                    </p>
                    <div className="flex gap-2 text-[10px] text-slate-400 mt-1">
                      {order.items.map((it, i) => (
                        <span key={i}>
                          {it.quantity}x {it.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                    Served
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

    </div>
  );
}
