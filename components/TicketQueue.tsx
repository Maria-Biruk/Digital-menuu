'use client';

import React, { useState } from 'react';
import { Clock, CheckCircle, ArrowRight, Utensils, AlertCircle } from 'lucide-react';
import { Ticket, TicketStatus } from '../lib/types';
import { handleImgError } from '../lib/img';
import { orderNumber } from '../lib/order-number';
import { useT } from '../lib/i18n/staff';

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
  const t = useT();
  const [activeStatus, setActiveStatus] = useState<TicketStatus>('queued');
  const statusTabs: { status: TicketStatus; label: string; matches: TicketStatus[] }[] = [
    { status: 'queued', label: 'Queued', matches: ['held', 'queued'] },
    { status: 'preparing', label: 'In Progress', matches: ['preparing'] },
    { status: 'ready', label: 'Ready', matches: ['ready'] },
  ];
  const activeTab = statusTabs.find((tab) => tab.status === activeStatus) ?? statusTabs[0];
  const visibleTickets = tickets.filter((ticket) =>
    activeTab.matches.includes(ticket.status),
  );
  const emptyStatusMessage =
    activeStatus === 'queued'
      ? 'No freshly queued orders.'
      : activeStatus === 'preparing'
        ? 'No orders currently in the cooking pipeline.'
        : 'No orders ready for delivery at the moment.';
  // Always present tickets in strict order of arrival (oldest first), no matter
  // what order the fetch / realtime merge happened to return them in.
  const sortedTickets = [...visibleTickets].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label={`${stationName} order status`}>
        {statusTabs.map((tab) => {
          const count = tickets.filter((ticket) => tab.matches.includes(ticket.status)).length;
          const isActive = activeStatus === tab.status;
          return (
            <button
              key={tab.status}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveStatus(tab.status)}
              className={`px-4 py-2 rounded-xl border text-xs font-bold transition-colors ${
                isActive
                  ? 'bg-amber-500 text-stone-950 border-amber-400'
                  : 'bg-[#3A241A]/70 text-stone-300 border-stone-800 hover:border-amber-500/50'
              }`}
            >
              {t(tab.label)} <span className="ml-1 opacity-75">{count}</span>
            </button>
          );
        })}
      </div>

      {sortedTickets.length === 0 ? (
        <div className="text-center py-16 p-6 rounded-3xl bg-[#3A241A]/40 border border-stone-800 flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-stone-900 text-stone-600 flex items-center justify-center mb-3">
            <CheckCircle size={26} />
          </div>
          <p className="font-serif text-base font-bold text-stone-300">
            {tickets.length === 0 ? t('All caught up!') : t(emptyStatusMessage)}
          </p>
          <p className="text-xs text-stone-500 mt-1">
            {tickets.length === 0
              ? `${t('No pending orders in the')} ${t(stationName)} ${t('queue.')}`
              : t('Select another status to view its orders.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortedTickets.map((ticket) => {
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
                    <span className="font-mono text-xl font-extrabold text-amber-400 leading-none tracking-tight">
                      #{orderNumber(ticket.order_id)}
                    </span>

                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${config.badgeClass}`}
                    >
                      {t(config.label)}
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
                              onError={handleImgError}
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
                        ? `${ticket.elapsed_minutes}${t('m elapsed')}`
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
                      className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 bg-[#2B1810] hover:bg-[#3D2415] text-white border border-stone-700"
                    >
                      <span>{t(config.nextLabel)}</span>
                      <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
