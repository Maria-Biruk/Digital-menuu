'use client';

import React, { useState } from 'react';
import { Building2, Smartphone, CheckCircle2, Copy, Check } from 'lucide-react';
import { PaymentAccount } from '../lib/types';
import { PAYMENT_ACCOUNTS } from '../lib/mock';

interface PaymentAccountPickerProps {
  selectedAccountId: string;
  onSelect: (account: PaymentAccount) => void;
  accounts?: PaymentAccount[];
  className?: string;
}

export default function PaymentAccountPicker({
  selectedAccountId,
  onSelect,
  accounts = PAYMENT_ACCOUNTS,
  className = '',
}: PaymentAccountPickerProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, acc: PaymentAccount) => {
    e.stopPropagation();
    const val = (acc.account_type === 'bank' ? acc.account_number : acc.phone_number) || '';
    if (!val) return;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(val);
    } else {
      const el = document.createElement('textarea');
      el.value = val;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }

    setCopiedId(acc.id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2200);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-stone-400">
          Select Payment Transfer Method
        </label>
        <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
          Tap number or copy button
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {accounts.map((acc) => {
          const isSelected = selectedAccountId === acc.id;
          const isBank = acc.account_type === 'bank';
          const accNumber = isBank ? acc.account_number : acc.phone_number;
          const isCopied = copiedId === acc.id;

          return (
            <div
              key={acc.id}
              onClick={() => onSelect(acc)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                isSelected
                  ? 'bg-[#2B1810]/5 dark:bg-[#2B1810]/30 border-[#2B1810] shadow-md ring-1 ring-[#2B1810]'
                  : 'bg-white dark:bg-[#1C1109] border-neutral-200 dark:border-stone-800 hover:border-neutral-300 dark:hover:border-stone-700'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    isSelected
                      ? 'bg-[#2B1810] text-white shadow-sm'
                      : 'bg-neutral-100 dark:bg-stone-800 text-neutral-600 dark:text-stone-300'
                  }`}
                >
                  {isBank ? <Building2 size={20} /> : <Smartphone size={20} />}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-serif text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate">
                    {acc.label}
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-stone-400 truncate">
                    A/C Name: {acc.account_name}
                  </p>

                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span
                      onClick={(e) => handleCopy(e, acc)}
                      className="text-xs font-mono font-bold text-[#2B1810] dark:text-amber-400 tracking-wider hover:underline cursor-pointer select-all"
                      title="Click to copy account number"
                    >
                      {accNumber}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => handleCopy(e, acc)}
                      title="Copy account number to clipboard"
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition-all border cursor-pointer active:scale-95 ${
                        isCopied
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 border-stone-200 dark:border-stone-700'
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <Check size={11} className="stroke-[3]" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={11} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    isSelected
                      ? 'border-[#2B1810] bg-[#2B1810] text-white'
                      : 'border-neutral-300 dark:border-stone-700'
                  }`}
                >
                  {isSelected && <CheckCircle2 size={14} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
