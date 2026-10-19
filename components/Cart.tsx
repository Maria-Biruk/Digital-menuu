'use client';

import React from 'react';
import { Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { MenuItem, Lang } from '../lib/types';
import { tI18n } from '../lib/mock';

export interface CartLine {
  itemId: string;
  qty: number;
  instructions?: string;
}

interface CartProps {
  lines: CartLine[];
  menuItems: MenuItem[];
  lang?: Lang;
  onUpdateQty: (itemId: string, newQty: number) => void;
  onRemoveItem: (itemId: string) => void;
  className?: string;
}

export default function Cart({
  lines,
  menuItems,
  lang = 'en',
  onUpdateQty,
  onRemoveItem,
  className = '',
}: CartProps) {
  const lineDetails = lines
    .map((line) => {
      const item = menuItems.find((m) => m.id === line.itemId);
      return item ? { ...line, item } : null;
    })
    .filter(Boolean) as { itemId: string; qty: number; instructions?: string; item: MenuItem }[];

  const subtotal = lineDetails.reduce(
    (sum, cur) => sum + cur.item.price * cur.qty,
    0
  );
  const vat = Math.round(subtotal * 0.15);
  const serviceCharge = lines.length > 0 ? 25 : 0;
  const total = subtotal + vat + serviceCharge;

  if (lineDetails.length === 0) {
    return (
      <div className={`text-center py-12 px-4 flex flex-col items-center justify-center ${className}`}>
        <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-[#1C1109] text-neutral-400 flex items-center justify-center mb-3">
          <ShoppingBag size={28} className="text-stone-400" />
        </div>
        <p className="font-serif text-base font-bold text-neutral-800 dark:text-stone-200">
          Your order is empty
        </p>
        <p className="text-xs text-neutral-500 dark:text-stone-400 mt-1">
          Explore the menu and add dishes to start.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-5 ${className}`}>
      {/* Items List */}
      <div className="space-y-3 divide-y divide-neutral-100 dark:divide-stone-800">
        {lineDetails.map(({ item, qty, instructions }) => (
          <div key={item.id} className="pt-3 first:pt-0 flex items-center gap-3">
            <img
              src={item.image_path}
              alt={tI18n(item.name_i18n, lang)}
              className="w-14 h-14 rounded-xl object-cover shrink-0 border border-neutral-200/50 dark:border-stone-800"
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-serif text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate">
                  {tI18n(item.name_i18n, lang)}
                </h4>
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.id)}
                  aria-label="Remove item"
                  className="text-neutral-400 hover:text-rose-500 transition-colors p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {instructions && (
                <p className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md mt-0.5 inline-block font-medium">
                  Note: {instructions}
                </p>
              )}

              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs font-bold text-[#2B1810] dark:text-amber-400">
                  {(item.price * qty).toLocaleString()} ETB
                </span>

                <div className="flex items-center bg-neutral-100 dark:bg-[#1C1109] rounded-full border border-neutral-200 dark:border-stone-800 p-0.5">
                  <button
                    type="button"
                    onClick={() => onUpdateQty(item.id, qty - 1)}
                    className="w-6 h-6 rounded-full bg-white dark:bg-[#2B1810] text-neutral-700 dark:text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                  >
                    <Minus size={11} />
                  </button>
                  <span className="px-2.5 text-xs font-bold text-neutral-900 dark:text-white">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateQty(item.id, qty + 1)}
                    className="w-6 h-6 rounded-full bg-[#2B1810] text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                  >
                    <Plus size={11} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bill Breakdown */}
      <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#1C1109]/50 border border-neutral-200/80 dark:border-stone-800 space-y-2 text-xs">
        <div className="flex justify-between text-neutral-600 dark:text-stone-400 font-medium">
          <span>Subtotal</span>
          <span>{subtotal.toLocaleString()} ETB</span>
        </div>
        <div className="flex justify-between text-neutral-600 dark:text-stone-400 font-medium">
          <span>VAT (15%)</span>
          <span>{vat.toLocaleString()} ETB</span>
        </div>
        <div className="flex justify-between text-neutral-600 dark:text-stone-400 font-medium pb-1.5 border-b border-neutral-200 dark:border-stone-800">
          <span>Service Charge</span>
          <span>{serviceCharge} ETB</span>
        </div>
        <div className="flex justify-between text-sm sm:text-base font-bold text-neutral-900 dark:text-white pt-1">
          <span>Total</span>
          <span className="text-[#2B1810] dark:text-amber-400">{total.toLocaleString()} ETB</span>
        </div>
      </div>
    </div>
  );
}
