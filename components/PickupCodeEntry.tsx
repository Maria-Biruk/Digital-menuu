'use client';

import React, { useRef, useState, useEffect } from 'react';
import { KeyRound, Check, X } from 'lucide-react';

interface PickupCodeEntryProps {
  expectedCode?: string;
  orderId?: string;
  tableLabel?: string;
  onSubmit: (enteredCode: string) => void;
  onCancel: () => void;
  className?: string;
}

export default function PickupCodeEntry({
  expectedCode,
  orderId,
  tableLabel,
  onSubmit,
  onCancel,
  className = '',
}: PickupCodeEntryProps) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [hasError, setHasError] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Auto focus first input on open
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, val: string) => {
    const char = val.slice(-1).replace(/[^0-9]/g, '');
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);
    setHasError(false);

    // If character entered, auto-focus next box
    if (char && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const fullCode = digits.join('');
  const isComplete = fullCode.length === 4;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isComplete) return;

    if (expectedCode && fullCode !== expectedCode) {
      setHasError(true);
      return;
    }

    onSubmit(fullCode);
  };

  return (
    <div className={`p-6 rounded-3xl bg-[#1C1109] border border-stone-800 text-stone-100 shadow-2xl max-w-sm w-full mx-auto ${className}`}>
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#2B1810] text-amber-400 flex items-center justify-center">
            <KeyRound size={16} />
          </div>
          <h4 className="font-serif text-base font-bold text-white">
            Verify Pickup Code
          </h4>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded-full text-stone-400 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>

      <p className="text-xs text-stone-400 mb-4 leading-relaxed">
        {tableLabel ? `${tableLabel} · ` : ''}Ask the guest for the 4-digit code shown on their order screen to confirm handoff.
      </p>

      {expectedCode && (
        <div className="p-2.5 rounded-xl bg-stone-900/60 border border-stone-800 text-[11px] text-stone-400 mb-4 text-center">
          Demo verification code: <strong className="text-amber-400 tracking-wider">{expectedCode}</strong>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 4 digit boxes */}
        <div className="flex justify-center gap-3">
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className={`w-14 h-16 text-center text-2xl font-mono font-bold rounded-2xl border bg-[#120B07] text-white focus:outline-none transition-all ${
                hasError
                  ? 'border-rose-500 text-rose-400 animate-shake'
                  : digit
                  ? 'border-amber-500/80 ring-2 ring-amber-500/20'
                  : 'border-stone-800 focus:border-[#2B1810]'
              }`}
            />
          ))}
        </div>

        {hasError && (
          <p className="text-xs text-rose-400 font-semibold text-center">
            Incorrect code. Please verify with guest or cashier.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="py-3 px-4 rounded-xl border border-stone-800 text-xs font-bold text-stone-400 hover:text-white"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={!isComplete}
            className={`py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md ${
              isComplete
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-95'
                : 'bg-stone-800 text-stone-500 cursor-not-allowed'
            }`}
          >
            <Check size={16} /> Confirm Hand-off
          </button>
        </div>
      </form>
    </div>
  );
}
