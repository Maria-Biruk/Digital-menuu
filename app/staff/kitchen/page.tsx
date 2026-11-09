"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import StaffHeader from "@/components/StaffHeader";
import TicketQueue from "@/components/TicketQueue";
import NotificationToast from "@/components/NotificationToast";
import { useNewArrivalNotifier } from "@/lib/notify";
import { orderNumber } from "@/lib/order-number";
import { handleImgError } from "@/lib/img";
import { fetchStationTickets, subscribeTickets, setTicketStatus, setItemAvailability, fetchCatalog } from "@/lib/db";
import { Ticket, TicketStatus, MenuItem } from "@/lib/types";
import { signOutStaff } from "@/lib/supabase";
import { loc, useStaffLang } from "@/lib/i18n/staff";
import { publishStaffNotification } from "@/lib/notify";
import { UtensilsCrossed, ToggleLeft, ToggleRight, Sparkles, RefreshCw, ShieldAlert, Lock, ArrowLeft } from "lucide-react";

import RoleGuard from "@/components/RoleGuard";

export default function KitchenConsolePage() {
  return (
    <RoleGuard allowedRoles={["super_admin", "owner", "admin", "kitchen"]} pageTitle="Kitchen Console">
      <KitchenConsoleContent />
    </RoleGuard>
  );
}

function KitchenConsoleContent() {
  const router = useRouter();
  const { t, lang } = useStaffLang();
  const [role, setRole] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [kitchenMenu, setKitchenMenu] = useState<MenuItem[]>([]);

  const loadTickets = useCallback(async () => {
    try {
      setTickets(await fetchStationTickets("kitchen"));
    } catch (err) {
      console.error("Failed to load kitchen tickets", err);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    const savedRole = localStorage.getItem("staff_role");
    setRole(savedRole);

    void loadTickets();
    fetchCatalog()
      .then(({ menu }) => setKitchenMenu(menu.filter((m) => m.station === "kitchen")))
      .catch((err) => console.error("Failed to load kitchen menu", err));

    const unsubscribe = subscribeTickets(() => void loadTickets(), "kitchen-tickets");
    return unsubscribe;
  }, [loadTickets]);

  // Chime + notification when a new ticket lands on the cook line.
  const { toast: arrivalToast, dismiss: dismissToast } = useNewArrivalNotifier(
    tickets,
    (tk) => tk.id,
    (tk) => ({
      title: t("New Kitchen Order"),
      message: `🍳 #${orderNumber(tk.order_id)} · ${tk.table_label}: ${tk.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}`,
    }),
  );

  const handleAdvance = async (ticketId: string) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;
    let nextStatus: TicketStatus = "ready";
    if (ticket.status === "held") nextStatus = "preparing";
    else if (ticket.status === "queued") nextStatus = "preparing";
    else if (ticket.status === "preparing") nextStatus = "ready";
    else return; // already ready
    try {
      await setTicketStatus(ticketId, nextStatus);
      if (nextStatus === "preparing") {
        publishStaffNotification(
          t("Order Started"),
          `#${orderNumber(ticket.order_id)} · ${t("Order is being prepared.")}`,
        );
      }
      await loadTickets();
    } catch (err) {
      console.error("Failed to advance ticket", err);
    }
  };

  const handleToggleItem = async (itemId: string) => {
    const target = kitchenMenu.find((i) => i.id === itemId);
    const nextAvailable = !target?.is_available;
    setKitchenMenu((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, is_available: nextAvailable } : item))
    );
    try {
      await setItemAvailability(itemId, nextAvailable);
    } catch (err) {
      console.error("Failed to update availability", err);
      setKitchenMenu((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, is_available: !nextAvailable } : item))
      );
    }
  };

  // Station Privacy: Bar staff cannot access Kitchen console
  if (mounted && role === "bar") {
    return (
      <div className="min-h-screen app-bg-dark text-stone-100 flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full p-8 rounded-3xl bg-[#3A241A] border border-rose-900/50 shadow-2xl text-center space-y-5 animate-scale-up">
          <div className="w-16 h-16 rounded-2xl bg-rose-950/60 text-rose-400 flex items-center justify-center mx-auto border border-rose-800/50 shadow-inner">
            <Lock className="w-8 h-8 text-rose-400" />
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
              {t("Station Privacy Enforced")}
            </span>
            <h2 className="font-serif font-bold text-2xl text-white">
              {t("Kitchen Console Restricted")}
            </h2>
            <p className="text-xs text-stone-400 leading-relaxed">
              {t("You are signed in as")} <span className="text-purple-400 font-bold">{t("Bar Staff")}</span>. {t("Bar terminals and personnel cannot view or manage the Hot Kitchen console. Culinary order tickets and recipes are protected by station privacy.")}
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => router.push("/staff/bar")}
              className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-purple-950/40"
            >
              {t("Return to Bar Console")}
            </button>
            <button
              onClick={async () => {
                localStorage.removeItem("staff_role");
                await signOutStaff();
                router.push("/admin/login");
              }}
              className="w-full py-2.5 rounded-xl bg-[#2B1810] hover:bg-[#3D2415] text-stone-400 hover:text-white font-semibold text-xs transition-colors cursor-pointer border border-[#3D2415]"
            >
              {t("Switch Role / Re-login")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-bg-dark text-stone-100 font-sans pb-16">
      <NotificationToast toast={arrivalToast} onDismiss={dismissToast} />
      <StaffHeader
        title={t("Kitchen Console")}
        subtitle=""
        icon={<UtensilsCrossed className="w-5 h-5 text-amber-400" />}
      />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Kitchen Ticket Queue */}
        <div className="lg:col-span-2 space-y-4">
          <TicketQueue
            tickets={tickets}
            onAdvance={handleAdvance}
            title={t("Kitchen Order Tickets")}
          />
        </div>

        {/* Right 1 Col: Quick Dish Availability Toggles */}
        <div className="space-y-4">
          <div className="bg-[#3A241A] border border-[#2B1810] rounded-2xl p-5 shadow-lg sticky top-24">
            <div className="flex items-center justify-between border-b border-[#2B1810] pb-3 mb-4">
              <div>
                <h2 className="font-serif font-bold text-base text-white">
                  {t("Kitchen 86 / In-Stock")}
                </h2>
                <p className="text-[11px] text-stone-400">
                  {t("Toggle dish availability for diner menu")}
                </p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#2B1810] text-amber-300 font-mono">
                {kitchenMenu.filter((i) => i.is_available).length}/{kitchenMenu.length} {t("Active")}
              </span>
            </div>

            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
              {kitchenMenu.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#38210F] border border-[#2B1810] hover:border-[#3D2415] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={item.image_path}
                      alt={item.name_i18n.en}
                      onError={handleImgError}
                      className="w-10 h-10 rounded-lg object-cover shrink-0 border border-stone-800"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate max-w-[130px]">
                        {loc(item.name_i18n, lang)}
                      </p>
                      <p className="text-[10px] text-amber-400/90 font-mono">
                        {item.price} ETB
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleItem(item.id)}
                    className="cursor-pointer transition-transform active:scale-95 shrink-0"
                    title={t("Toggle stock status")}
                  >
                    {item.is_available ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                        {t("In Stock")} <ToggleRight className="w-5 h-5" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400">
                        {t("86'd")} <ToggleLeft className="w-5 h-5" />
                      </span>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
