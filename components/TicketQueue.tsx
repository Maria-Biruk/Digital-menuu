'use client';

import React from 'react';
import { Clock, CheckCircle, ArrowRight, Utensils, AlertCircle } from 'lucide-react';
import { Ticket, TicketStatus } from '../lib/types';

interface TicketQueueProps {
  tickets: Ticket[];
  onAdvance: (ticketId: string) => void;
  stationName?: string;
  title?: string;
  className?: string;
}

const STATUS_CONFIG: Record<
  TicketStatus,
  { label: string; badgeClass: string; nextLabel: string }
> = {
  held: {
    label: 'On Hold',
    badgeClass: 'bg-stone-800 text-stone-300 border-stone-700',
    nextLabel: 'Release & Start',
  },
  queued: {
    label: 'Queued',
    badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    nextLabel: 'Start Preparing',
  },
  preparing: {
    label: 'In Progress',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse',
    nextLabel: 'Mark Ready',
  },
  ready: {
    label: 'Ready for Service',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    nextLabel: 'Ready',
  },
};

export default function TicketQueue({
  tickets,
  onAdvance,
  stationName = 'Station',
  title,
  className = '',
}: TicketQueueProps) {
  if (tickets.length === 0) {
    return (
      <div className={`text-center py-20 p-6 rounded-3xl bg-[#3A241A]/40 border border-stone-800 flex flex-col items-center justify-center ${className}`}>
        <div className="w-14 h-14 rounded-full bg-stone-900 text-stone-600 flex items-center justify-center mb-3">
          <CheckCircle size={26} />
        </div>
        <p className="font-serif text-base font-bold text-stone-300">
          All caught up!
        </p>
        <p className="text-xs text-stone-500 mt-1">
          No pending orders in the {stationName} queue.
        </p>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 ${className}`}>
      {tickets.map((ticket) => {
        const config = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.queued;
        const isReady = ticket.status === 'ready';

        return (
          <div
            key={ticket.id}
            className={`flex flex-col justify-between p-5 rounded-3xl bg-[#3A241A]/80 border shadow-xl transition-all duration-200 ${
              isReady
                ? 'border-emerald-500/40 shadow-emerald-950/20'
                : 'border-stone-800/80 hover:border-stone-700'
            }`}
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-800/60">
                <div className="flex items-center gap-2">
                  <span className="font-serif font-bold text-base text-white">
                    {ticket.table_label}
                  </span>
                  <span className="text-[11px] font-mono text-stone-400 bg-stone-900/80 px-2 py-0.5 rounded-md">
                    #{ticket.order_id.replace('ord-', '')}
                  </span>
                </div>

                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${config.badgeClass}`}
                >
                  {config.label}
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-2 mb-4">
                {ticket.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-10 h-10 rounded-lg object-cover border border-stone-700/60 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-stone-800 border border-stone-700/60 shrink-0 flex items-center justify-center">
                          <Utensils size={15} className="text-stone-500" />
                        </div>
                      )}
                      <span className="font-bold text-amber-400 text-sm shrink-0">
                        {item.quantity}x
                      </span>
                      <span className="font-medium text-stone-200 truncate">
                        {item.name}
                      </span>
                    </div>
                    {item.notes && (
                      <span className="text-[10px] italic text-rose-300/80 bg-rose-950/30 px-2 py-0.5 rounded shrink-0">
                        {item.notes}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Special Note */}
              {ticket.notes && (
                <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-900/30 text-[11px] text-amber-200/90 mb-4 flex items-start gap-1.5">
                  <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <span>{ticket.notes}</span>
                </div>
              )}
            </div>

            {/* Footer / Advance Button */}
            <div className="pt-3 border-t border-stone-800/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
                <Clock size={12} />
                <span>
                  {ticket.elapsed_minutes !== undefined
                    ? `${ticket.elapsed_minutes}m elapsed`
                    : new Date(ticket.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                </span>
              </div>

              {ticket.status !== 'ready' && (
                <button
                  type="button"
                  onClick={() => onAdvance(ticket.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 ${
                    isReady
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-[#2B1810] hover:bg-[#3D2415] text-white border border-stone-700'
                  }`}
                >
                  <span>{config.nextLabel}</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
