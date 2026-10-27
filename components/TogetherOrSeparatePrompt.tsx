'use client';

import React from 'react';
import { UtensilsCrossed, Zap } from 'lucide-react';
import { ServiceMode } from '../lib/types';

interface TogetherOrSeparatePromptProps {
  hasFood: boolean;
  hasDrink: boolean;
  value: ServiceMode;
  onChange: (mode: ServiceMode) => void;
  className?: string;
}

export default function TogetherOrSeparatePrompt({
  hasFood,
  hasDrink,
  value,
  onChange,
  className = '',
}: TogetherOrSeparatePromptProps) {
  // Only render if both kitchen food and bar drinks are present in order
  if (!hasFood || !hasDrink) {
    return null;
  }

  return (
    <div className={`p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-neutral-900 dark:text-amber-100 space-y-2.5 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
          Dining Preference
        </span>
        <span className="text-[10px] text-neutral-500 dark:text-amber-200/70 font-medium">
          (Food & Drinks in Order)
        </span>
      </div>

      <p className="text-xs text-neutral-600 dark:text-amber-200/80 leading-snug">
        How would you like your dishes and beverages delivered to your table?
      </p>

      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <button
          type="button"
          onClick={() => onChange('together')}
          className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer border text-left ${
            value === 'together'
              ? 'bg-[#2B1810] text-white border-[#2B1810] shadow-md'
              : 'bg-white/80 dark:bg-[#3A241A] text-neutral-800 dark:text-stone-300 border-amber-500/20 hover:border-amber-500/40'
          }`}
        >
          <UtensilsCrossed size={16} className={value === 'together' ? 'text-amber-400' : 'text-neutral-500'} />
          <span>Serve together</span>
        </button>

        <button
          type="button"
          onClick={() => onChange('separate')}
          className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer border text-left ${
            value === 'separate'
              ? 'bg-[#2B1810] text-white border-[#2B1810] shadow-md'
              : 'bg-white/80 dark:bg-[#3A241A] text-neutral-800 dark:text-stone-300 border-amber-500/20 hover:border-amber-500/40'
          }`}
        >
          <Zap size={16} className={value === 'separate' ? 'text-amber-400' : 'text-neutral-500'} />
          <span>Bring as ready</span>
        </button>
      </div>
    </div>
  );
}
