'use client';

import React, { useState } from 'react';
import { Search, Plus, Minus, Trash2, Banknote, Smartphone, Check, ShoppingBag, Utensils } from 'lucide-react';
import { MenuItem, FulfillmentType, ServiceMode, PaymentAccount } from '../lib/types';
import { MENU, TABLES, PAYMENT_ACCOUNTS } from '../lib/mock';
import TogetherOrSeparatePrompt from './TogetherOrSeparatePrompt';
import ProofUpload from './ProofUpload';

interface WalkInOrderFormProps {
  onOrderCompleted: (orderSummary: any) => void;
  className?: string;
}

export default function WalkInOrderForm({
  onOrderCompleted,
  className = '',
}: WalkInOrderFormProps) {
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [fulfillment, setFulfillment] = useState<FulfillmentType>('dine-in');
  const [tableLabel, setTableLabel] = useState('1');
  const [phone, setPhone] = useState('');
  const [serviceMode, setServiceMode] = useState<ServiceMode>('together');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [selectedAccount, setSelectedAccount] = useState<PaymentAccount>(PAYMENT_ACCOUNTS[0]);
  const [txId, setTxId] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Filtered menu items
  const filtered = MENU.filter((m) =>
    m.name_i18n.en.toLowerCase().includes(search.toLowerCase()) ||
    m.name_i18n.am.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (id: string) => {
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) {
      const copy = { ...cart };
      delete copy[id];
      setCart(copy);
    } else {
      setCart((prev) => ({ ...prev, [id]: qty }));
    }
  };

  const cartEntries = Object.entries(cart)
    .map(([id, qty]) => {
      const item = MENU.find((m) => m.id === id);
      return item ? { item, qty } : null;
    })
    .filter(Boolean) as { item: MenuItem; qty: number }[];

  const subtotal = cartEntries.reduce((s, cur) => s + cur.item.price * cur.qty, 0);
  const vat = Math.round(subtotal * 0.15);
  const service = cartEntries.length > 0 ? 25 : 0;
  const total = subtotal + vat + service;

  const hasFood = cartEntries.some((e) => e.item.station === 'kitchen');
  const hasDrink = cartEntries.some((e) => e.item.station === 'bar');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cartEntries.length === 0) return;

    const fakeOrder = {
      id: `ord-${Math.floor(1000 + Math.random() * 9000)}`,
      fulfillment,
      table_label: fulfillment === 'dine-in' ? `Table ${tableLabel}` : 'Takeaway',
      phone: fulfillment === 'takeaway' ? phone : undefined,
      items: cartEntries.map((e) => ({
        name: e.item.name_i18n.en,
        quantity: e.qty,
        price: e.item.price,
      })),
      total,
      paymentMethod,
      serviceMode,
      txId: paymentMethod === 'transfer' ? txId : 'CASH-SETTLED',
      pickupCode: String(Math.floor(1000 + Math.random() * 9000)),
    };

    setIsSuccess(true);
    // TODO: Create order in Supabase orders table with status 'preparing' and payment_status 'verified'
    setTimeout(() => {
      onOrderCompleted(fakeOrder);
      setCart({});
      setTxId('');
      setIsSuccess(false);
    }, 1200);
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {isSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white font-bold text-center animate-bounce">
          Order placed & marked PAID successfully! Dispatching tickets to kitchen & bar...
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Menu Item Picker (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-base font-bold text-white">
              Select Dishes & Drinks
            </h3>
            <span className="text-xs text-stone-400">
              {MENU.length} items available
            </span>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-3 text-stone-400" />
            <input
              type="text"
              placeholder="Search dishes, burgers, tejs, coffee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-800 bg-[#120B07] text-white text-xs focus:outline-none focus:border-[#2B1810]"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
            {filtered.map((dish) => {
              const inCart = cart[dish.id] || 0;
              return (
                <div
                  key={dish.id}
                  onClick={() => addToCart(dish.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    inCart > 0
                      ? 'bg-[#2B1810]/40 border-amber-500/50 shadow-md'
                      : 'bg-[#1C1109] border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <img
                    src={dish.image_path}
                    alt={dish.name_i18n.en}
                    className="w-full aspect-[4/3] rounded-xl object-cover mb-2"
                  />
                  <div>
                    <h5 className="font-serif text-xs font-bold text-white truncate">
                      {dish.name_i18n.en}
                    </h5>
                    <p className="text-[10px] text-stone-400 uppercase">
                      {dish.station}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-800/60">
                    <span className="text-xs font-bold text-amber-400">
                      {dish.price} ETB
                    </span>
                    {inCart > 0 ? (
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-neutral-950 text-[10px] font-bold flex items-center justify-center">
                        {inCart}
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-stone-800 text-stone-300 flex items-center justify-center hover:bg-[#2B1810] hover:text-white">
                        <Plus size={12} />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Order Details & Payment (5 cols) */}
        <div className="lg:col-span-5 space-y-5 p-5 rounded-3xl bg-[#1C1109] border border-stone-800">
          <h3 className="font-serif text-base font-bold text-white pb-3 border-b border-stone-800">
            Order & Settlement
          </h3>

          {/* Fulfillment Toggle */}
          <div className="grid grid-cols-2 gap-2 bg-[#120B07] p-1 rounded-xl border border-stone-800">
            <button
              type="button"
              onClick={() => setFulfillment('dine-in')}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                fulfillment === 'dine-in'
                  ? 'bg-[#2B1810] text-white shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <Utensils size={14} /> Dine-in
            </button>
            <button
              type="button"
              onClick={() => setFulfillment('takeaway')}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                fulfillment === 'takeaway'
                  ? 'bg-[#2B1810] text-white shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <ShoppingBag size={14} /> Takeaway
            </button>
          </div>

          {/* Table or Phone Input */}
          {fulfillment === 'dine-in' ? (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                Assign Table Number
              </label>
              <select
                value={tableLabel}
                onChange={(e) => setTableLabel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-800 bg-[#120B07] text-white text-xs focus:outline-none focus:border-[#2B1810]"
              >
                {TABLES.map((t) => (
                  <option key={t.id} value={t.label}>
                    Table {t.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                Guest Phone Number (Takeaway)
              </label>
              <input
                type="tel"
                required
                placeholder="0911..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-800 bg-[#120B07] text-white text-xs focus:outline-none focus:border-[#2B1810]"
              >
              </input>
            </div>
          )}

          {/* Together/Separate Prompt if both present */}
          <TogetherOrSeparatePrompt
            hasFood={hasFood}
            hasDrink={hasDrink}
            value={serviceMode}
            onChange={setServiceMode}
          />

          {/* Current Basket summary */}
          <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
            {cartEntries.length === 0 ? (
              <p className="text-xs text-stone-500 italic">No dishes selected yet.</p>
            ) : (
              cartEntries.map(({ item, qty }) => (
                <div key={item.id} className="flex items-center justify-between text-xs text-stone-300">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-bold text-amber-400">{qty}x</span>
                    <span className="truncate">{item.name_i18n.en}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold">{item.price * qty} ETB</span>
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, qty - 1)}
                      className="text-stone-500 hover:text-white"
                    >
                      <Minus size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, qty + 1)}
                      className="text-stone-500 hover:text-white"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bill summary */}
          <div className="pt-3 border-t border-stone-800 space-y-1 text-xs">
            <div className="flex justify-between text-stone-400">
              <span>Subtotal</span>
              <span>{subtotal.toLocaleString()} ETB</span>
            </div>
            <div className="flex justify-between text-stone-400">
              <span>VAT 15% + Service</span>
              <span>{(vat + service).toLocaleString()} ETB</span>
            </div>
            <div className="flex justify-between font-bold text-sm text-white pt-1">
              <span>Grand Total</span>
              <span className="text-amber-400">{total.toLocaleString()} ETB</span>
            </div>
          </div>

          {/* Payment Method Radio */}
          <div className="space-y-2 pt-2 border-t border-stone-800">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                  paymentMethod === 'cash'
                    ? 'bg-[#2B1810] text-white border-[#2B1810]'
                    : 'bg-[#120B07] text-stone-400 border-stone-800'
                }`}
              >
                <Banknote size={15} /> Cash Collected
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('transfer')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                  paymentMethod === 'transfer'
                    ? 'bg-[#2B1810] text-white border-[#2B1810]'
                    : 'bg-[#120B07] text-stone-400 border-stone-800'
                }`}
              >
                <Smartphone size={15} /> Bank / Telebirr
              </button>
            </div>
          </div>

          {/* If Transfer: Screenshot + TXID */}
          {paymentMethod === 'transfer' && (
            <div className="space-y-3 pt-2">
              <select
                value={selectedAccount.id}
                onChange={(e) => {
                  const found = PAYMENT_ACCOUNTS.find((a) => a.id === e.target.value);
                  if (found) setSelectedAccount(found);
                }}
                className="w-full px-3 py-2 rounded-xl border border-stone-800 bg-[#120B07] text-white text-xs"
              >
                {PAYMENT_ACCOUNTS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label} ({a.account_number || a.phone_number})
                  </option>
                ))}
              </select>

              <input
                type="text"
                required
                placeholder="Transaction ID / Reference *"
                value={txId}
                onChange={(e) => setTxId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-800 bg-[#120B07] text-white text-xs focus:outline-none focus:border-[#2B1810]"
              />

              <ProofUpload onFileSelect={setProofFile} />
            </div>
          )}

          <button
            type="submit"
            disabled={cartEntries.length === 0}
            className={`w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg ${
              cartEntries.length === 0
                ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-95'
            }`}
          >
            Settle Order & Print KOT ({total.toLocaleString()} ETB)
          </button>
        </div>
      </div>
    </form>
  );
}
