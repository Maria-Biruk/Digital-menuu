'use client';

import React from 'react';
import {
  DollarSign,
  CheckCircle2,
  Clock,
  Wallet,
  Award,
  Layers,
  BarChart3,
  TrendingUp,
  Flame,
  Timer,
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

interface CategorySeriesLine {
  name: string;
  points: number[];
  topItemsByBucket: { name: string; qty: number }[][];
}

interface ItemSale {
  name: string;
  category: string;
  quantity: number;
  revenue: number;
}

interface ItemPrepStat {
  name: string;
  avgMinutes: number;
  samples: number;
}

interface AnalyticsSummaryProps {
  grossRevenue?: number;
  completedOrders?: number;
  activeQueue?: number;
  avgOrderValue?: number;
  topSellers?: TopSeller[];
  categoryBreakdown?: CategorySlice[];
  revenueSeries?: SeriesPoint[];
  ordersSeries?: SeriesPoint[];
  categorySeries?: CategorySeriesLine[];
  itemSales?: ItemSale[];
  itemPrep?: ItemPrepStat[];
  peakBucket?: string;
  period?: 'today' | 'week' | 'month' | 'year';
  loading?: boolean;
  className?: string;
}

const PALETTE = ['#f59e0b', '#10b981', '#06b6d4', '#a78bfa', '#fb7185'];

function periodSuffix(period: 'today' | 'week' | 'month' | 'year') {
  const year = new Date().getFullYear();
  return period === 'today'
    ? ` by Hour (Today · ${year})`
    : period === 'week'
    ? ` by Day (This Week · ${year})`
    : period === 'month'
    ? ` by Day (This Month · ${year})`
    : ` by Month (${year})`;
}

/** Dependency-free SVG BAR chart for revenue. */
function RevenueBars({ series, period }: { series: SeriesPoint[]; period: 'today' | 'week' | 'month' | 'year' }) {
  const data = series ?? [];
  const max = Math.max(1, ...data.map((d) => d.value));
  const W = 720;
  const H = 240;
  const padX = 10;
  const padTop = 16;
  const padBottom = 28;
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBottom;
  const n = data.length || 1;
  const slot = innerW / n;
  const barW = Math.max(3, slot * 0.6);
  const hasData = data.some((d) => d.value > 0);
  const labelStep = period === 'today' ? 2 : period === 'month' ? 5 : 1;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[240px]" preserveAspectRatio="none">
        <defs>
          <linearGradient id="rev-bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = padTop + innerH * t;
          return (
            <line key={t} x1={padX} x2={W - padX} y1={y} y2={y} stroke="#2B1810" strokeWidth={1} strokeDasharray="3 5" />
          );
        })}

        {data.map((d, i) => {
          const h = (d.value / max) * innerH;
          const x = padX + slot * i + (slot - barW) / 2;
          const y = padTop + innerH - h;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={Math.max(0, h)}
              rx={3}
              fill="url(#rev-bar)"
              stroke="#f59e0b"
              strokeOpacity={0.5}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            >
              <title>{`${d.label}: ${d.value.toLocaleString()} ETB`}</title>
            </rect>
          );
        })}
      </svg>

      <div className="flex justify-between px-1 mt-1">
        {data.map((d, i) => (
          <span key={i} className="text-[9px] text-stone-500 font-mono" style={{ flex: '1 1 0', textAlign: 'center' }}>
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

/** Dependency-free SVG line chart with a category breakdown on hover. */
function OrderVolumeLine({
  series,
  categories,
  period,
}: {
  series: SeriesPoint[];
  categories: CategorySeriesLine[];
  period: 'today' | 'week' | 'month' | 'year';
}) {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const data = series ?? [];
  const max = Math.max(1, ...data.map((d) => d.value));
  const W = 720;
  const H = 240;
  const padX = 16;
  const padTop = 16;
  const padBottom = 28;
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBottom;
  const hasData = data.some((d) => d.value > 0);
  const labelStep = period === 'today' ? 2 : period === 'month' ? 5 : 1;
  const points = data.map((point, index) => ({
    x: data.length === 1 ? W / 2 : padX + (innerW * index) / (data.length - 1),
    y: padTop + innerH - (point.value / max) * innerH,
    ...point,
  }));
  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const hoveredPoint =
    hoveredIndex == null ? null : points[hoveredIndex] ?? null;
  const hoveredCategories =
    hoveredIndex == null
      ? []
      : categories.map((category, index) => ({
          name: category.name,
          value: category.points[hoveredIndex] ?? 0,
          topItem: category.topItemsByBucket[hoveredIndex]?.[0],
          color: PALETTE[index % PALETTE.length],
        }));

  return (
    <div className="relative" onMouseLeave={() => setHoveredIndex(null)}>
      {hoveredPoint && (
        <div
          className="pointer-events-none absolute top-0 z-10 w-[min(15rem,80%)] -translate-x-1/2 rounded-2xl border border-amber-500/50 bg-[#2B1810] p-3.5 shadow-2xl"
          style={{
            left: `${(hoveredPoint.x / W) * 100}%`,
          }}
        >
          <p className="mb-2 text-xs font-extrabold text-amber-300">
            {hoveredPoint.label} · {hoveredPoint.value} orders
          </p>
          <div className="space-y-1.5">
            {hoveredCategories.length ? (
              hoveredCategories.map((category) => (
                <div
                  key={category.name}
                  className="flex items-start justify-between gap-3 text-xs"
                >
                  <span className="flex items-start gap-2 text-stone-300">
                    <span
                      className="mt-1 h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span>
                      <span className="font-semibold">{category.name}</span>
                      <span className="block pl-1 text-[11px] italic text-stone-500">
                        {category.value
                          ? `${category.topItem?.name ?? "Items"} · ${category.value} sold`
                          : "No sales"}
                      </span>
                    </span>
                  </span>
                  <span className="font-mono font-semibold text-stone-400">
                    {category.value}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-[11px] italic text-stone-500">No category sales</p>
            )}
          </div>
        </div>
      )}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-[240px] w-full touch-pan-y"
        preserveAspectRatio="none"
        onMouseMove={(event) => {
          if (!data.length) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          const ratio = (event.clientX - bounds.left) / bounds.width;
          setHoveredIndex(
            Math.max(
              0,
              Math.min(data.length - 1, Math.round(ratio * (data.length - 1))),
            ),
          );
        }}
        onTouchStart={(event) => {
          if (!data.length) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          const ratio = (event.touches[0].clientX - bounds.left) / bounds.width;
          setHoveredIndex(
            Math.max(
              0,
              Math.min(data.length - 1, Math.round(ratio * (data.length - 1))),
            ),
          );
        }}
        onTouchMove={(event) => {
          if (!data.length) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          const ratio = (event.touches[0].clientX - bounds.left) / bounds.width;
          setHoveredIndex(
            Math.max(
              0,
              Math.min(data.length - 1, Math.round(ratio * (data.length - 1))),
            ),
          );
        }}
      >
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
        {hoveredPoint && (
          <line
            x1={hoveredPoint.x}
            x2={hoveredPoint.x}
            y1={padTop}
            y2={padTop + innerH}
            stroke="#f59e0b"
            strokeOpacity={0.45}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )}
        {points.length > 1 && (
          <path
            d={linePath}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={hoveredIndex === index ? 5 : 3.5}
            fill="#3A241A"
            stroke="#f59e0b"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          >
            <title>{`${point.label}: ${point.value} orders`}</title>
          </circle>
        ))}
      </svg>

      <div className="flex justify-between px-1 mt-1">
        {data.map((point, index) => (
          <span key={index} className="text-[9px] text-stone-500 font-mono" style={{ flex: '1 1 0', textAlign: 'center' }}>
            {index % labelStep !== 0 ? '' : point.label}
          </span>
        ))}
      </div>

      {!hasData && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-stone-500 italic">No orders recorded for this period yet.</span>
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
  ordersSeries = [],
  categorySeries = [],
  itemSales = [],
  itemPrep = [],
  peakBucket = '—',
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

  // Headline insights for the volume chart.
  const peakOrders = ordersSeries.length ? Math.max(...ordersSeries.map((d) => d.value)) : 0;
  const totalItemsSold = itemSales.reduce((s, x) => s + x.quantity, 0);
  const topCategory = categorySeries.length
    ? [...categorySeries].sort((a, b) => b.points.reduce((s, v) => s + v, 0) - a.points.reduce((s, v) => s + v, 0))[0].name
    : categoryBreakdown[0]?.name ?? '—';

  return (
    <div className={`space-y-6 ${className} ${loading ? 'opacity-60 transition-opacity' : ''}`}>
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="p-5 rounded-3xl bg-[#3A241A] border border-stone-800 shadow-xl flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl ${c.tone} flex items-center justify-center shrink-0`}>
                <Icon size={24} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold tracking-wider text-stone-400">{c.label}</p>
                <p className="text-xl font-serif font-bold text-white mt-0.5 truncate">{c.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Insights band */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/50 to-[#3A241A] border border-amber-800/40 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
            <Flame size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold tracking-wider text-stone-400">Peak {period === 'today' ? 'Hour' : period === 'year' ? 'Month' : 'Day'}</p>
            <p className="text-sm font-serif font-bold text-white truncate">{peakBucket} · {peakOrders} orders</p>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-[#3A241A] border border-stone-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
            <TrendingUp size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold tracking-wider text-stone-400">Top Category</p>
            <p className="text-sm font-serif font-bold text-white truncate">{topCategory}</p>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-[#3A241A] border border-stone-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
            <Award size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold tracking-wider text-stone-400">Items Sold</p>
            <p className="text-sm font-serif font-bold text-white truncate">{totalItemsSold.toLocaleString()} across {itemSales.length} SKUs</p>
          </div>
        </div>
      </div>

      {/* Revenue and order volume charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-[#3A241A] border border-stone-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-amber-500" />
              <h3 className="font-serif font-bold text-base text-white">Revenue{periodSuffix(period)}</h3>
            </div>
            <span className="text-[10px] uppercase font-bold text-stone-500">
              Peak {Math.max(0, ...revenueSeries.map((d) => d.value)).toLocaleString()} ETB
            </span>
          </div>
          <RevenueBars series={revenueSeries} period={period} />
        </div>

        <div className="p-6 rounded-3xl bg-[#3A241A] border border-stone-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-cyan-400" />
              <h3 className="font-serif font-bold text-base text-white">Order Volume{periodSuffix(period)}</h3>
            </div>
            <span className="text-[10px] uppercase font-bold text-stone-500">
              Peak {peakOrders} orders
            </span>
          </div>
          <OrderVolumeLine
            series={ordersSeries}
            categories={categorySeries}
            period={period}
          />
        </div>
      </div>

      {/* Category breakdown */}
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
            categoryBreakdown.map((cat, i) => (
              <div key={cat.name} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-stone-300 font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                    {cat.name}
                  </span>
                  <span className="text-stone-400 font-mono">{cat.count} sold ({cat.percentage}%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-stone-900 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${cat.percentage}%`, background: PALETTE[i % PALETTE.length] }} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Top Best Sellers */}
      <div className="grid grid-cols-1 gap-6">
        {/* Best Sellers */}
        <div className="p-6 rounded-3xl bg-[#3A241A] border border-stone-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <Award size={18} className="text-amber-500" />
              <h3 className="font-serif font-bold text-base text-white">Top Sellers Today</h3>
            </div>
            <span className="text-[10px] uppercase font-bold text-stone-500">Ranked by Qty Sold</span>
          </div>

          <div className="space-y-3">
            {topSellers.length === 0 ? (
              <p className="text-xs text-stone-500 italic">No sales recorded today yet.</p>
            ) : (
              topSellers.map((item) => (
                <div key={item.rank} className="flex items-center justify-between p-3.5 rounded-2xl bg-[#38210F] border border-stone-800/80">
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
                  <span className="text-xs font-bold text-amber-400 shrink-0">{item.revenue.toLocaleString()} ETB</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Full item sales table (feeds the CSV export) */}
      {itemSales.length > 0 && (
        <div className="p-6 rounded-3xl bg-[#3A241A] border border-stone-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-amber-500" />
              <h3 className="font-serif font-bold text-base text-white">All Items Sold ({period})</h3>
            </div>
            <span className="text-[10px] uppercase font-bold text-stone-500">{itemSales.length} SKUs</span>
          </div>

          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-left text-sm text-stone-300">
              <thead className="text-[11px] uppercase tracking-wider text-stone-400 border-b border-stone-800 sticky top-0 bg-[#3A241A]">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">#</th>
                  <th className="py-2.5 px-3 font-semibold">Item</th>
                  <th className="py-2.5 px-3 font-semibold">Category</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Qty</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Amount (ETB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60">
                {itemSales.map((it, i) => (
                  <tr key={it.name} className="hover:bg-[#38210F]/60 transition-colors">
                    <td className="py-2 px-3 text-stone-500 font-mono text-xs">{i + 1}</td>
                    <td className="py-2 px-3 font-semibold text-white text-xs sm:text-sm">{it.name}</td>
                    <td className="py-2 px-3 text-xs text-stone-400">{it.category}</td>
                    <td className="py-2 px-3 text-right font-mono text-amber-300">{it.quantity}</td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-300">{it.revenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Average prep / delivery time per product */}
      {itemPrep.length > 0 && (
        <div className="p-6 rounded-3xl bg-[#3A241A] border border-stone-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <Timer size={18} className="text-cyan-400" />
              <h3 className="font-serif font-bold text-base text-white">Average Prep / Delivery Time</h3>
            </div>
            <span className="text-[10px] uppercase font-bold text-stone-500">Kitchen Velocity</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {itemPrep.map((p) => (
              <div key={p.name} className="p-3.5 rounded-2xl bg-[#38210F] border border-stone-800/80 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-serif text-sm font-bold text-white truncate">{p.name}</p>
                  <p className="text-[11px] text-stone-500">{p.samples} completed order{p.samples === 1 ? '' : 's'}</p>
                </div>
                <span
                  className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                    p.avgMinutes <= 10
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : p.avgMinutes <= 20
                      ? 'bg-amber-500/15 text-amber-300'
                      : 'bg-rose-500/15 text-rose-300'
                  }`}
                >
                  {p.avgMinutes} min
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
