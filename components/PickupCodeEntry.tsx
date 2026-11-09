'use client';

import React, { useRef, useState, useEffect } from 'react';
import { KeyRound, Check, X, Loader2, ShieldCheck, ShieldAlert } from 'lucide-react';
import { verifyPickupCode } from '../lib/db';
import { useT } from '../lib/i18n/staff';

interface PickupCodeEntryProps {
  /** Legacy local fallback only used when the check RPC is not deployed yet. */
  expectedCode?: string;
  orderId?: string;
  tableLabel?: string;
  onSubmit: (enteredCode: string) => void;
  onCancel: () => void;
  className?: string;
}

type VerifyState = 'idle' | 'checking' | 'correct' | 'incorrect' | 'unknown';

export default function PickupCodeEntry({
  expectedCode,
  orderId,
  tableLabel,
  onSubmit,
  onCancel,
  className = '',
}: PickupCodeEntryProps) {
  const t = useT();
  const [digits, setDigits] = useState(['', '', '', '']);
  const [status, setStatus] = useState<VerifyState>('idle');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Auto focus first input on open
    inputRefs.current[0]?.focus();
  }, []);

  const fullCode = digits.join('');
  const isComplete = fullCode.length === 4;

  // Verify the moment all 4 digits are entered — ask the DATABASE so the real
  // code is never exposed to the waiter console (order_secrets is diner-only).
  useEffect(() => {
    if (!isComplete) return;
    let active = true;
    setStatus('checking');
    (async () => {
      const res = await verifyPickupCode(orderId ?? '', fullCode);
      if (!active) return;
      if (res === true) setStatus('correct');
      else if (res === false) setStatus('incorrect');
      else if (expectedCode) setStatus(fullCode === expectedCode ? 'correct' : 'incorrect');
      else setStatus('unknown'); // RPC not deployed — let the serve call decide
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullCode]);

  const handleChange = (index: number, val: string) => {
    const char = val.slice(-1).replace(/[^0-9]/g, '');
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);
    if (newDigits.join('').length !== 4) setStatus('idle');

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

  const canConfirm = status === 'correct' || status === 'unknown';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isComplete || status === 'checking' || status === 'incorrect') return;
    onSubmit(fullCode);
  };

  const borderFor = (filled: string) => {
    if (status === 'incorrect') return 'border-rose-500 text-rose-400';
    if (status === 'correct') return 'border-emerald-500 text-emerald-300';
    if (filled) return 'border-amber-500/80 ring-2 ring-amber-500/20 text-white';
    return 'border-stone-800 focus:border-[#2B1810] text-white';
  };

  return (
    <div className={`p-6 rounded-3xl bg-[#3A241A] border border-stone-800 text-stone-100 shadow-2xl max-w-sm w-full mx-auto ${className}`}>
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#2B1810] text-amber-400 flex items-center justify-center">
            <KeyRound size={16} />
          </div>
          <h4 className="font-serif text-base font-bold text-white">
            {t('Verify Pickup Code')}
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
        {tableLabel ? `${tableLabel} · ` : ''}
        {t('Ask the guest for the 4-digit code shown on their order screen to confirm handoff.')}
      </p>

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
              className={`w-14 h-16 text-center text-2xl font-mono font-bold rounded-2xl border bg-[#38210F] focus:outline-none transition-all ${borderFor(digit)} ${
                status === 'incorrect' ? 'animate-shake' : ''
              }`}
            />
          ))}
        </div>

        {/* Live correct / incorrect feedback */}
        {status === 'checking' && (
          <p className="text-xs text-stone-400 font-semibold text-center flex items-center justify-center gap-1.5">
            <Loader2 size={14} className="animate-spin" /> {t('Checking code…')}
          </p>
        )}
        {status === 'incorrect' && (
          <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-700/60 text-rose-200 text-xs font-semibold flex items-start gap-2">
            <ShieldAlert size={16} className="shrink-0 mt-0.5 text-rose-400" />
            <span>{t('Incorrect code. Please verify with guest or cashier.')}</span>
          </div>
        )}
        {status === 'correct' && (
          <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-700/60 text-emerald-200 text-xs font-semibold flex items-start gap-2">
            <ShieldCheck size={16} className="shrink-0 mt-0.5 text-emerald-400" />
            <span>{t('Correct code — this order can be served.')}</span>
          </div>
        )}
        {status === 'unknown' && (
          <p className="text-[11px] text-stone-500 text-center">
            {t('Confirm the hand-off — the code is verified against the kitchen record.')}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="py-3 px-4 rounded-xl border border-stone-800 text-xs font-bold text-stone-400 hover:text-white"
          >
            {t('Cancel')}
          </button>

          <button
            type="submit"
            disabled={!isComplete || !canConfirm}
            className={`py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md ${
              canConfirm && isComplete
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-95'
                : 'bg-stone-800 text-stone-500 cursor-not-allowed'
            }`}
          >
            <Check size={16} /> {t('Confirm Hand-off')}
          </button>
        </div>
      </form>
    </div>
  );
}
