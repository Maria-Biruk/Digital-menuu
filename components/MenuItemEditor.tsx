'use client';

import React, { useState } from 'react';
import { X, Check, Utensils, Wine } from 'lucide-react';
import { MenuItem, Category, Lang, Station } from '../lib/types';
import { CATEGORIES } from '../lib/mock';

interface MenuItemEditorProps {
  initialItem?: MenuItem | null;
  categories?: Category[];
  onSave: (item: MenuItem) => void;
  onCancel: () => void;
  className?: string;
}

const DIETARY_OPTIONS = [
  { id: 'vegan', label: 'Vegan (የፆም)' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'halal', label: 'Halal (ሀላል)' },
  { id: 'spicy', label: 'Spicy (የሚቃጥል)' },
  { id: 'gluten-free', label: 'Gluten-Free' },
];

export default function MenuItemEditor({
  initialItem,
  categories = CATEGORIES,
  onSave,
  onCancel,
  className = '',
}: MenuItemEditorProps) {
  const [activeLangTab, setActiveLangTab] = useState<Lang>('en');

  // Form states
  const [nameEn, setNameEn] = useState(initialItem?.name_i18n.en || '');
  const [nameAm, setNameAm] = useState(initialItem?.name_i18n.am || '');
  const [nameOm, setNameOm] = useState(initialItem?.name_i18n.om || '');

  const [descEn, setDescEn] = useState(initialItem?.description_i18n.en || '');
  const [descAm, setDescAm] = useState(initialItem?.description_i18n.am || '');
  const [descOm, setDescOm] = useState(initialItem?.description_i18n.om || '');

  const [categoryId, setCategoryId] = useState(initialItem?.category_id || categories[0]?.id || '');
  const [price, setPrice] = useState(initialItem?.price ? String(initialItem.price) : '250');
  const [station, setStation] = useState<Station>(initialItem?.station || 'kitchen');
  const [avgPrepMinutes, setAvgPrepMinutes] = useState(initialItem?.avg_prep_minutes ? String(initialItem.avg_prep_minutes) : '15');
  const [imagePath, setImagePath] = useState(
    initialItem?.image_path || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800'
  );
  const [dietaryTags, setDietaryTags] = useState<string[]>(initialItem?.dietary_tags || []);
  const [isAvailable, setIsAvailable] = useState<boolean>(initialItem?.is_available ?? true);

  const toggleTag = (tag: string) => {
    setDietaryTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updated: MenuItem = {
      id: initialItem?.id || `m-${Date.now()}`,
      category_id: categoryId,
      name_i18n: {
        en: nameEn.trim() || 'Untitled Dish',
        am: nameAm.trim() || nameEn.trim() || 'ያልተሰየመ',
        om: nameOm.trim() || nameEn.trim() || 'Dish',
      },
      description_i18n: {
        en: descEn.trim(),
        am: descAm.trim() || descEn.trim(),
        om: descOm.trim() || descEn.trim(),
      },
      price: parseFloat(price) || 0,
      image_path: imagePath.trim(),
      dietary_tags: dietaryTags,
      station,
      avg_prep_minutes: parseInt(avgPrepMinutes, 10) || 15,
      is_available: isAvailable,
    };

    // TODO: upsert into Supabase menu_items table
    onSave(updated);
  };

  return (
    <div className={`bg-[#150D09] border border-stone-800 text-stone-100 rounded-3xl p-6 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-stone-800 mb-6">
        <div>
          <h3 className="font-serif text-xl font-bold text-white">
            {initialItem ? 'Edit Menu Item' : 'Add New Menu Item'}
          </h3>
          <p className="text-xs text-stone-400 mt-0.5">
            Configure multi-language titles, preparation station, and pricing
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Multilingual Tabs */}
        <div className="space-y-3 p-4 rounded-2xl bg-[#1C1109] border border-stone-800/80">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Localized Name & Description
            </label>
            <div className="flex bg-[#120B07] p-1 rounded-xl border border-stone-800">
              {(['en', 'am', 'om'] as Lang[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setActiveLangTab(lang)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeLangTab === lang
                      ? 'bg-[#2B1810] text-white shadow-sm'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {activeLangTab === 'en' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-400 mb-1">
                  Dish Name (English) *
                </label>
                <input
                  type="text"
                  required
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="e.g. Doro Wat Special"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-800 bg-[#120B07] text-white text-xs focus:outline-none focus:border-[#2B1810]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-400 mb-1">
                  Description (English)
                </label>
                <textarea
                  rows={2}
                  value={descEn}
                  onChange={(e) => setDescEn(e.target.value)}
                  placeholder="Ingredients, flavors, spices..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-800 bg-[#120B07] text-white text-xs focus:outline-none focus:border-[#2B1810] resize-none"
                />
              </div>
            </div>
          )}

          {activeLangTab === 'am' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-400 mb-1">
                  የምግብ ስም (አማርኛ)
                </label>
                <input
                  type="text"
                  value={nameAm}
                  onChange={(e) => setNameAm(e.target.value)}
                  placeholder="ለምሳሌ፡ ዶሮ ወጥ ስፔሻል"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-800 bg-[#120B07] text-white text-xs focus:outline-none focus:border-[#2B1810]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-400 mb-1">
                  ማብራሪያ (አማርኛ)
                </label>
                <textarea
                  rows={2}
                  value={descAm}
                  onChange={(e) => setDescAm(e.target.value)}
                  placeholder="ስለ ምግቡ ማብራሪያ..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-800 bg-[#120B07] text-white text-xs focus:outline-none focus:border-[#2B1810] resize-none"
                />
              </div>
            </div>
          )}

          {activeLangTab === 'om' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-400 mb-1">
                  Maqaa Nyaataa (Afaan Oromoo)
                </label>
                <input
                  type="text"
                  value={nameOm}
                  onChange={(e) => setNameOm(e.target.value)}
                  placeholder="Fkn. Doro Wot Addaa"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-800 bg-[#120B07] text-white text-xs focus:outline-none focus:border-[#2B1810]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-400 mb-1">
                  Ibsa (Afaan Oromoo)
                </label>
                <textarea
                  rows={2}
                  value={descOm}
                  onChange={(e) => setDescOm(e.target.value)}
                  placeholder="Ibsa qophii nyaataa..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-800 bg-[#120B07] text-white text-xs focus:outline-none focus:border-[#2B1810] resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Category & Pricing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-1.5">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-800 bg-[#1C1109] text-white text-xs focus:outline-none focus:border-[#2B1810]"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_i18n.en}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-1.5">
              Price (ETB) *
            </label>
            <input
              type="number"
              required
              min={0}
              step="any"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-800 bg-[#1C1109] text-white text-xs focus:outline-none focus:border-[#2B1810]"
            />
          </div>
        </div>

        {/* Station Radio & Prep Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-1.5">
              Preparation Station
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStation('kitchen')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  station === 'kitchen'
                    ? 'bg-[#2B1810] text-white border-[#2B1810] shadow-sm'
                    : 'bg-[#1C1109] text-stone-400 border-stone-800 hover:border-stone-700'
                }`}
              >
                <Utensils size={14} className={station === 'kitchen' ? 'text-amber-400' : ''} />
                Kitchen
              </button>
              <button
                type="button"
                onClick={() => setStation('bar')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  station === 'bar'
                    ? 'bg-[#2B1810] text-white border-[#2B1810] shadow-sm'
                    : 'bg-[#1C1109] text-stone-400 border-stone-800 hover:border-stone-700'
                }`}
              >
                <Wine size={14} className={station === 'bar' ? 'text-cyan-400' : ''} />
                Bar
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-1.5">
              Average Prep Time (Minutes)
            </label>
            <input
              type="number"
              min={1}
              value={avgPrepMinutes}
              onChange={(e) => setAvgPrepMinutes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-800 bg-[#1C1109] text-white text-xs focus:outline-none focus:border-[#2B1810]"
            />
          </div>
        </div>

        {/* Image URL */}
        <div>
          <label className="block text-xs font-semibold text-stone-400 mb-1.5">
            Dish Image URL (Unsplash or CDN)
          </label>
          <input
            type="url"
            value={imagePath}
            onChange={(e) => setImagePath(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-800 bg-[#1C1109] text-white text-xs focus:outline-none focus:border-[#2B1810]"
          />
        </div>

        {/* Dietary Tags Checkboxes */}
        <div>
          <label className="block text-xs font-semibold text-stone-400 mb-2">
            Dietary Preferences & Badges
          </label>
          <div className="flex flex-wrap gap-2">
            {DIETARY_OPTIONS.map((tag) => {
              const checked = dietaryTags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    checked
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-[#1C1109] text-stone-400 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <span
                    className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                      checked ? 'bg-amber-500 text-neutral-950' : 'border border-stone-700'
                    }`}
                  >
                    {checked && <Check size={10} strokeWidth={3} />}
                  </span>
                  <span>{tag.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Available Toggle */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-[#1C1109] border border-stone-800">
          <div>
            <p className="text-xs font-bold text-white">Item Availability</p>
            <p className="text-[11px] text-stone-400">
              When disabled, guests see this item marked as Sold Out.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAvailable(!isAvailable)}
            className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer p-0.5 ${
              isAvailable ? 'bg-emerald-600' : 'bg-stone-800'
            }`}
          >
            <span
              className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                isAvailable ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl border border-stone-800 text-xs font-bold text-stone-300 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-[#2B1810] hover:bg-[#3D2415] text-white text-xs font-bold shadow-lg transition-all cursor-pointer border border-[#3D2415]"
          >
            {initialItem ? 'Save Changes' : 'Create Dish'}
          </button>
        </div>
      </form>
    </div>
  );
}
