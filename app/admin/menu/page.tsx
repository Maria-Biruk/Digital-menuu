"use client";

import React, { useState, useEffect, useCallback } from "react";
import AdminHeader from "@/components/AdminHeader";
import MenuItemEditor from "@/components/MenuItemEditor";
import { fetchCatalog, subscribeMenu, setItemAvailability, saveMenuItem, deleteMenuItem } from "@/lib/db";
import { MenuItem, Category } from "@/lib/types";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  UtensilsCrossed,
  Wine,
  Filter,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import RoleGuard from "@/components/RoleGuard";

export default function AdminMenuPage() {
  return (
    <RoleGuard allowedRoles={["super_admin", "owner", "admin"]} pageTitle="Menu Catalog Admin">
      <AdminMenuContent />
    </RoleGuard>
  );
}

function AdminMenuContent() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStation, setSelectedStation] = useState<string>("all");
  const [editorItem, setEditorItem] = useState<MenuItem | null | "new">(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const load = useCallback(async () => {
    try {
      const { menu, categories: cats } = await fetchCatalog();
      setItems(menu);
      setCategories(cats);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load menu");
    }
  }, []);

  useEffect(() => {
    void load();
    const unsubscribe = subscribeMenu(() => void load());
    return unsubscribe;
  }, [load]);

  const handleToggleAvailability = async (id: string) => {
    const target = items.find((i) => i.id === id);
    const next = !target?.is_available;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_available: next } : i)));
    try {
      await setItemAvailability(id, next);
    } catch (err) {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_available: !next } : i)));
      showToast(err instanceof Error ? err.message : "Failed to update availability");
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this menu item?")) return;
    try {
      await deleteMenuItem(id);
      await load();
      showToast("Item deleted from menu catalog.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete item");
    }
  };

  const handleSaveItem = async (savedItem: MenuItem) => {
    try {
      await saveMenuItem(savedItem as unknown as Record<string, unknown>, editorItem === "new" ? undefined : savedItem.id);
      await load();
      showToast(editorItem === "new" ? `Added "${savedItem.name_i18n.en}" to menu.` : `Updated "${savedItem.name_i18n.en}".`);
      setEditorItem(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save item");
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name_i18n.en.toLowerCase().includes(search.toLowerCase()) ||
      item.name_i18n.am.toLowerCase().includes(search.toLowerCase());
    const matchesCat =
      selectedCategory === "all" || item.category_id === selectedCategory;
    const matchesStation =
      selectedStation === "all" || item.station === selectedStation;
    return matchesSearch && matchesCat && matchesStation;
  });

  return (
    <div className="min-h-screen app-bg-dark text-stone-100 font-sans pb-16">
      <AdminHeader
        title="Menu Management"
        subtitle="Catalog, Recipes & Station Routing"
      />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Toast */}
        {toastMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs sm:text-sm font-medium flex items-center gap-2 animate-fadeIn">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Controls Bar */}
        <div className="bg-[#3A241A] border border-[#2B1810] rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-lg">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
            <input
              type="text"
              placeholder="Search by English or Amharic name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#38210F] border border-[#2B1810] text-sm text-white placeholder:text-stone-500 focus:outline-none focus:border-amber-500/70"
            />
          </div>

          {/* Filters & Add Button */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-[#38210F] border border-[#2B1810] text-stone-300 text-xs py-2.5 px-3 rounded-xl focus:outline-none focus:border-amber-500/70 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_i18n.en} ({c.name_i18n.am})
                </option>
              ))}
            </select>

            {/* Station Filter */}
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className="bg-[#38210F] border border-[#2B1810] text-stone-300 text-xs py-2.5 px-3 rounded-xl focus:outline-none focus:border-amber-500/70 cursor-pointer"
            >
              <option value="all">All Stations</option>
              <option value="kitchen">Kitchen Only</option>
              <option value="bar">Bar Only</option>
            </select>

            {/* Add Item Button */}
            <button
              onClick={() => setEditorItem("new")}
              className="bg-[#2B1810] hover:bg-[#3D2415] active:bg-[#2A180B] text-white border border-[#3D2415] px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer hover:shadow-amber-950/40"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Add New Item</span>
            </button>
          </div>
        </div>

        {/* Table of Menu Items */}
        <div className="bg-[#3A241A] border border-[#2B1810] rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-stone-300">
              <thead className="bg-[#38210F] text-[11px] uppercase tracking-wider text-stone-400 border-b border-[#2B1810]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Item & Details</th>
                  <th className="py-3.5 px-4 font-semibold">Category</th>
                  <th className="py-3.5 px-4 font-semibold">Station</th>
                  <th className="py-3.5 px-4 font-semibold">Price</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2B1810]">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-stone-500 text-xs">
                      No dishes matched your filter or search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const cat = categories.find((c) => c.id === item.category_id);
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-[#2B1810]/30 transition-colors"
                      >
                        {/* Item column */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.image_path}
                              alt={item.name_i18n.en}
                              className="w-12 h-12 rounded-xl object-cover border border-[#2B1810] shrink-0"
                            />
                            <div>
                              <p className="font-bold text-white text-sm">
                                {item.name_i18n.en}
                              </p>
                              <p className="text-xs text-amber-300/80 font-serif">
                                {item.name_i18n.am} • {item.name_i18n.om}
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.dietary_tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="text-[9px] px-1.5 py-0.2 rounded bg-[#38210F] border border-stone-800 text-stone-400"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4 text-xs text-stone-300">
                          {cat?.name_i18n.en || item.category_id}
                        </td>

                        {/* Station badge */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                              item.station === "kitchen"
                                ? "bg-amber-950/50 text-amber-300 border border-amber-800/40"
                                : "bg-purple-950/50 text-purple-300 border border-purple-800/40"
                            }`}
                          >
                            {item.station === "kitchen" ? (
                              <UtensilsCrossed className="w-3 h-3" />
                            ) : (
                              <Wine className="w-3 h-3" />
                            )}
                            <span className="capitalize">{item.station}</span>
                          </span>
                        </td>

                        {/* Price */}
                        <td className="py-3.5 px-4 font-mono font-bold text-amber-300 text-sm">
                          {item.price} ETB
                        </td>

                        {/* Availability Toggle */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleToggleAvailability(item.id)}
                            className="cursor-pointer transition-transform active:scale-95 inline-flex items-center gap-1.5 text-xs font-semibold"
                            title="Toggle customer menu visibility"
                          >
                            {item.is_available ? (
                              <span className="text-emerald-400 flex items-center gap-1">
                                <ToggleRight className="w-6 h-6" />
                                <span className="hidden sm:inline text-[11px]">Active</span>
                              </span>
                            ) : (
                              <span className="text-rose-400 flex items-center gap-1">
                                <ToggleLeft className="w-6 h-6" />
                                <span className="hidden sm:inline text-[11px]">86'd</span>
                              </span>
                            )}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditorItem(item)}
                              className="p-2 rounded-lg bg-[#38210F] hover:bg-[#2B1810] text-stone-300 hover:text-white border border-[#2B1810] transition-colors cursor-pointer"
                              title="Edit item details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-2 rounded-lg bg-[#38210F] hover:bg-rose-950/60 text-stone-400 hover:text-rose-300 border border-[#2B1810] hover:border-rose-900/50 transition-colors cursor-pointer"
                              title="Delete item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Item Editor — Full-Page Overlay */}
      {editorItem !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div
            onClick={() => setEditorItem(null)}
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
          />
          <div className="relative z-10 w-full max-w-2xl max-h-[92vh] overflow-y-auto animate-scale-up">
            <MenuItemEditor
              initialItem={editorItem === "new" ? null : editorItem}
              categories={categories}
              onSave={handleSaveItem}
              onCancel={() => setEditorItem(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
