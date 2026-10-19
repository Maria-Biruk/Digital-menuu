'use client';

import React from 'react';
import { Globe } from 'lucide-react';
import { Lang } from '../lib/types';

interface LanguageSwitcherProps {
  currentLang: Lang;
  onChange: (lang: Lang) => void;
  className?: string;
}

const LANG_CYCLE: Record<Lang, Lang> = {
  en: 'am',
  am: 'om',
  om: 'en',
};

const LANG_LABELS: Record<Lang, string> = {
  en: 'English (EN)',
  am: 'አማርኛ (AM)',
  om: 'Afaan Oromoo (OM)',
};

export default function LanguageSwitcher({
  currentLang,
  onChange,
  className = '',
}: LanguageSwitcherProps) {
  const handleCycle = () => {
    const next = LANG_CYCLE[currentLang] || 'en';
    // TODO: Wire to Supabase profile preferences or user session
    onChange(next);
  };

  return (
    <button
      type="button"
      onClick={handleCycle}
      aria-label="Toggle language"
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-neutral-200 dark:border-stone-800 bg-white/90 dark:bg-[#1C1109]/90 text-[#2B1810] dark:text-amber-300 text-xs font-bold tracking-wider shadow-sm hover:bg-neutral-50 dark:hover:bg-[#2B1810] transition-all cursor-pointer backdrop-blur-md active:scale-95 ${className}`}
    >
      <Globe size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
      <span>{currentLang.toUpperCase()}</span>
      <span className="text-[10px] text-neutral-400 font-normal hidden sm:inline">
        · {LANG_LABELS[currentLang].split(' ')[0]}
      </span>
    </button>
  );
}
