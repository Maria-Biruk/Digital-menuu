'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  CheckCircle2,
  ChefHat,
  Wine,
  Send,
  Armchair,
  ShoppingBag,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { setTicketStatus } from '../lib/db';
import type { Ticket, TicketStatus } from '../lib/types';

interface ApprovedOrderModalProps {
  orderId: string;
  amount: number;
  accountLabel: string;
  initialTickets: Ticket[];
  onClose: () => void;
  onSent?: () => void;
}

const STATION_META: Record<
  string,
  { label: string; icon: typeof ChefHat; accent: string }
> = {
  kitchen: { label: 'Hot Kitchen', icon: ChefHat, accent: 'text-amber-400' },
  bar: { label: 'Bar Station', icon: Wine, accent: 'text-purple-400' },
};

export default function ApprovedOrderModal({
  orderId,
  amount,
  accountLabel,
  initialTickets,
  onClose,
  onSent,
}: ApprovedOrderModalProps) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The cashier must explicitly dispatch the order; don't auto-mark it sent.
  const [dispatched, setDispatched] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(`dm_dispatched_${orderId}`) === '1';
    } catch {
      return false;
    }
  });

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const tableLabel = tickets[0]?.table_label ?? '—';
  const isTakeaway = /take/i.test(tableLabel);

  const totalItems = useMemo(
    () =>
      tickets.reduce(
        (sum, t) => sum + t.items.reduce((s, i) => s + i.quantity, 0),
        0,
      ),
    [tickets],
  );

  const handleSend = async () => {
    setError(null);
    setSending(true);
    try {
      const held = tickets.filter((t) => t.status === 'held');
      for (const t of held) {
        await setTicketStatus(t.id, 'preparing' as TicketStatus);
      }
      if (held.length) {
        setTickets((prev) =>
          prev.map((t) => (t.status === 'held' ? { ...t, status: 'preparing' } : t)),
        );
      }
      setDispatched(true);
      try {
        localStorage.setItem(`dm_dispatched_${orderId}`, '1');
      } catch {
        // Storage unavailable (private mode); state still updates in memory.
      }
      onSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send to kitchen.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-[#3A241A] border border-[#2B1810] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 p-5 pb-4 rounded-t-3xl bg-[#3A241A] border-b border-[#2B1810]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-white leading-tight">
                Payment Approved
              </h3>
              <p className="text-[11px] text-stone-400 font-mono">
                Order #{orderId.replace('ord-', '').slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-white hover:bg-black/30 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Meta row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-[#38210F] border border-[#2B1810]">
              <p className="text-[10px] uppercase tracking-wider text-stone-500 mb-1">
                {isTakeaway ? 'Fulfillment' : 'Table'}
              </p>
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                {isTakeaway ? (
                  <ShoppingBag className="w-4 h-4 text-amber-400" />
                ) : (
                  <Armchair className="w-4 h-4 text-amber-400" />
                )}
                {tableLabel}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-[#38210F] border border-[#2B1810]">
              <p className="text-[10px] uppercase tracking-wider text-stone-500 mb-1">
                Paid · {accountLabel}
              </p>
              <p className="text-emerald-400 font-bold text-sm">
                {amount.toLocaleString()} ETB
              </p>
            </div>
          </div>

          {/* Ordered items grouped by station */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Order Details
              </p>
              <span className="text-[11px] text-stone-500">
                {totalItems} item{totalItems === 1 ? '' : 's'}
              </span>
            </div>

            {tickets.length === 0 ? (
              <div className="p-4 rounded-2xl bg-[#38210F] border border-[#2B1810] text-xs text-stone-400 text-center">
                No ticket lines were created for this order.
              </div>
            ) : (
              tickets.map((t) => {
                const meta = STATION_META[t.station] ?? STATION_META.kitchen;
                const Icon = meta.icon;
                const sent = dispatched || t.status !== 'held';
                return (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl bg-[#38210F] border border-[#2B1810] space-y-2"
                  >
                    <div className="flex items-center justify-between pb-1 border-b border-stone-800/60">
                      <div className={`flex items-center gap-2 ${meta.accent}`}>
                        <Icon className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">
                          {meta.label}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                          sent
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-stone-800 text-stone-300 border-stone-700'
                        }`}
                      >
                        {sent ? 'In Kitchen' : 'On Hold'}
                      </span>
                    </div>

                    <ul className="space-y-1.5">
                      {t.items.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-baseline justify-between gap-2 text-sm"
                        >
                          <span className="text-stone-200">
                            <span className="font-bold text-amber-400">
                              {item.quantity}x
                            </span>{' '}
                            {item.name}
                          </span>
                          {item.notes && (
                            <span className="text-[10px] italic text-rose-300/80 bg-rose-950/30 px-2 py-0.5 rounded shrink-0">
                              {item.notes}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })
            )}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer / Send to Kitchen */}
        <div className="sticky bottom-0 p-5 pt-4 rounded-b-3xl bg-[#3A241A] border-t border-[#2B1810]">
          {dispatched ? (
            <div className="w-full py-3.5 px-4 rounded-xl bg-emerald-600/15 border border-emerald-500/40 text-emerald-300 font-bold text-sm flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Order sent to the Kitchen &amp; Bar
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || tickets.length === 0}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Sending…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Send to Kitchen
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
