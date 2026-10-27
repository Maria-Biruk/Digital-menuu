"use client";

import React, { useState, useEffect, useCallback } from "react";
import AdminHeader from "@/components/AdminHeader";
import AnalyticsSummary from "@/components/AnalyticsSummary";
import { fetchAnalytics, type Analytics, type AnalyticsPeriod } from "@/lib/db";
import { getRoleInfo } from "@/lib/permissions";
import { Download } from "lucide-react";

import RoleGuard from "@/components/RoleGuard";

export default function AdminAnalyticsPage() {
  return (
    <RoleGuard allowedRoles={["super_admin", "owner", "admin"]} pageTitle="Analytics">
      <AdminAnalyticsContent />
    </RoleGuard>
  );
}

function AdminAnalyticsContent() {
  const [timeframe, setTimeframe] = useState<AnalyticsPeriod>("week");
  const [stats, setStats] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  // Super Admin (and Owner) additionally get Month & Year timeframes.
  useEffect(() => {
    setRole(localStorage.getItem("staff_role"));
  }, []);
  const roleInfo = getRoleInfo(role);
  const isSuperAdmin = roleInfo.role === "super_admin" || roleInfo.role === "owner";
  const periods: AnalyticsPeriod[] = isSuperAdmin
    ? ["today", "week", "month", "year"]
    : ["today", "week"];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAnalytics(timeframe);
      setStats(data);
    } catch (err) {
      console.error("Failed to load analytics", err);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleExport = () => {
    if (!stats) return;
    const rows: string[][] = [];
    const push = (...cells: (string | number)[]) => rows.push(cells.map(String));

    push("Skill Coffee — Analytics Report");
    push("Period", timeframe.toUpperCase());
    push("Generated", new Date().toLocaleString());
    rows.push([]);
    push("KPI", "Value");
    push("Gross Revenue (ETB)", stats.grossRevenue);
    push("Completed Orders", stats.completedOrders);
    push("Active Queue", stats.activeQueue);
    push("Avg Order Value (ETB)", stats.avgOrderValue);
    rows.push([]);
    push("Revenue " + (timeframe === "today" ? "By Hour" : timeframe === "year" ? "By Month" : "By Day"));
    push("Bucket", "Revenue (ETB)");
    stats.revenueSeries.forEach((d) => push(d.label, d.value));
    rows.push([]);
    push("Top Sellers Today (by qty sold)");
    push("Rank", "Item", "Portions Sold", "Revenue (ETB)");
    stats.topSellers.forEach((s) => push(s.rank, s.name, s.orders, s.revenue));
    rows.push([]);
    push("Sales by Category");
    push("Category", "Units Sold", "Share (%)");
    stats.categoryBreakdown.forEach((c) => push(c.name, c.count, c.percentage));

    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `skill-coffee-analytics-${timeframe}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const currentStats = stats ?? {
    grossRevenue: 0,
    completedOrders: 0,
    activeQueue: 0,
    avgOrderValue: 0,
    topSellers: [],
    categoryBreakdown: [],
    revenueSeries: [],
  };

  return (
    <div className="min-h-screen app-bg-dark text-stone-100 font-sans pb-16">
      <AdminHeader
        title="Performance Analytics"
        subtitle="Sales Insights & Kitchen Velocity"
      />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Top Filter Bar */}
        <div className="bg-[#3A241A] border border-[#2B1810] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
          <div>
            <h2 className="font-serif font-bold text-base text-white">
              Revenue &amp; Order Overview
            </h2>
            <p className="text-xs text-stone-400">
              {loading
                ? "Crunching the latest numbers..."
                : "Live business analytics computed directly from the Supabase orders database."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Timeframe Chips */}
            <div className="flex bg-[#38210F] p-1 rounded-xl border border-[#2B1810]">
              {periods.map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
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
              onClick={handleExport}
              disabled={loading || !stats}
              className="px-3.5 py-2 rounded-xl bg-[#2B1810] hover:bg-[#3D2415] text-stone-200 hover:text-white text-xs font-semibold border border-[#3D2415] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Report</span>
            </button>
          </div>
        </div>

        {/* Analytics Summary Component */}
        <AnalyticsSummary
          grossRevenue={currentStats.grossRevenue}
          completedOrders={currentStats.completedOrders}
          activeQueue={currentStats.activeQueue}
          avgOrderValue={currentStats.avgOrderValue}
          topSellers={currentStats.topSellers}
          categoryBreakdown={currentStats.categoryBreakdown}
          revenueSeries={currentStats.revenueSeries}
          period={timeframe}
          loading={loading}
        />
      </div>
    </div>
  );
}
