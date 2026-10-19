'use client';

import React from 'react';
import { Utensils, ShoppingBag } from 'lucide-react';
import { FulfillmentType } from '../lib/types';

interface FulfillmentToggleProps {
  value: FulfillmentType;
  onChange: (val: FulfillmentType) => void;
  className?: string;
}

export default function FulfillmentToggle({
  value,
  onChange,
  className = '',
}: FulfillmentToggleProps) {
  return (
    <div className={`grid grid-cols-2 gap-3.5 p-1.5 bg-neutral-100 dark:bg-[#1C1109] rounded-2xl border border-neutral-200/80 dark:border-stone-800 ${className}`}>
      <button
        type="button"
        onClick={() => onChange('dine-in')}
        className={`flex items-center justify-center gap-2.5 py-4 px-4 rounded-xl font-serif text-sm md:text-base font-bold transition-all duration-200 cursor-pointer ${
          value === 'dine-in'
            ? 'bg-[#2B1810] text-white shadow-lg scale-[1.01]'
            : 'text-neutral-700 dark:text-stone-300 hover:bg-white/60 dark:hover:bg-[#150D09]'
        }`}
      >
        <Utensils size={18} className={value === 'dine-in' ? 'text-amber-400' : 'text-neutral-500'} />
        <span>Dine-in</span>
      </button>

      <button
        type="button"
        onClick={() => onChange('takeaway')}
        className={`flex items-center justify-center gap-2.5 py-4 px-4 rounded-xl font-serif text-sm md:text-base font-bold transition-all duration-200 cursor-pointer ${
          value === 'takeaway'
            ? 'bg-[#2B1810] text-white shadow-lg scale-[1.01]'
            : 'text-neutral-700 dark:text-stone-300 hover:bg-white/60 dark:hover:bg-[#150D09]'
        }`}
      >
        <ShoppingBag size={18} className={value === 'takeaway' ? 'text-amber-400' : 'text-neutral-500'} />
        <span>Takeaway</span>
      </button>
    </div>
  );
}
