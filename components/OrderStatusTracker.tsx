'use client';

import React from 'react';
import { Check, Flame, BellCheck, CheckCircle2 } from 'lucide-react';
import { OrderStatus } from '../lib/types';

interface OrderStatusTrackerProps {
  currentStatus?: OrderStatus;
  currentStep?: OrderStatus;
  className?: string;
}

interface StepDef {
  key: OrderStatus;
  label: string;
  description: string;
  icon: React.ElementType;
}

const STEPS: StepDef[] = [
  {
    key: 'preparing',
    label: 'Preparing in Kitchen & Bar',
    description: 'Chefs and baristas crafting your items',
    icon: Flame,
  },
  {
    key: 'ready',
    label: 'Ready for Service',
    description: 'Plated and ready for pickup or table delivery',
    icon: BellCheck,
  },
  {
    key: 'served',
    label: 'Served & Enjoyed',
    description: 'Delivered to your table',
    icon: CheckCircle2,
  },
];

const STATUS_ORDER: Record<OrderStatus, number> = {
  pending: 0,
  preparing: 0,
  ready: 1,
  served: 2,
  cancelled: -1,
};

export default function OrderStatusTracker({
  currentStatus,
  currentStep,
  className = '',
}: OrderStatusTrackerProps) {
  const activeStatus = currentStatus || currentStep || 'pending';
  const currentIndex = STATUS_ORDER[activeStatus] ?? 0;

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200 dark:before:bg-stone-800">
        {STEPS.map((step, idx) => {
          const isDone = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          const Icon = step.icon;

          return (
            <div key={step.key} className="relative flex items-start gap-4">
              {/* Step indicator node */}
              <div
                className={`absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 z-10 ${
                  isDone
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                    : 'bg-white dark:bg-[#1C1109] border-neutral-300 dark:border-stone-700 text-neutral-400'
                } ${isCurrent ? 'ring-4 ring-emerald-500/20 scale-110' : ''}`}
              >
                {isDone ? (
                  <Check size={14} className="stroke-[3]" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-neutral-300 dark:bg-stone-700" />
                )}
              </div>

              {/* Step content */}
              <div className="pt-0.5">
                <div className="flex items-center gap-2">
                  <h4
                    className={`font-serif text-xs sm:text-sm font-bold ${
                      isDone
                        ? 'text-neutral-900 dark:text-white'
                        : 'text-neutral-400 dark:text-stone-500'
                    }`}
                  >
                    {step.label}
                  </h4>
                  {isCurrent && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                      In Progress
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-stone-400 mt-0.5">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
