"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  BookOpen,
  CheckCheck,
  CreditCard,
  ExternalLink,
  Languages,
  LogOut,
  QrCode,
  UtensilsCrossed,
} from "lucide-react";
import { signOutStaff } from "@/lib/supabase";
import {
  STAFF_LANG_LABEL,
  useStaffLang,
  type StaffLang,
} from "@/lib/i18n/staff";

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  compact?: boolean;
}

const adminNav = [
  { label: "Menu Catalog", href: "/admin/menu", icon: BookOpen },
  { label: "Table QR Codes", href: "/admin/tables", icon: QrCode },
  { label: "Payment History", href: "/admin/payment-history", icon: CreditCard },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
];

type StaffNotification = {
  id: string;
  title: string;
  message: string;
  read: boolean;
};

export default function AdminHeader({ title }: AdminHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang, t } = useStaffLang();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<StaffNotification[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("staff_notifications");
      if (saved) {
        setNotifications(JSON.parse(saved) as StaffNotification[]);
      }
    } catch {
      setNotifications([]);
    }

    const handleStaffNotify = (event: Event) => {
      const detail = (event as CustomEvent<{ title: string; message?: string }>)
        .detail;
      if (!detail?.title) return;

      setNotifications((previous) =>
        [
          {
            id: `${Date.now()}-${Math.random()}`,
            title: detail.title,
            message: detail.message ?? "",
            read: false,
          },
          ...previous,
        ].slice(0, 50),
      );
    };

    window.addEventListener("staff-notify", handleStaffNotify);
    return () => window.removeEventListener("staff-notify", handleStaffNotify);
  }, []);

  useEffect(() => {
    localStorage.setItem("staff_notifications", JSON.stringify(notifications));
  }, [notifications]);

  const unreadNotifications = notifications.filter((item) => !item.read).length;

  const markNotificationRead = (id: string) => {
    setNotifications((previous) =>
      previous.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );
  };

  const handleLogout = async () => {
    localStorage.removeItem("staff_role");
    await signOutStaff();
    router.push("/admin/login");
  };

  const notificationMenu = (
    <div className="relative">
      <button
        type="button"
        onClick={() => setNotificationsOpen((open) => !open)}
        className="relative rounded-lg border border-[#3D2415] bg-[#2B1810] p-2 text-amber-200 hover:bg-[#3D2415] cursor-pointer"
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
        <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-[#3D2415] bg-[#2B1810] shadow-2xl z-50 p-2">
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#3D2415] text-[11px] font-bold text-amber-200">
            <span>Notifications</span>
            <span className="text-stone-400">{unreadNotifications} unread</span>
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
                  className={`w-full text-left rounded-xl px-2.5 py-2 ${
                    item.read
                      ? "text-stone-300"
                      : "bg-[#3D2415] text-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-bold">{item.title}</p>
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
  );

  return (
    <>
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-[#2B1810] bg-[#3A241A] px-4 py-6">
        <div className="flex items-center gap-3 px-2 pb-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#3D2415] bg-[#2B1810] text-amber-400">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <span className="font-serif text-lg font-bold tracking-wide text-white">
            Admin Console
          </span>
        </div>

        <nav className="space-y-1">
          {adminNav.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "border border-[#3D2415] bg-[#2B1810] font-bold text-amber-300"
                    : "text-stone-300 hover:bg-[#2B1810] hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{t(link.label)}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <header className="sticky top-0 z-30 border-b border-[#2B1810] bg-[#3A241A]/95 px-4 py-3 shadow-md backdrop-blur-md sm:px-6 lg:flex lg:h-16 lg:items-center lg:justify-end lg:py-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 lg:hidden">
            <UtensilsCrossed className="h-5 w-5 shrink-0 text-amber-400" />
            <h1 className="truncate font-serif text-lg font-bold tracking-wide text-white">
              {title}
            </h1>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Link
              href="/meskel-house/order"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-amber-400 bg-amber-400 px-3 py-2 text-xs font-extrabold text-[#2B1810] shadow-md shadow-amber-950/20 transition-colors hover:bg-amber-300"
            >
              <span>{t("Customer View ↗")}</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            {notificationMenu}
            <button
              type="button"
              onClick={() =>
                setLang(
                  ({ en: "am", am: "om", om: "en" } as Record<
                    StaffLang,
                    StaffLang
                  >)[lang],
                )
              }
              className="flex items-center gap-1.5 rounded-lg border border-[#3D2415] bg-[#2B1810] px-2.5 py-2 text-xs font-bold text-amber-200 hover:bg-[#3D2415] cursor-pointer"
              title="Change language"
            >
              <Languages className="h-4 w-4" />
              <span>{STAFF_LANG_LABEL[lang]}</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-rose-900/40 bg-rose-950/30 px-2.5 py-2 text-xs text-rose-200 hover:bg-rose-950/60 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t("Logout")}</span>
            </button>
          </div>
        </div>

        <nav className="mt-3 flex items-center gap-1 overflow-x-auto hide-scrollbar lg:hidden">
          {adminNav.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs transition-colors ${
                  isActive
                    ? "bg-[#2B1810] font-bold text-amber-300"
                    : "text-stone-400 hover:bg-[#2B1810] hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{t(link.label)}</span>
              </Link>
            );
          })}
        </nav>
      </header>
    </>
  );
}
