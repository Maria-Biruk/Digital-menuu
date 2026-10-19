'use client';

import React from 'react';
import { DollarSign, CheckCircle2, TrendingUp, ShoppingBag, Award, Layers } from 'lucide-react';
import { CATEGORIES } from '../lib/mock';

interface AnalyticsSummaryProps {
  grossRevenue?: number;
  completedOrders?: number;
  activeQueue?: number;
  avgOrderValue?: number;
  className?: string;
}

export default function AnalyticsSummary({
  grossRevenue = 148520,
  completedOrders = 124,
  activeQueue = 9,
  avgOrderValue = 1198,
  className = '',
}: AnalyticsSummaryProps) {
  const topSellers = [
    { rank: 1, name: 'Doro Wat Special', orders: 48, revenue: 21600 },
    { rank: 2, name: 'Beef Tibs', orders: 42, revenue: 15960 },
    { rank: 3, name: 'Kitfo Special', orders: 36, revenue: 17640 },
  ];

  const categoryBreakdown = [
    { name: 'Ethiopian Food', count: 48, percentage: 38 },
    { name: 'Pizza & Pasta', count: 26, percentage: 21 },
    { name: 'Coffee & Drinks', count: 24, percentage: 19 },
    { name: 'Cocktails', count: 18, percentage: 14 },
    { name: 'Desserts', count: 10, percentage: 8 },
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-[#1C1109] border border-stone-800 shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-stone-400">
              Gross Revenue
            </p>
            <p className="text-xl font-serif font-bold text-white mt-0.5">
              {grossRevenue.toLocaleString()} ETB
            </p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-[#1C1109] border border-stone-800 shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-stone-400">
              Completed Orders
            </p>
            <p className="text-xl font-serif font-bold text-white mt-0.5">
              {completedOrders}
            </p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-[#1C1109] border border-stone-800 shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-stone-400">
              Active Queue
            </p>
            <p className="text-xl font-serif font-bold text-white mt-0.5">
              {activeQueue}
            </p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-[#1C1109] border border-stone-800 shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#2B1810] text-amber-400 flex items-center justify-center shrink-0">
            <ShoppingBag size={24} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-stone-400">
              Avg Order Value
            </p>
            <p className="text-xl font-serif font-bold text-white mt-0.5">
              {avgOrderValue.toLocaleString()} ETB
            </p>
          </div>
        </div>
      </div>

      {/* Top 3 Best Sellers & Category Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 3 Best Sellers */}
        <div className="p-6 rounded-3xl bg-[#1C1109] border border-stone-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <Award size={18} className="text-amber-500" />
              <h3 className="font-serif font-bold text-base text-white">
                Top 3 Best Sellers Today
              </h3>
            </div>
            <span className="text-[10px] uppercase font-bold text-stone-500">
              Live Ranking
            </span>
          </div>

          <div className="space-y-3">
            {topSellers.map((item) => (
              <div
                key={item.rank}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-[#120B07] border border-stone-800/80"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                      item.rank === 1
                        ? 'bg-amber-500 text-neutral-950'
                        : item.rank === 2
                        ? 'bg-stone-300 text-neutral-950'
                        : 'bg-amber-800 text-white'
                    }`}
                  >
                    #{item.rank}
                  </span>
                  <div>
                    <p className="font-serif text-sm font-bold text-white">
                      {item.name}
                    </p>
                    <p className="text-xs text-stone-400">
                      {item.orders} portions served
                    </p>
                  </div>
                </div>

                <span className="text-xs font-bold text-amber-400">
                  {item.revenue.toLocaleString()} ETB
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="p-6 rounded-3xl bg-[#1C1109] border border-stone-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-cyan-400" />
              <h3 className="font-serif font-bold text-base text-white">
                Sales by Category
              </h3>
            </div>
            <span className="text-[10px] uppercase font-bold text-stone-500">
              Distribution
            </span>
          </div>

          <div className="space-y-3">
            {categoryBreakdown.map((cat) => (
              <div key={cat.name} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-stone-300 font-medium">{cat.name}</span>
                  <span className="text-stone-400 font-mono">
                    {cat.count} orders ({cat.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-stone-900 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#2B1810] to-amber-500 rounded-full"
                    style={{ width: `${cat.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
