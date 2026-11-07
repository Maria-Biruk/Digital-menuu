'use client';

import React from 'react';
import type { Table, Lang } from '../lib/types';
import { MapPin, X } from 'lucide-react';

interface ArrivalTablePromptProps {
  open: boolean;
  tables: Table[];
  lang: Lang;
  onPick: (tableId: string) => void;
  /** Takeaway / not dining at a table — let them proceed without one. */
  onSkip?: () => void;
}

const COPY: Record<string, { en: string; am: string; om: string }> = {
  title: {
    en: 'Which table are you at?',
    am: 'የት የጠረጴዛ ቁጥር ላይ ነዎት?',
    om: 'Teellii hoo akkamii irra jirtu?',
  },
  subtitle: {
    en: 'Enter your table number so the kitchen and waiter can bring your order to the right seat.',
    am: 'የጠረጴዛ ቁጥርዎን ያስገቡና መጠብቻውና መዝጊያው ትዕዛዝዎን ወደ ትክክለኛው ቦታ እንዲያደርሱልዎ።',
    om: 'Lakkoofsa teellii kee galchi — raafamaa fi tiksaan soorata kee bakka sirgaatti fidaniif.',
  },
  takeaway: {
    en: "I'm taking away",
    am: 'የመውሰድ ትዕዛዝ',
    om: 'Awwaadeera',
  },
  table: { en: 'Table', am: 'ጠረጴዛ', om: 'Teellii' },
};

function pick(key: keyof typeof COPY, lang: Lang): string {
  const e = COPY[key];
  return e[lang as 'am' | 'om'] || e.en;
}

export default function ArrivalTablePrompt({
  open,
  tables,
  lang,
  onPick,
  onSkip,
}: ArrivalTablePromptProps) {
  if (!open || tables.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-[#FAF5EC] dark:bg-[#3A241A] border border-amber-900/20 dark:border-[#2B1810] shadow-2xl p-6 space-y-5 animate-scale-up">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#2B1810] text-amber-400 flex items-center justify-center shrink-0">
            <MapPin className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h2 className="font-serif text-lg font-bold text-[#2B1810] dark:text-white">
              {pick('title', lang)}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
              {pick('subtitle', lang)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2.5 max-h-56 overflow-y-auto pr-1">
          {tables.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onPick(t.id)}
              className="py-3.5 px-2 rounded-2xl font-serif text-base font-bold bg-white dark:bg-[#2B1810] text-[#2B1810] dark:text-white border border-neutral-200 dark:border-stone-700 hover:border-[#2B1810] hover:scale-105 active:scale-95 transition-all cursor-pointer flex flex-col items-center justify-center"
            >
              <span className="text-[9px] uppercase font-sans font-semibold tracking-wider opacity-60">
                {pick('table', lang)}
              </span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-stone-500 dark:text-stone-400 hover:text-[#2B1810] dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            {pick('takeaway', lang)}
          </button>
        )}
      </div>
    </div>
  );
}
