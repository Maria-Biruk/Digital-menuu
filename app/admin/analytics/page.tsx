"use client";

import React, { useState } from "react";
import AdminHeader from "@/components/AdminHeader";
import AnalyticsSummary from "@/components/AnalyticsSummary";
import { Download, Calendar, TrendingUp, Sparkles, Filter } from "lucide-react";

// TODO: Supabase wiring - fetch aggregated metrics with supabase RPC or SQL query:
// const { data: stats } = await supabase.rpc('get_restaurant_analytics', { p_slug: 'meskel-house', p_period: timeframe });

import RoleGuard from "@/components/RoleGuard";
import { getRoleInfo } from "@/lib/permissions";
import { Lock, Crown } from "lucide-react";

export default function AdminAnalyticsPage() {
  return (
    <RoleGuard allowedRoles={["super_admin", "owner", "admin"]} pageTitle="Analytics">
      <AdminAnalyticsContent />
    </RoleGuard>
  );
}

function AdminAnalyticsContent() {
  const [timeframe, setTimeframe] = useState<"today" | "week" | "month" | "year">("today");
  const [role, setRole] = useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setRole(localStorage.getItem("staff_role"));
    }
  }, []);

  const roleInfo = getRoleInfo(role);
  const isSuperAdmin = roleInfo.role === "super_admin" || roleInfo.role === "owner";

  const timeframeData = {
    today: { grossRevenue: 148520, completedOrders: 124, activeQueue: 9, avgOrderValue: 1198 },
    week: { grossRevenue: 984200, completedOrders: 820, activeQueue: 9, avgOrderValue: 1200 },
    month: { grossRevenue: 4120000, completedOrders: 3450, activeQueue: 9, avgOrderValue: 1194 },
    year: { grossRevenue: 49800000, completedOrders: 41200, activeQueue: 9, avgOrderValue: 1208 },
  };

  const currentStats = timeframeData[timeframe];

  return (
    <div className="min-h-screen bg-[#120B07] text-stone-100 font-sans pb-16">
      <AdminHeader
        title="Performance Analytics"
        subtitle="Sales Insights & Kitchen Velocity"
      />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Top Filter Bar */}
        <div className="bg-[#1C1109] border border-[#2B1810] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
          <div>
            <h2 className="font-serif font-bold text-base text-white">
              Revenue & Order Overview
            </h2>
            <p className="text-xs text-stone-400">
              Live business analytics across dine-in, takeaway, and station breakdown.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Timeframe Chips */}
            <div className="flex bg-[#120B07] p-1 rounded-xl border border-[#2B1810]">
              {(["today", "week", "month", "year"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                    timeframe === t
                      ? "bg-[#2B1810] text-amber-300 font-bold shadow-sm border border-[#3D2415]"
                      : "text-stone-400 hover:text-white"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <button
              onClick={() => alert("Exporting PDF Summary Report for " + timeframe.toUpperCase())}
              className="px-3.5 py-2 rounded-xl bg-[#2B1810] hover:bg-[#3D2415] text-stone-200 hover:text-white text-xs font-semibold border border-[#3D2415] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Analytics Summary Component */}
        <AnalyticsSummary
          grossRevenue={currentStats.grossRevenue}
          completedOrders={currentStats.completedOrders}
          activeQueue={currentStats.activeQueue}
          avgOrderValue={currentStats.avgOrderValue}
        />
      </div>
    </div>
  );
}
