'use client';

import React from 'react';
import { Table } from '../lib/types';
import { TABLES } from '../lib/mock';

interface TableSelectorProps {
  selectedTableId: string;
  onSelect: (tableId: string) => void;
  tables?: Table[];
  className?: string;
}

export default function TableSelector({
  selectedTableId,
  onSelect,
  tables = TABLES,
  className = '',
}: TableSelectorProps) {
  // TODO: Fetch live active tables and occupied status from Supabase tables table
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
        {tables.map((t) => {
          const isSelected = selectedTableId === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              className={`py-3.5 px-2 rounded-2xl font-serif text-sm sm:text-base font-bold transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-0.5 border ${
                isSelected
                  ? 'bg-[#2B1810] text-white border-[#2B1810] shadow-md scale-105'
                  : 'bg-white dark:bg-[#1C1109] text-neutral-800 dark:text-stone-200 border-neutral-200 dark:border-stone-800 hover:bg-neutral-50 dark:hover:bg-[#3D2415]/40 hover:border-[#2B1810]/40'
              }`}
            >
              <span className="text-[10px] uppercase font-sans font-semibold tracking-wider opacity-70">
                Table
              </span>
              <span className="text-base sm:text-lg">{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
