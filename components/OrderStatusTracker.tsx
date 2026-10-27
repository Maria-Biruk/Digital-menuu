'use client';

import React from 'react';
import { Check, Clock, Flame, Coffee, ChefHat, BellCheck, CheckCircle2 } from 'lucide-react';
import { OrderStatus } from '../lib/types';

type OrderKind = 'food' | 'drink' | 'mixed';

interface OrderStatusTrackerProps {
  currentStatus?: OrderStatus;
  currentStep?: OrderStatus;
  orderKind?: OrderKind;
  className?: string;
}

interface StepDef {
  key: OrderStatus;
  label: string;
  description: string;
  icon: React.ElementType;
}

// The "preparing" and "ready" wording depends on whether the order is food,
// drinks, or both — a drink order must not say "Started Cooking".
function buildSteps(orderKind?: OrderKind): StepDef[] {
  const preparing: Record<string, Pick<StepDef, 'label' | 'description' | 'icon'>> = {
    food: { label: 'Started Cooking', description: 'Our chefs are preparing your food', icon: ChefHat },
    drink: { label: 'Brewing & Mixing', description: 'Our baristas are crafting your drinks', icon: Coffee },
    mixed: { label: 'Preparing Your Order', description: 'Chefs and baristas are preparing your items', icon: Flame },
    default: { label: 'Preparing Your Order', description: 'Our team is preparing your items', icon: Flame },
  };
  const readyDesc: Record<string, string> = {
    food: 'Plated and ready for pickup or table delivery',
    drink: 'Poured and ready for pickup or table delivery',
    mixed: 'Ready for pickup or table delivery',
    default: 'Ready for pickup or table delivery',
  };
  const kind = orderKind ?? 'default';
  const prep = preparing[kind] ?? preparing.default;

  return [
    {
      key: 'received',
      label: 'Order Received',
      description: 'Payment confirmed and sent to the kitchen queue',
      icon: Clock,
    },
    {
      key: 'preparing',
      label: prep.label,
      description: prep.description,
      icon: prep.icon,
    },
    {
      key: 'ready',
      label: 'Ready for Service',
      description: readyDesc[kind] ?? readyDesc.default,
      icon: BellCheck,
    },
    {
      key: 'served',
      label: 'Served & Enjoyed',
      description: 'Delivered to your table',
      icon: CheckCircle2,
    },
  ];
}

const STATUS_ORDER: Record<OrderStatus, number> = {
  received: 0,
  preparing: 1,
  ready: 2,
  served: 3,
  cancelled: -1,
};

export default function OrderStatusTracker({
  currentStatus,
  currentStep,
  orderKind,
  className = '',
}: OrderStatusTrackerProps) {
  const activeStatus = currentStatus || currentStep || 'received';
  const currentIndex = STATUS_ORDER[activeStatus] ?? 0;
  const STEPS = buildSteps(orderKind);

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
                    : 'bg-white dark:bg-[#3A241A] border-neutral-300 dark:border-stone-700 text-neutral-400'
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
