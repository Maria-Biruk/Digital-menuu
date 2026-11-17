'use client';

import React, { useState } from 'react';
import { Bell, CheckCircle2 } from 'lucide-react';
import { supabaseDiner, ensureDinerSession } from '../lib/supabase';
import type { Table } from '../lib/types';

interface CallWaiterButtonProps {
  tableId?: string;
  tables?: Table[];
  onTableSelect?: (tableId: string) => void;
  className?: string;
}

export default function CallWaiterButton({
  tableId,
  tables = [],
  onTableSelect,
  className = '',
}: CallWaiterButtonProps) {
  const [callMessage, setCallMessage] = useState<string | null>(null);
  const [callFailed, setCallFailed] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const effectiveTableId = tableId ?? selectedTableId;

  const handleCall = async () => {
    if (isSending) return;
    if (!effectiveTableId) {
      setShowTablePicker(true);
      return;
    }
    setIsSending(true);
    setCallMessage(null);
    try {
      await ensureDinerSession();
      const { error } = await supabaseDiner().rpc('call_waiter', { p_table: effectiveTableId });
      if (error) {
        console.error('call_waiter failed:', error.message);
        setCallFailed(true);
        setCallMessage('We could not send your request. Please try again.');
        return;
      }
      setCallFailed(false);
      setCallMessage('Waiter notified.');
      setTimeout(() => {
        setCallMessage(null);
      }, 4000);
    } catch (err) {
      console.error('call_waiter failed:', err);
      setCallFailed(true);
      setCallMessage('We could not send your request. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const isCalled = !!callMessage && !callFailed;

  return (
    <div className={`fixed bottom-6 right-6 z-40 ${className}`}>
      {showTablePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="waiter-table-picker-title"
            className="w-full max-w-sm rounded-2xl border border-stone-700 bg-[#2B1810] p-5 text-stone-100 shadow-2xl"
          >
            <h2 id="waiter-table-picker-title" className="mb-1 font-serif text-lg font-bold">
              Choose your table
            </h2>
            <p className="mb-4 text-xs text-stone-400">
              Select the table you are sitting at before calling the waiter.
            </p>
            {tables.length ? (
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {tables.map((table) => (
                  <button
                    key={table.id}
                    type="button"
                    onClick={() => {
                      setSelectedTableId(table.id);
                      onTableSelect?.(table.id);
                      setShowTablePicker(false);
                    }}
                    className="w-full rounded-xl border border-stone-700 bg-[#3A241A] px-4 py-3 text-left text-sm font-semibold hover:border-amber-500 hover:bg-[#49301F]"
                  >
                    Table {table.label}
                  </button>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-rose-700/60 bg-rose-950/50 p-3 text-sm text-rose-200">
                No tables are available right now. Please try again shortly.
              </p>
            )}
            <button
              type="button"
              onClick={() => setShowTablePicker(false)}
              className="mt-4 w-full rounded-xl border border-stone-700 px-4 py-2 text-sm text-stone-300 hover:bg-stone-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={handleCall}
        aria-live="polite"
        className={`flex items-center gap-2.5 px-4 sm:px-5 py-3 rounded-full shadow-2xl font-sans text-xs sm:text-sm font-bold tracking-wide transition-all duration-300 cursor-pointer active:scale-95 border ${
          isCalled
            ? 'bg-emerald-600 text-white border-emerald-500 animate-pulse'
            : callFailed
              ? 'bg-rose-600 text-white border-rose-500'
            : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 border-amber-400/50 hover:shadow-amber-500/20'
        }`}
      >
        {isSending ? (
          <>
            <Bell size={18} className="animate-pulse" />
            <span>Sending request…</span>
          </>
        ) : isCalled ? (
          <>
            <CheckCircle2 size={18} />
            <span>{callMessage}</span>
          </>
        ) : callFailed ? (
          <>
            <Bell size={18} />
            <span>{callMessage}</span>
          </>
        ) : (
          <>
            <Bell size={18} className="animate-swing" />
            <span>Call Waiter</span>
          </>
        )}
      </button>
    </div>
  );
}
