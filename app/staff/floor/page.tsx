"use client";

import React, { useState } from "react";
import StaffHeader from "@/components/StaffHeader";
import WaiterFloorView from "@/components/WaiterFloorView";
import { INITIAL_TICKETS, INITIAL_CALL_ALERTS, TABLES } from "@/lib/mock";
import { Ticket, CallWaiterAlert } from "@/lib/types";
import {
  UserCheck,
  BellRing,
  CheckCircle,
  Eye,
  Clock,
  Sparkles,
  CheckCheck,
  Smartphone
} from "lucide-react";
import RoleGuard from "@/components/RoleGuard";

export default function WaiterFloorPage() {
  return (
    <RoleGuard allowedRoles={["super_admin", "owner", "admin", "waiter"]} pageTitle="Floor Service Console">
      <WaiterFloorContent />
    </RoleGuard>
  );
}

function WaiterFloorContent() {
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS);
  const [callAlerts, setCallAlerts] = useState<CallWaiterAlert[]>(INITIAL_CALL_ALERTS);

  // Mock tables actively browsing menu
  const [browsingTables, setBrowsingTables] = useState([
    { tableLabel: "Table 2", viewing: "Ethiopian Food", activeSince: "3m ago", itemsInCart: 2 },
    { tableLabel: "Table 7", viewing: "Cocktails & Drinks", activeSince: "1m ago", itemsInCart: 0 },
    { tableLabel: "Table 9", viewing: "Desserts & Coffee", activeSince: "Just now", itemsInCart: 1 },
  ]);

  const handleMarkServed = (ticketId: string) => {
    // TODO: Supabase wiring - update ticket to 'served' and notify order status
    // await supabase.from('tickets').update({ status: 'served', served_at: new Date().toISOString() }).eq('id', ticketId);
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: "served" } : t))
    );
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    // TODO: Supabase wiring - mark waiter call as acknowledged
    // await supabase.from('waiter_calls').update({ status: 'acknowledged' }).eq('id', alertId);
    setCallAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  return (
    <div className="min-h-screen bg-[#120B07] text-stone-100 font-sans pb-16">
      <StaffHeader
        title="Floor Service Console"
        subtitle="Dining Room & Delivery"
        badge="Waiter Active"
        icon={<UserCheck className="w-5 h-5 text-amber-400" />}
      />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Top Split: Active Waiter Calls & Live Browsing Presence */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section: Call Waiter Alerts */}
          <div className="bg-[#1C1109] border border-amber-900/40 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-[#2B1810] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <BellRing className="w-4 h-4 animate-bounce" />
                </div>
                <div>
                  <h2 className="font-serif font-bold text-base text-white">
                    Call Waiter Alerts
                  </h2>
                  <p className="text-[11px] text-stone-400">
                    Live assistance requests from diner tables
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500 text-stone-950">
                {callAlerts.length} Active
              </span>
            </div>

            {callAlerts.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-[#120B07] border border-stone-800 text-stone-500 text-xs">
                <CheckCheck className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
                No pending waiter calls. All tables attended!
              </div>
            ) : (
              <div className="space-y-3">
                {callAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-4 rounded-xl bg-[#120B07] border border-amber-600/30 flex items-center justify-between gap-3 shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#2B1810] text-amber-300 font-serif font-bold flex items-center justify-center text-sm border border-[#3D2415]">
                        {alert.table_label.replace("Table ", "T")}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">
                          {alert.table_label}
                        </p>
                        <p className="text-xs text-amber-300/90 font-medium">
                          {alert.notes || "Requested waiter assistance at table"}
                        </p>
                        <p className="text-[10px] text-stone-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {new Date(alert.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAcknowledgeAlert(alert.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Acknowledge
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Tables Viewing Menu But Not Ordered Yet */}
          <div className="bg-[#1C1109] border border-[#2B1810] rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-[#2B1810] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-950 text-cyan-400 flex items-center justify-center border border-cyan-800">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-serif font-bold text-base text-white">
                    Tables Browsing Menu
                  </h2>
                  <p className="text-[11px] text-stone-400">
                    Live device presence before placing order
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800">
                {browsingTables.length} Active Sessions
              </span>
            </div>

            <div className="space-y-3">
              {browsingTables.map((session, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-[#120B07] border border-stone-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-stone-900 text-stone-200 flex items-center justify-center">
                      <Smartphone className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">
                        {session.tableLabel}
                      </p>
                      <p className="text-[11px] text-stone-400">
                        Viewing <span className="text-stone-200 font-medium">{session.viewing}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-stone-500 block">
                      {session.activeSince}
                    </span>
                    {session.itemsInCart > 0 ? (
                      <span className="text-[10px] font-bold text-amber-400">
                        {session.itemsInCart} items in draft cart
                      </span>
                    ) : (
                      <span className="text-[10px] text-stone-500">
                        Browsing catalog
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Section: Waiter Ticket Columns (Ready to Serve, Preparing, Intake) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif font-bold text-lg text-white">
              Food & Beverage Dispatch Queue
            </h2>
            <span className="text-xs text-stone-400">
              Enter 4-digit code to complete delivery
            </span>
          </div>

          <WaiterFloorView
            tickets={tickets}
            onMarkServed={handleMarkServed}
          />
        </div>
      </div>
    </div>
  );
}
