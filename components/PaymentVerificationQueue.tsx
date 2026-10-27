'use client';

import React, { useState } from 'react';
import { Check, X, Eye, AlertTriangle, FileImage, ExternalLink } from 'lucide-react';
import { Payment } from '../lib/types';

interface PaymentVerificationQueueProps {
  payments: Payment[];
  onApprove: (paymentId: string, txId: string) => void;
  onReject: (paymentId: string) => void;
  existingTxIds?: string[];
  className?: string;
}

export default function PaymentVerificationQueue({
  payments,
  onApprove,
  onReject,
  existingTxIds = ['CBE-TX-998124'],
  className = '',
}: PaymentVerificationQueueProps) {
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
  const [txInputs, setTxInputs] = useState<Record<string, string>>({});

  const handleTxChange = (paymentId: string, val: string) => {
    setTxInputs((prev) => ({ ...prev, [paymentId]: val }));
  };

  const getTxValue = (p: Payment) => {
    return txInputs[p.id] !== undefined ? txInputs[p.id] : p.transaction_id || '';
  };

  const isDuplicate = (p: Payment, val: string) => {
    if (!val.trim()) return false;
    // Check if this txid matches existing completed txids excluding this item's original
    return existingTxIds.some((id) => id.toLowerCase() === val.trim().toLowerCase());
  };

  if (payments.length === 0) {
    return (
      <div className={`text-center py-16 p-6 rounded-3xl bg-[#3A241A]/40 border border-stone-800 text-stone-400 ${className}`}>
        <p className="font-serif text-base font-bold text-stone-200">
          No Pending Payment Verifications
        </p>
        <p className="text-xs text-stone-500 mt-1">
          Incoming mobile transfers and customer receipts will appear here in real time.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Verification Rows */}
      <div className="space-y-3">
        {payments.map((payment) => {
          const currentTx = getTxValue(payment);
          const hasDuplicateWarning = isDuplicate(payment, currentTx);
          const txMissing = !currentTx.trim();

          return (
            <div
              key={payment.id}
              className="p-5 rounded-3xl bg-[#3A241A] border border-stone-800 shadow-xl space-y-3 transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Order & Account Info */}
                <div className="flex items-center gap-3">
                  {/* Thumbnail */}
                  <div
                    onClick={() =>
                      setModalImageUrl(
                        payment.proof_image ||
                          'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=900'
                      )
                    }
                    className="relative w-14 h-14 rounded-2xl overflow-hidden bg-stone-900 border border-stone-700 cursor-pointer group shrink-0"
                    title="Click to view full receipt"
                  >
                    {payment.proof_image ? (
                      <img
                        src={payment.proof_image}
                        alt="Receipt proof"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-500">
                        <FileImage size={20} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                      <Eye size={16} />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-white">
                        Order #{payment.order_id.replace('ord-', '')}
                      </span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {payment.account_label.split(' ')[0]}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Account: {payment.account_label}
                    </p>
                    <p className="text-sm font-bold text-emerald-400 mt-0.5">
                      {payment.amount.toLocaleString()} ETB
                    </p>
                  </div>
                </div>

                {/* Transaction ID input & Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Enter Bank TX ID..."
                      value={currentTx}
                      onChange={(e) => handleTxChange(payment.id, e.target.value)}
                      className={`w-full sm:w-56 px-3.5 py-2 rounded-xl border text-xs font-mono bg-[#38210F] text-white focus:outline-none ${
                        hasDuplicateWarning
                          ? 'border-rose-500 focus:border-rose-500'
                          : txMissing
                            ? 'border-amber-600/60 focus:border-amber-500'
                            : 'border-stone-800 focus:border-[#2B1810]'
                      }`}
                    />
                    {txMissing && !hasDuplicateWarning && (
                      <p className="text-[10px] text-amber-400/90 font-medium mt-1">Bank TX ID is required to approve.</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onReject(payment.id)}
                      className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl border border-stone-800 hover:bg-rose-950/40 text-rose-400 hover:border-rose-900/50 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <X size={14} /> Reject
                    </button>

                    <button
                      type="button"
                      disabled={txMissing || hasDuplicateWarning}
                      onClick={() => onApprove(payment.id, currentTx)}
                      title={txMissing ? 'Enter the bank transaction ID first' : 'Approve and issue pickup code'}
                      className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow ${
                        txMissing || hasDuplicateWarning
                          ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 cursor-pointer'
                      }`}
                    >
                      <Check size={14} /> Approve & Issue Code
                    </button>
                  </div>
                </div>
              </div>

              {/* Duplicate Transaction Warning Banner */}
              {hasDuplicateWarning && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-600/60 text-xs text-rose-200 flex items-center gap-2 animate-shake">
                  <AlertTriangle size={16} className="text-rose-400 shrink-0" />
                  <span>
                    <strong>Duplicate Warning:</strong> This transaction ID has already been used for another order! Please double-check the customer screenshot.
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal for viewing receipt screenshot */}
      {modalImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative max-w-lg w-full bg-[#3A241A] rounded-3xl p-5 border border-stone-700 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-800">
              <h4 className="font-serif text-sm font-bold text-white">
                Payment Transfer Screenshot
              </h4>
              <button
                type="button"
                onClick={() => setModalImageUrl(null)}
                className="p-1 rounded-full text-stone-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-black max-h-[70vh] flex items-center justify-center">
              <img
                src={modalImageUrl}
                alt="Proof enlarged"
                className="max-h-[68vh] object-contain w-auto"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
