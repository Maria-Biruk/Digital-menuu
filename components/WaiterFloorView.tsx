'use client';

import React, { useState } from 'react';
import { CheckCircle2, Clock, KeyRound, Utensils, BellRing, Sparkles } from 'lucide-react';
import { Ticket } from '../lib/types';
import PickupCodeEntry from './PickupCodeEntry';

interface WaiterFloorViewProps {
  tickets: Ticket[];
  onMarkServed: (ticketId: string) => void;
  className?: string;
}

export default function WaiterFloorView({
  tickets,
  onMarkServed,
  className = '',
}: WaiterFloorViewProps) {
  const [activeCodeTicket, setActiveCodeTicket] = useState<Ticket | null>(null);

  // Group tickets into:
  // 1. Ready to Serve (green)
  // 2. Preparing (blue)
  // 3. Awaiting Pickup Code / In handoff
  const readyTickets = tickets.filter((t) => t.status === 'ready');
  const preparingTickets = tickets.filter((t) => t.status === 'preparing');
  const queueTickets = tickets.filter((t) => t.status === 'queued' || (t.status as string) === 'queue');

  const handleConfirmCode = (code: string) => {
    if (activeCodeTicket) {
      onMarkServed(activeCodeTicket.id);
      setActiveCodeTicket(null);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Ready to Serve (Green) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-400" />
              <h3 className="font-serif font-bold text-sm">Ready to Serve</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-neutral-950">
              {readyTickets.length}
            </span>
          </div>

          <div className="space-y-3">
            {readyTickets.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-[#1C1109]/30 border border-stone-800 text-stone-500 text-xs">
                No orders ready for delivery at the moment.
              </div>
            ) : (
              readyTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-5 rounded-2xl bg-[#1C1109] border border-emerald-500/30 shadow-lg space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-base text-white">
                      {ticket.table_label}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                      #{ticket.order_id.replace('ord-', '')}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-stone-300">
                    {ticket.items.map((it, idx) => (
                      <p key={idx}>
                        <strong className="text-emerald-400">{it.quantity}x</strong> {it.name}
                      </p>
                    ))}
                  </div>

                  {ticket.notes && (
                    <p className="text-[11px] text-amber-300/80 italic">
                      Note: {ticket.notes}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveCodeTicket(ticket)}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
                  >
                    <KeyRound size={15} /> Enter Pickup Code & Serve
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: Preparing (Blue / Cyan) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 text-cyan-300">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-cyan-400 animate-spin" />
              <h3 className="font-serif font-bold text-sm">Cooking / Preparing</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500 text-neutral-950">
              {preparingTickets.length}
            </span>
          </div>

          <div className="space-y-3">
            {preparingTickets.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-[#1C1109]/30 border border-stone-800 text-stone-500 text-xs">
                No orders currently in the cooking pipeline.
              </div>
            ) : (
              preparingTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-5 rounded-2xl bg-[#1C1109] border border-cyan-500/20 shadow-md space-y-2 opacity-90"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-sm text-stone-200">
                      {ticket.table_label}
                    </span>
                    <span className="text-[10px] font-mono text-cyan-400">
                      {ticket.station.toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-stone-400">
                    {ticket.items.map((it, idx) => (
                      <p key={idx}>
                        {it.quantity}x {it.name}
                      </p>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-stone-800/40 text-[10px] text-stone-500 flex items-center gap-1">
                    <Clock size={11} /> {ticket.elapsed_minutes || 10} minutes in preparation
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Queued / Awaiting Pickup code */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#2B1810]/40 border border-[#2B1810] text-stone-300">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-amber-400" />
              <h3 className="font-serif font-bold text-sm">Order Intake / Queued</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-stone-800 text-stone-300">
              {queueTickets.length}
            </span>
          </div>

          <div className="space-y-3">
            {queueTickets.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-[#1C1109]/30 border border-stone-800 text-stone-500 text-xs">
                No freshly queued orders.
              </div>
            ) : (
              queueTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-5 rounded-2xl bg-[#1C1109] border border-stone-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-sm text-stone-300">
                      {ticket.table_label}
                    </span>
                    <span className="text-[10px] font-mono text-amber-500">
                      Waiting for Chef
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-stone-400">
                    {ticket.items.map((it, idx) => (
                      <p key={idx}>
                        {it.quantity}x {it.name}
                      </p>
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
