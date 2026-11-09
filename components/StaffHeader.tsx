"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  UtensilsCrossed,
  Wine,
  UserCheck,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Lock,
  ShieldCheck,
  Bell,
  CheckCheck,
} from "lucide-react";
import { getRoleInfo } from "@/lib/permissions";
import { signOutStaff } from "@/lib/supabase";
import { ensureNotifyPermission } from "@/lib/notify";
import { STAFF_LANG_LABEL, useStaffLang, type StaffLang } from "@/lib/i18n/staff";
import { Languages } from "lucide-react";

interface StaffHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: React.ReactNode;
}

export default function StaffHeader({
  title,
  subtitle = "Live Console",
  badge,
  icon,
}: StaffHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang, t } = useStaffLang();

  const [role, setRole] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<
    Array<{ id: string; title: string; message: string; read: boolean }>
  >([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedRole = localStorage.getItem("staff_role");
      setRole(savedRole);
      try {
        const saved = localStorage.getItem("staff_notifications");
        if (saved) {
          setNotifications(JSON.parse(saved));
        }
      } catch {
        /* ignore malformed storage */
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Listen for real-time notifications pushed from floor/kitchen/bar pages
    // via window.dispatchEvent(new CustomEvent('staff-notify', { detail: { title, message } }))
    const handleStaffNotify = (e: Event) => {
      const detail = (e as CustomEvent<{ title: string; message: string }>).detail;
      if (!detail?.title) return;
      const newNotif = {
        id: `${Date.now()}-${Math.random()}`,
        title: detail.title,
        message: detail.message ?? "",
        read: false,
      };
      setNotifications((prev) => [newNotif, ...prev].slice(0, 50));
    };
    window.addEventListener("staff-notify", handleStaffNotify);
    return () => window.removeEventListener("staff-notify", handleStaffNotify);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "staff_notifications",
        JSON.stringify(notifications),
      );
    }
  }, [notifications]);

  const unreadNotifications = notifications.filter((n) => !n.read).length;

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const toggleNotifications = () => {
    const opening = !notificationsOpen;
    setNotificationsOpen(opening);
    if (opening) void ensureNotifyPermission();
  };

  const allNavLinks = [
    { label: "Kitchen", href: "/staff/kitchen", icon: UtensilsCrossed },
    { label: "Bar", href: "/staff/bar", icon: Wine },
    { label: "Floor", href: "/staff/floor", icon: UserCheck },
    { label: "Cashier", href: "/staff/payments", icon: CreditCard },
    { label: "Admin", href: "/admin/menu", icon: LayoutDashboard },
  ];

  const roleInfo = getRoleInfo(role);
  const isSuperAdmin =
    roleInfo.role === "super_admin" || roleInfo.role === "owner";
  const isAdmin = roleInfo.role === "admin";
  const isKitchenStation = pathname.startsWith("/staff/kitchen");
  const isBarStation = pathname.startsWith("/staff/bar");
  const isFloorStation = pathname.startsWith("/staff/floor");
  const isPaymentsStation = pathname.startsWith("/staff/payments");
  const canOpenCustomerView =
    isSuperAdmin || isAdmin;

  // Strict Station Isolation:
  // Staff (kitchen, bar, waiter, cashier) CANNOT see Admin or unauthorized stations!
  let visibleNavLinks: typeof allNavLinks = [];

  if (isSuperAdmin) {
    // Super Admin has master access to all stations and Admin
    visibleNavLinks = allNavLinks;
  } else if (isAdmin) {
    // Admin has operational monitoring access
    visibleNavLinks = [
      { label: "Kitchen", href: "/staff/kitchen", icon: UtensilsCrossed },
      { label: "Bar", href: "/staff/bar", icon: Wine },
      { label: "Floor", href: "/staff/floor", icon: UserCheck },
      { label: "Admin", href: "/admin/menu", icon: LayoutDashboard },
    ];
  } else if (roleInfo.role === "kitchen") {
    // Kitchen staff can ONLY see Kitchen console
    visibleNavLinks = [
      { label: "Kitchen", href: "/staff/kitchen", icon: UtensilsCrossed },
    ];
  } else if (roleInfo.role === "bar" || roleInfo.role === "bartender") {
    // Bar staff can ONLY see Bar console
    visibleNavLinks = [{ label: "Bar", href: "/staff/bar", icon: Wine }];
  } else if (roleInfo.role === "waiter") {
    // Waiter can ONLY see Floor console
    visibleNavLinks = [
      { label: "Floor", href: "/staff/floor", icon: UserCheck },
    ];
  } else if (roleInfo.role === "cashier") {
    // Cashier can ONLY see Cashier console
    visibleNavLinks = [
      { label: "Cashier", href: "/staff/payments", icon: CreditCard },
    ];
  } else {
    // Fallback station view based on current path
    if (isKitchenStation)
      visibleNavLinks = [
        { label: "Kitchen", href: "/staff/kitchen", icon: UtensilsCrossed },
      ];
    else if (isBarStation)
      visibleNavLinks = [{ label: "Bar", href: "/staff/bar", icon: Wine }];
    else if (isFloorStation)
      visibleNavLinks = [
        { label: "Floor", href: "/staff/floor", icon: UserCheck },
      ];
    else if (isPaymentsStation)
      visibleNavLinks = [
        { label: "Cashier", href: "/staff/payments", icon: CreditCard },
      ];
  }

  const handleLogout = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("staff_role");
    }
    await signOutStaff();
    router.push("/admin/login");
  };
  return (
    <header className="sticky top-0 z-40 bg-[#3A241A]/95 backdrop-blur-md border-b border-[#2B1810] shadow-md px-4 sm:px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Station Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2B1810] border border-[#3D2415] text-amber-400 flex items-center justify-center shadow-inner shrink-0">
            {icon || <UtensilsCrossed className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif font-bold text-lg md:text-xl text-white tracking-wide">
                {t(title)}
              </h1>
              {badge && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                  {t(badge)}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-[11px] text-stone-400 font-medium">
                {t("Skill Coffee")} • {t(subtitle)}
              </p>
            )}
          </div>
        </div>

        {/* Center: Switch Station Navigation with Station Privacy Enforcement */}
        <div className="flex items-center gap-2">
          {/* Station Privacy Badges */}
          {roleInfo.role === "waiter" && !isFloorStation && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 text-[11px] font-bold shadow-inner">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t("Floor Waiter Terminal")}</span>
            </div>
          )}

          {isSuperAdmin && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-950/90 border border-amber-700/80 text-amber-300 text-[11px] font-bold shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>{t("Super Admin Master Access")}</span>
            </div>
          )}

          {isAdmin && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-950/80 border border-blue-700/70 text-blue-300 text-[11px] font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>{t("Admin Operations Mode")}</span>
            </div>
          )}

          {visibleNavLinks.some(
            (link) =>
              !(
                (isPaymentsStation && link.href === "/staff/payments") ||
                (isKitchenStation && link.href === "/staff/kitchen") ||
                (isFloorStation && link.href === "/staff/floor")
              ),
          ) && (
          <nav className="flex items-center overflow-x-auto gap-1 bg-[#38210F] p-1 rounded-xl border border-[#2B1810] hide-scrollbar">
            {visibleNavLinks
              .filter(
                (link) =>
                  !(
                    (isPaymentsStation && link.href === "/staff/payments") ||
                    (isKitchenStation && link.href === "/staff/kitchen") ||
                    (isFloorStation && link.href === "/staff/floor")
                  ),
              )
              .map((link) => {
              const Icon = link.icon;
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                    isActive
                      ? "bg-[#2B1810] text-amber-300 font-bold shadow-sm border border-[#3D2415]"
                      : "text-stone-400 hover:text-white hover:bg-[#3A241A]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t(link.label)}</span>
                </Link>
              );
              })}
          </nav>
          )}
        </div>

        {/* Right: Quick actions */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={toggleNotifications}
              className="relative flex items-center gap-1.5 text-xs font-bold bg-[#2B1810] hover:bg-[#3D2415] text-amber-200 px-3 py-1.5 rounded-lg border border-[#3D2415] transition-colors cursor-pointer"
              aria-label="Toggle notifications"
              title="Notifications"
            >
              <Bell className="w-3.5 h-3.5" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[1.1rem] h-5 rounded-full bg-amber-400 text-[10px] font-black text-stone-950 flex items-center justify-center px-1">
                  {unreadNotifications}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-[#3D2415] bg-[#2B1810] shadow-2xl z-50 p-2">
                <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#3D2415] text-[11px] font-bold text-amber-200">
                  <span>Notifications</span>
                  <span className="text-stone-400">
                    {unreadNotifications} unread
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto py-1 space-y-1">
                  {notifications.length === 0 ? (
                    <div className="px-2 py-3 text-[11px] text-stone-400">
                      No alerts yet.
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => markNotificationRead(item.id)}
                        className={`w-full text-left rounded-xl px-2.5 py-2 transition-colors ${
                          item.read
                            ? "bg-transparent text-stone-300"
                            : "bg-[#3D2415] text-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[11px] font-bold">
                              {item.title}
                            </p>
                            <p className="text-[10px] text-stone-400 mt-0.5">
                              {item.message}
                            </p>
                          </div>
                          {item.read ? (
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Bell className="w-3.5 h-3.5 text-amber-300" />
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() =>
              setLang(
                ({ en: "am", am: "om", om: "en" } as Record<StaffLang, StaffLang>)[lang],
              )
            }
            title="Change language"
            className="flex items-center gap-1.5 text-xs font-bold bg-[#2B1810] hover:bg-[#3D2415] text-amber-200 px-3 py-1.5 rounded-lg border border-[#3D2415] transition-colors cursor-pointer"
          >
            <Languages className="w-3.5 h-3.5" />
            <span>{STAFF_LANG_LABEL[lang]}</span>
          </button>
          {canOpenCustomerView && (
            <Link
              href="/meskel-house/order"
              target="_blank"
              className="text-xs bg-[#2B1810] hover:bg-[#3D2415] text-stone-300 hover:text-white px-3 py-1.5 rounded-lg border border-[#3D2415] transition-colors"
            >
              {t("Customer View ↗")}
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-rose-300/80 hover:text-rose-200 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/40 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            title={t("Sign out of staff session")}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t("Logout")}</span>
          </button>
        </div>

        {/* Mobile: language + logout stay reachable on phones (staff work on tablets/phones) */}
        <div className="flex sm:hidden items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={toggleNotifications}
              className="relative rounded-lg border border-[#3D2415] bg-[#2B1810] p-2 text-amber-200 cursor-pointer"
              aria-label="Toggle notifications"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[1.1rem] h-5 rounded-full bg-amber-400 text-[10px] font-black text-stone-950 flex items-center justify-center px-1">
                  {unreadNotifications}
                </span>
              )}
            </button>
            {notificationsOpen && (
              <div className="absolute left-0 bottom-full mb-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-[#3D2415] bg-[#2B1810] shadow-2xl z-50 p-2">
                <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#3D2415] text-[11px] font-bold text-amber-200">
                  <span>Notifications</span>
                  <span className="text-stone-400">
                    {unreadNotifications} unread
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto py-1 space-y-1">
                  {notifications.length === 0 ? (
                    <div className="px-2 py-3 text-[11px] text-stone-400">
                      No alerts yet.
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => markNotificationRead(item.id)}
                        className={`w-full text-left rounded-xl px-2.5 py-2 ${item.read ? "text-stone-300" : "bg-[#3D2415] text-white"}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[11px] font-bold">
                              {item.title}
                            </p>
                            <p className="text-[10px] text-stone-400 mt-0.5">
                              {item.message}
                            </p>
                          </div>
                          {item.read ? (
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Bell className="w-3.5 h-3.5 text-amber-300" />
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() =>
              setLang(
                ({ en: "am", am: "om", om: "en" } as Record<StaffLang, StaffLang>)[lang],
              )
            }
            className="flex items-center gap-1.5 text-xs font-bold bg-[#2B1810] text-amber-200 px-3 py-1.5 rounded-lg border border-[#3D2415] cursor-pointer"
          >
            <Languages className="w-3.5 h-3.5" />
            <span>{STAFF_LANG_LABEL[lang]}</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-rose-300/90 bg-rose-950/30 border border-rose-900/40 px-3 py-1.5 rounded-lg cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t("Logout")}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
