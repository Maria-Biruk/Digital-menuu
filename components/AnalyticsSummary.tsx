'use client';

import React from 'react';
import {
  DollarSign,
  CheckCircle2,
  Clock,
  Wallet,
  Award,
  Layers,
  LineChart,
} from 'lucide-react';

interface TopSeller {
  rank: number;
  name: string;
  orders: number;
  revenue: number;
}

interface CategorySlice {
  name: string;
  count: number;
  percentage: number;
}

interface SeriesPoint {
  label: string;
  value: number;
}

interface AnalyticsSummaryProps {
  grossRevenue?: number;
  completedOrders?: number;
  activeQueue?: number;
  avgOrderValue?: number;
  topSellers?: TopSeller[];
  categoryBreakdown?: CategorySlice[];
  revenueSeries?: SeriesPoint[];
  period?: 'today' | 'week' | 'month' | 'year';
  loading?: boolean;
  className?: string;
}

/** Lightweight, dependency-free SVG line chart for the revenue time-series. */
function RevenueChart({ series, period }: { series: SeriesPoint[]; period: 'today' | 'week' | 'month' | 'year' }) {
  const data = series ?? [];
  const max = Math.max(1, ...data.map((d) => d.value));
  const W = 720;
  const H = 240;
  const padX = 8;
  const padTop = 16;
  const padBottom = 28;
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBottom;
  const n = data.length || 1;
  const slot = innerW / n;
  const hasData = data.some((d) => d.value > 0);

  // Show a subset of x-axis labels so dense series (month) stay readable.
  const labelStep = period === 'today' ? 2 : period === 'month' ? 5 : 1;

  // Center each point within its slot so the line aligns with the x-axis labels.
  const px = (i: number) => padX + slot * i + slot / 2;
  const py = (v: number) => padTop + innerH - (v / max) * innerH;

  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${px(i)} ${py(d.value)}`)
    .join(' ');
  const areaPath = data.length
    ? `${linePath} L ${px(data.length - 1)} ${padTop + innerH} L ${px(0)} ${padTop + innerH} Z`
    : '';

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[240px]" preserveAspectRatio="none">
        <defs>
          <linearGradient id="rev-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = padTop + innerH * t;
          return (
            <line
              key={t}
              x1={padX}
              x2={W - padX}
              y1={y}
              y2={y}
              stroke="#2B1810"
              strokeWidth={1}
              strokeDasharray="3 5"
            />
          );
        })}

        {data.length > 0 && (
          <>
            {/* Gradient area under the line */}
            <path d={areaPath} fill="url(#rev-area)" />

            {/* The line itself */}
            <path
              d={linePath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />

            {/* Data points */}
            {data.map((d, i) => (
              <circle
                key={i}
                cx={px(i)}
                cy={py(d.value)}
                r={3.5}
                fill="#3A241A"
                stroke="#f59e0b"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              >
                <title>{`${d.label}: ${d.value.toLocaleString()} ETB`}</title>
              </circle>
            ))}
          </>
        )}
      </svg>

      {/* X-axis labels */}
      <div className="flex justify-between px-1 mt-1">
        {data.map((d, i) => (
          <span
            key={i}
            className="text-[9px] text-stone-500 font-mono"
            style={{ flex: '1 1 0', textAlign: 'center' }}
          >
            {i % labelStep !== 0 ? '' : d.label}
          </span>
        ))}
      </div>

      {!hasData && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-stone-500 italic">No revenue recorded for this period yet.</span>
        </div>
      )}
    </div>
  );
}

export default function AnalyticsSummary({
  grossRevenue = 0,
  completedOrders = 0,
  activeQueue = 0,
  avgOrderValue = 0,
  topSellers = [],
  categoryBreakdown = [],
  revenueSeries = [],
  period = 'today',
  loading = false,
  className = '',
}: AnalyticsSummaryProps) {
  const statCards = [
    { label: 'Gross Revenue', value: `${grossRevenue.toLocaleString()} ETB`, icon: DollarSign, tone: 'bg-amber-500/10 text-amber-400' },
    { label: 'Completed Orders', value: `${completedOrders}`, icon: CheckCircle2, tone: 'bg-emerald-500/10 text-emerald-400' },
    { label: 'Active Queue', value: `${activeQueue}`, icon: Clock, tone: 'bg-cyan-500/10 text-cyan-400' },
    { label: 'Avg Order Value', value: `${avgOrderValue.toLocaleString()} ETB`, icon: Wallet, tone: 'bg-[#2B1810] text-amber-400' },
  ];

  return (
    <div className={`space-y-6 ${className} ${loading ? 'opacity-60 transition-opacity' : ''}`}>
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="p-5 rounded-3xl bg-[#3A241A] border border-stone-800 shadow-xl flex items-center gap-4"
            >
              <div className={`w-12 h-12 rounded-2xl ${c.tone} flex items-center justify-center shrink-0`}>
                <Icon size={24} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold tracking-wider text-stone-400">
                  {c.label}
                </p>
                <p className="text-xl font-serif font-bold text-white mt-0.5 truncate">{c.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Revenue Chart */}
      <div className="p-6 rounded-3xl bg-[#3A241A] border border-stone-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <LineChart size={18} className="text-amber-500" />
            <h3 className="font-serif font-bold text-base text-white">
              Revenue
              {period === 'today'
                ? ' by Hour (Today)'
                : period === 'week'
                ? ' by Day (This Week)'
                : period === 'month'
                ? ' by Day (This Month)'
                : ' by Month (This Year)'}
            </h3>
          </div>
          <span className="text-[10px] uppercase font-bold text-stone-500">
            Peak {Math.max(0, ...revenueSeries.map((d) => d.value)).toLocaleString()} ETB
          </span>
        </div>
        <RevenueChart series={revenueSeries} period={period} />
      </div>

      {/* Top Best Sellers & Category Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Best Sellers */}
        <div className="p-6 rounded-3xl bg-[#3A241A] border border-stone-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <Award size={18} className="text-amber-500" />
              <h3 className="font-serif font-bold text-base text-white">
                Top Sellers Today
              </h3>
            </div>
            <span className="text-[10px] uppercase font-bold text-stone-500">
              Ranked by Qty Sold
            </span>
          </div>

          <div className="space-y-3">
            {topSellers.length === 0 ? (
              <p className="text-xs text-stone-500 italic">No sales recorded today yet.</p>
            ) : (
              topSellers.map((item) => (
                <div
                  key={item.rank}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-[#38210F] border border-stone-800/80"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        item.rank === 1
                          ? 'bg-amber-500 text-neutral-950'
                          : item.rank === 2
                          ? 'bg-stone-300 text-neutral-950'
                          : item.rank === 3
                          ? 'bg-amber-800 text-white'
                          : 'bg-stone-800 text-stone-300'
                      }`}
                    >
                      #{item.rank}
                    </span>
                    <div className="min-w-0">
                      <p className="font-serif text-sm font-bold text-white truncate">{item.name}</p>
                      <p className="text-xs text-stone-400">{item.orders} portions sold</p>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-amber-400 shrink-0">
                    {item.revenue.toLocaleString()} ETB
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="p-6 rounded-3xl bg-[#3A241A] border border-stone-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-cyan-400" />
              <h3 className="font-serif font-bold text-base text-white">Sales by Category</h3>
            </div>
            <span className="text-[10px] uppercase font-bold text-stone-500">Distribution</span>
          </div>

          <div className="space-y-3">
            {categoryBreakdown.length === 0 ? (
              <p className="text-xs text-stone-500 italic">No category data for this period.</p>
            ) : (
              categoryBreakdown.map((cat) => (
                <div key={cat.name} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-300 font-medium">{cat.name}</span>
                    <span className="text-stone-400 font-mono">
                      {cat.count} sold ({cat.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-stone-900 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#2B1810] to-amber-500 rounded-full"
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
