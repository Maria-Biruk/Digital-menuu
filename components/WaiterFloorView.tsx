'use client';

import React, { useState } from 'react';
import { CheckCircle2, Clock, KeyRound, Utensils, BellRing, Sparkles } from 'lucide-react';
import { Ticket } from '../lib/types';
import { handleImgError } from '../lib/img';
import { orderNumber } from '../lib/order-number';
import { useT } from '../lib/i18n/staff';
import PickupCodeEntry from './PickupCodeEntry';

interface WaiterFloorViewProps {
  tickets: Ticket[];
  onMarkServed: (orderId: string, code: string) => void;
  className?: string;
}

export default function WaiterFloorView({
  tickets,
  onMarkServed,
  className = '',
}: WaiterFloorViewProps) {
  const t = useT();
  const [activeCodeTicket, setActiveCodeTicket] = useState<Ticket | null>(null);
  // Mobile-only column switcher (desktop always shows all three).
  const [mobileTab, setMobileTab] = useState<'ready' | 'preparing' | 'intake'>('ready');

  // Group tickets into:
  // 1. Ready to Serve (green)
  // 2. Preparing (blue)
  // 3. Awaiting Pickup Code / In handoff
  // Each lane keeps strict order of arrival (oldest first).
  const byArrival = (a: Ticket, b: Ticket) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  const readyTickets = tickets.filter((t) => t.status === 'ready').sort(byArrival);
  const preparingTickets = tickets.filter((t) => t.status === 'preparing').sort(byArrival);
  const queueTickets = tickets
    .filter((t) => t.status === 'queued' || t.status === 'held')
    .sort(byArrival);

  const columnClass = (tab: 'ready' | 'preparing' | 'intake') =>
    `space-y-3 ${mobileTab === tab ? '' : 'hidden lg:block'}`;

  const handleConfirmCode = (code: string) => {
    if (activeCodeTicket) {
      onMarkServed(activeCodeTicket.order_id, code);
      setActiveCodeTicket(null);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Mobile tabs: switch between the three floor lanes */}
      <div className="flex lg:hidden gap-2 p-1.5 rounded-2xl bg-[#3A241A]/60 border border-stone-800">
        {(
          [
            { id: 'ready', label: 'Ready to Serve', count: readyTickets.length, active: 'bg-emerald-600 text-white' },
            { id: 'preparing', label: 'Cooking', count: preparingTickets.length, active: 'bg-cyan-600 text-white' },
            { id: 'intake', label: 'Order Intake', count: queueTickets.length, active: 'bg-amber-500 text-stone-950' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMobileTab(tab.id)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileTab === tab.id ? tab.active : 'text-stone-400 hover:text-white bg-transparent'
            }`}
          >
            {t(tab.label)}
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                mobileTab === tab.id ? 'bg-black/25' : 'bg-stone-800 text-stone-300'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Ready to Serve (Green) */}
        <div className={columnClass('ready')}>
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-400" />
              <h3 className="font-serif font-bold text-sm">{t('Ready to Serve')}</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-neutral-950">
              {readyTickets.length}
            </span>
          </div>

          <div className="space-y-3">
            {readyTickets.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-[#3A241A]/30 border border-stone-800 text-stone-500 text-xs">
                {t('No orders ready for delivery at the moment.')}
              </div>
            ) : (
              readyTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-5 rounded-2xl bg-[#3A241A] border border-emerald-500/30 shadow-lg space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg font-extrabold text-amber-400 leading-none">
                        #{orderNumber(ticket.order_id)}
                      </span>
                      <span className="font-serif font-bold text-sm text-stone-300 bg-stone-900/60 px-2 py-0.5 rounded-md">
                        {ticket.table_label}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                      {t('READY')}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-stone-300">
                    {ticket.items.map((it, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        {it.image ? (
                          <img
                            src={it.image}
                            alt={it.name}
                            onError={handleImgError}
                            className="w-9 h-9 rounded-lg object-cover border border-stone-700/60 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-stone-800 border border-stone-700/60 shrink-0 flex items-center justify-center">
                            <Utensils size={14} className="text-stone-500" />
                          </div>
                        )}
                        <span>
                          <strong className="text-emerald-400">{it.quantity}x</strong> {it.name}
                        </span>
                      </div>
                    ))}
                  </div>

                  {ticket.notes && (
                    <p className="text-[11px] text-amber-300/80 italic">
                      {t('Note:')} {ticket.notes}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveCodeTicket(ticket)}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
                  >
                    <KeyRound size={15} /> {t('Enter Pickup Code & Serve')}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: Preparing (Blue / Cyan) */}
        <div className={columnClass('preparing')}>
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 text-cyan-300">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-cyan-400 animate-spin" />
              <h3 className="font-serif font-bold text-sm">{t('Cooking / Preparing')}</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500 text-neutral-950">
              {preparingTickets.length}
            </span>
          </div>

          <div className="space-y-3">
            {preparingTickets.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-[#3A241A]/30 border border-stone-800 text-stone-500 text-xs">
                {t('No orders currently in the cooking pipeline.')}
              </div>
            ) : (
              preparingTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-5 rounded-2xl bg-[#3A241A] border border-cyan-500/20 shadow-md space-y-2 opacity-90"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-extrabold text-amber-400 leading-none">
                        #{orderNumber(ticket.order_id)}
                      </span>
                      <span className="font-serif font-bold text-sm text-stone-200">
                        {ticket.table_label}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-400">
                      {ticket.station.toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-stone-400">
                    {ticket.items.map((it, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        {it.image ? (
                          <img
                            src={it.image}
                            alt={it.name}
                            onError={handleImgError}
                            className="w-8 h-8 rounded-lg object-cover border border-stone-700/60 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-stone-800 border border-stone-700/60 shrink-0 flex items-center justify-center">
                            <Utensils size={13} className="text-stone-500" />
                          </div>
                        )}
                        <span>
                          {it.quantity}x {it.name}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-stone-800/40 text-[10px] text-stone-500 flex items-center gap-1">
                    <Clock size={11} /> {ticket.elapsed_minutes || 10} {t('minutes in preparation')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Queued / Awaiting Pickup code */}
        <div className={columnClass('intake')}>
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#2B1810]/40 border border-[#2B1810] text-stone-300">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-amber-400" />
              <h3 className="font-serif font-bold text-sm">{t('Order Intake / Queued')}</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-stone-800 text-stone-300">
              {queueTickets.length}
            </span>
          </div>

          <div className="space-y-3">
            {queueTickets.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-[#3A241A]/30 border border-stone-800 text-stone-500 text-xs">
                {t('No freshly queued orders.')}
              </div>
            ) : (
              queueTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-5 rounded-2xl bg-[#3A241A] border border-stone-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-extrabold text-amber-400 leading-none">
                        #{orderNumber(ticket.order_id)}
                      </span>
                      <span className="font-serif font-bold text-sm text-stone-300">
                        {ticket.table_label}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-amber-500">
                      {t('Waiting for Chef')}
                    </span>
                  </div>
                  <div className="space-y-2 text-xs text-stone-400">
                    {ticket.items.map((it, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        {it.image ? (
                          <img
                            src={it.image}
                            alt={it.name}
                            onError={handleImgError}
                            className="w-8 h-8 rounded-lg object-cover border border-stone-700/60 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-stone-800 border border-stone-700/60 shrink-0 flex items-center justify-center">
                            <Utensils size={13} className="text-stone-500" />
                          </div>
                        )}
                        <span>
                          {it.quantity}x {it.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal for 4-digit Pickup Code entry */}
      {activeCodeTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <PickupCodeEntry
            expectedCode={activeCodeTicket.pickup_code}
            orderId={activeCodeTicket.order_id}
            tableLabel={activeCodeTicket.table_label}
            onSubmit={handleConfirmCode}
            onCancel={() => setActiveCodeTicket(null)}
          />
        </div>
      )}
    </div>
  );
}
