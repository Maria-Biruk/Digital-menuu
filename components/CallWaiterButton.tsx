'use client';

import React, { useState } from 'react';
import { Bell, CheckCircle2 } from 'lucide-react';

interface CallWaiterButtonProps {
  tableLabel?: string;
  className?: string;
}

export default function CallWaiterButton({
  tableLabel = 'Table',
  className = '',
}: CallWaiterButtonProps) {
  const [isCalled, setIsCalled] = useState(false);

  const handleCall = () => {
    if (isCalled) return;
    setIsCalled(true);
    // TODO: Insert row into Supabase waiter_calls table { table_id, status: 'pending', created_at }
    setTimeout(() => {
      setIsCalled(false);
    }, 4000);
  };

  return (
    <div className={`fixed bottom-6 right-6 z-40 ${className}`}>
      <button
        type="button"
        onClick={handleCall}
        className={`flex items-center gap-2.5 px-4 sm:px-5 py-3 rounded-full shadow-2xl font-sans text-xs sm:text-sm font-bold tracking-wide transition-all duration-300 cursor-pointer active:scale-95 border ${
          isCalled
            ? 'bg-emerald-600 text-white border-emerald-500 animate-pulse'
            : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 border-amber-400/50 hover:shadow-amber-500/20'
        }`}
      >
        {isCalled ? (
          <>
            <CheckCircle2 size={18} className="animate-bounce" />
            <span>Waiter is coming!</span>
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
