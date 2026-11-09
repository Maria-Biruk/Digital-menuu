'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, Banknote, Smartphone, Check, ShoppingBag, Utensils, Loader2, AlertCircle } from 'lucide-react';
import { MenuItem, FulfillmentType, ServiceMode, PaymentAccount, Table } from '../lib/types';
import { fetchCatalog, fetchTables, fetchPaymentAccounts, createWalkInOrder } from '../lib/db';
import TogetherOrSeparatePrompt from './TogetherOrSeparatePrompt';
import { loc, useStaffLang } from '../lib/i18n/staff';

interface WalkInOrderFormProps {
  onOrderCompleted: (orderSummary: any) => void;
  className?: string;
}

export default function WalkInOrderForm({
  onOrderCompleted,
  className = '',
}: WalkInOrderFormProps) {
  const { t, lang } = useStaffLang();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [fulfillment, setFulfillment] = useState<FulfillmentType>('dine-in');
  const [tableLabel, setTableLabel] = useState('1');
  const [phone, setPhone] = useState('');
  const [serviceMode, setServiceMode] = useState<ServiceMode>('together');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<PaymentAccount | null>(null);
  const [txId, setTxId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [settled, setSettled] = useState<{
    orderId: string;
    code: string | null;
    ref: string | null;
    total: number;
    table: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [catalog, tbls, accs] = await Promise.all([
          fetchCatalog(),
          fetchTables(),
          fetchPaymentAccounts(),
        ]);
        if (!active) return;
        setMenu(catalog.menu);
        setTables(tbls);
        setAccounts(accs);
        if (accs[0]) setSelectedAccount(accs[0]);
        if (tbls[0]) setTableLabel(tbls[0].label);
      } catch (err) {
        console.error('Failed to load walk-in catalog data', err);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Filtered menu items
  const filtered = menu.filter((m) =>
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
      const item = menu.find((m) => m.id === id);
      return item ? { item, qty } : null;
    })
    .filter(Boolean) as { item: MenuItem; qty: number }[];

  const subtotal = cartEntries.reduce((s, cur) => s + cur.item.price * cur.qty, 0);
  const service = cartEntries.length > 0 ? 25 : 0;
  const total = subtotal + service;

  const hasFood = cartEntries.some((e) => e.item.station === 'kitchen');
  const hasDrink = cartEntries.some((e) => e.item.station === 'bar');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartEntries.length === 0 || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const table =
        fulfillment === 'dine-in'
          ? tables.find((tb) => tb.label === tableLabel) ?? null
          : null;
      const res = await createWalkInOrder({
        items: cartEntries.map((ce) => ({ menu_item_id: ce.item.id, quantity: ce.qty })),
        fulfillment: fulfillment === 'dine-in' ? 'dine_in' : 'takeaway',
        tableId: table?.id ?? null,
        phone: fulfillment === 'takeaway' ? phone.trim() || null : null,
        method: paymentMethod,
        transactionId: paymentMethod === 'transfer' ? txId.trim() || null : null,
        accountId: paymentMethod === 'transfer' ? selectedAccount?.id ?? null : null,
        serviceMode:
          hasFood && hasDrink
            ? serviceMode === 'separate'
              ? 'separate'
              : 'together'
            : 'not_applicable',
        notes: null,
      });
      const tableDesc =
        fulfillment === 'dine-in' ? `${t('Table')} ${tableLabel}` : t('Takeaway');
      setSettled({
        orderId: res.orderId,
        code: res.pickupCode,
        ref: res.transactionId,
        total: res.total,
        table: tableDesc,
      });
      setCart({});
      setTxId('');
      setPhone('');
      onOrderCompleted({
        ...res,
        table_label: tableDesc,
        amount: res.total,
        account_label: paymentMethod === 'cash' ? t('Cash') : selectedAccount?.label ?? t('Transfer'),
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {settled && (
        <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-600/50 text-emerald-100 space-y-2 animate-scale-up">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Check className="w-4 h-4 text-emerald-400" /> {t('Order settled & routed to kitchen & bar!')}
          </div>
          <p className="text-xs text-emerald-200/90">
            {settled.table} · {settled.total.toLocaleString()} ETB
            {settled.ref ? ` · ${settled.ref}` : ''}
          </p>
          {settled.code && (
            <p className="text-sm font-bold">
              {t('Pickup code for the guest')}: <span className="font-mono text-amber-300 text-lg">{settled.code}</span>
            </p>
          )}
          <button
            type="button"
            onClick={() => setSettled(null)}
            className="text-[11px] font-bold underline text-emerald-300 hover:text-white cursor-pointer"
          >
            {t('Start a new walk-in order')}
          </button>
        </div>
      )}
      {submitError && (
        <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-700/60 text-rose-200 text-xs font-semibold flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
          <span>{submitError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Menu Item Picker (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-base font-bold text-white">
              {t('Select Dishes & Drinks')}
            </h3>
            <span className="text-xs text-stone-400">
              {menu.length} {t('items available')}
            </span>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-3 text-stone-400" />
            <input
              type="text"
              placeholder={t('Search dishes, burgers, tejs, coffee...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-800 bg-[#38210F] text-white text-xs focus:outline-none focus:border-[#2B1810]"
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
                      : 'bg-[#3A241A] border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <img
                    src={dish.image_path}
                    alt={dish.name_i18n.en}
                    className="w-full aspect-[4/3] rounded-xl object-cover mb-2"
                  />
                  <div>
                    <h5 className="font-serif text-xs font-bold text-white truncate">
                      {loc(dish.name_i18n, lang)}
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
        <div className="lg:col-span-5 space-y-5 p-5 rounded-3xl bg-[#3A241A] border border-stone-800">
          <h3 className="font-serif text-base font-bold text-white pb-3 border-b border-stone-800">
            {t('Order & Settlement')}
          </h3>

          {/* Fulfillment Toggle */}
          <div className="grid grid-cols-2 gap-2 bg-[#38210F] p-1 rounded-xl border border-stone-800">
            <button
              type="button"
              onClick={() => setFulfillment('dine-in')}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                fulfillment === 'dine-in'
                  ? 'bg-[#2B1810] text-white shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <Utensils size={14} /> {t('Dine-in')}
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
              <ShoppingBag size={14} /> {t('Takeaway')}
            </button>
          </div>

          {/* Table or Phone Input */}
          {fulfillment === 'dine-in' ? (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                {t('Assign Table Number')}
              </label>
              <select
                value={tableLabel}
                onChange={(e) => setTableLabel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-800 bg-[#38210F] text-white text-xs focus:outline-none focus:border-[#2B1810]"
              >
                {tables.map((tb) => (
                  <option key={tb.id} value={tb.label}>
                    {t('Table')} {tb.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                {t('Guest Phone Number (Takeaway)')}
              </label>
              <input
                type="tel"
                required
                placeholder="0911..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-800 bg-[#38210F] text-white text-xs focus:outline-none focus:border-[#2B1810]"
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
              <p className="text-xs text-stone-500 italic">{t('No dishes selected yet.')}</p>
            ) : (
              cartEntries.map(({ item, qty }) => (
                <div key={item.id} className="flex items-center justify-between text-xs text-stone-300">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-bold text-amber-400">{qty}x</span>
                    <span className="truncate">{loc(item.name_i18n, lang)}</span>
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
              <span>{t('Subtotal')}</span>
              <span>{subtotal.toLocaleString()} ETB</span>
            </div>
            <div className="flex justify-between text-stone-400">
              <span>{t('Service')}</span>
              <span>{service.toLocaleString()} ETB</span>
            </div>
            <div className="flex justify-between font-bold text-sm text-white pt-1">
              <span>{t('Grand Total')}</span>
              <span className="text-amber-400">{total.toLocaleString()} ETB</span>
            </div>
          </div>

          {/* Payment Method Radio */}
          <div className="space-y-2 pt-2 border-t border-stone-800">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
              {t('Payment Method')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                  paymentMethod === 'cash'
                    ? 'bg-[#2B1810] text-white border-[#2B1810]'
                    : 'bg-[#38210F] text-stone-400 border-stone-800'
                }`}
              >
                <Banknote size={15} /> {t('Cash Collected')}
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('transfer')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                  paymentMethod === 'transfer'
                    ? 'bg-[#2B1810] text-white border-[#2B1810]'
                    : 'bg-[#38210F] text-stone-400 border-stone-800'
                }`}
              >
                <Smartphone size={15} /> {t('Bank / Telebirr')}
              </button>
            </div>
          </div>

          {/* If Transfer: Screenshot + TXID */}
          {paymentMethod === 'transfer' && (
            <div className="space-y-3 pt-2">
              <select
                value={selectedAccount?.id ?? ''}
                onChange={(e) => {
                  const found = accounts.find((a) => a.id === e.target.value);
                  if (found) setSelectedAccount(found);
                }}
                className="w-full px-3 py-2 rounded-xl border border-stone-800 bg-[#38210F] text-white text-xs"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label} ({a.account_number || a.phone_number})
                  </option>
                ))}
              </select>

              <input
                type="text"
                required
                placeholder={t('Transaction ID / Reference *')}
                value={txId}
                onChange={(e) => setTxId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-800 bg-[#38210F] text-white text-xs focus:outline-none focus:border-[#2B1810]"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={cartEntries.length === 0 || submitting}
            className={`w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 ${
              cartEntries.length === 0 || submitting
                ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-95'
            }`}
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" /> {t('Settling…')}
              </>
            ) : (
              <>{t('Settle Order & Print KOT')} ({total.toLocaleString()} ETB)</>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
