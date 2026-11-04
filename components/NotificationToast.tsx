'use client';

import React from 'react';
import { BellRing, X } from 'lucide-react';
import type { StationToast } from '../lib/notify';

interface NotificationToastProps {
  toast: StationToast | null;
  onDismiss: () => void;
}

/** Fixed top-right alert raised by useNewArrivalNotifier on the staff consoles. */
export default function NotificationToast({ toast, onDismiss }: NotificationToastProps) {
  if (!toast) return null;
  return (
    <div className="fixed top-20 right-4 z-[60] max-w-sm w-[calc(100vw-2rem)] animate-fadeIn">
      <div className="p-4 rounded-2xl bg-[#2B1810] border border-amber-500/50 shadow-2xl flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
          <BellRing className="w-4 h-4 animate-bounce" />
        </div>
        <p className="text-xs font-semibold text-amber-50 leading-relaxed flex-1 pt-1">
          {toast.message}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
