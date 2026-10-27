"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import AdminHeader from "@/components/AdminHeader";
import { fetchTables, addTable, deleteTable, fetchRestaurantSlug } from "@/lib/db";
import { Table } from "@/lib/types";
import {
  QrCode,
  Download,
  ExternalLink,
  Plus,
  Printer,
  Sparkles,
  Trash2,
  CheckCircle2
} from "lucide-react";
import RoleGuard from "@/components/RoleGuard";

export default function AdminTablesPage() {
  return (
    <RoleGuard allowedRoles={["super_admin", "owner", "admin"]} pageTitle="Table QR Codes">
      <AdminTablesContent />
    </RoleGuard>
  );
}

function AdminTablesContent() {
  const [tablesList, setTablesList] = useState<Table[]>([]);
  const [slug, setSlug] = useState("meskel-house");
  const [qrCodeUrls, setQrCodeUrls] = useState<Record<string, string>>({});
  const [loadingQrs, setLoadingQrs] = useState(true);
  const [loadingTables, setLoadingTables] = useState(true);
  const [origin, setOrigin] = useState("http://localhost:3000");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadTables = async () => {
    try {
      const rows = await fetchTables();
      setTablesList(rows);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load tables");
    } finally {
      setLoadingTables(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
    void loadTables();
    fetchRestaurantSlug()
      .then(setSlug)
      .catch(() => {
        /* keep default slug */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function generateAllQrs() {
      if (loadingTables) return;
      setLoadingQrs(true);
      const generated: Record<string, string> = {};

      for (const table of tablesList) {
        const fullUrl = `${origin}/${slug}/table/${table.id}`;
        try {
          const dataUrl = await QRCode.toDataURL(fullUrl, {
            width: 320,
            margin: 2,
            color: {
              dark: "#2B1810", // Dark brown brand QR pattern
              light: "#FFFFFF",
            },
          });
          generated[table.id] = dataUrl;
        } catch (err) {
          console.error("Failed to generate QR for", table.id, err);
        }
      }

      if (isMounted) {
        setQrCodeUrls(generated);
        setLoadingQrs(false);
      }
    }

    generateAllQrs();

    return () => {
      isMounted = false;
    };
  }, [tablesList, origin, slug, loadingTables]);

  const handleDownloadQr = (table: Table) => {
    const dataUrl = qrCodeUrls[table.id];
    if (!dataUrl) return;

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${slug}-table-${table.label}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddTable = async () => {
    const label = window.prompt("Table label / number", String(tablesList.length + 1));
    if (!label || !label.trim()) return;
    try {
      await addTable(label.trim());
      await loadTables();
      showToast(`Added Table ${label.trim()}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to add table");
    }
  };

  const handleDeleteTable = async (table: Table) => {
    if (!confirm(`Delete Table ${table.label}? This cannot be undone.`)) return;
    try {
      await deleteTable(table.id);
      await loadTables();
      showToast(`Deleted Table ${table.label}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete table");
    }
  };

  return (
    <div className="min-h-screen app-bg-dark text-stone-100 font-sans pb-16">
      <AdminHeader
        title="Table QR Codes"
        subtitle="Diner Scan & Order Stations"
      />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {toastMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs sm:text-sm font-medium flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
        {/* Top Control Bar */}
        <div className="bg-[#3A241A] border border-[#2B1810] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
          <div>
            <h2 className="font-serif font-bold text-base text-white">
              Restaurant Tables ({tablesList.length})
            </h2>
            <p className="text-xs text-stone-400">
              Each QR code directly opens the multilingual digital menu linked to its specific table.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2.5 rounded-xl bg-[#38210F] hover:bg-[#2B1810] text-stone-300 hover:text-white text-xs font-semibold border border-[#2B1810] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Sheet</span>
            </button>

            <button
              onClick={handleAddTable}
              className="bg-[#2B1810] hover:bg-[#3D2415] active:bg-[#2A180B] text-white border border-[#3D2415] px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Add Table</span>
            </button>
          </div>
        </div>

        {/* QR Code Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {tablesList.map((table) => {
            const qrImage = qrCodeUrls[table.id];
            const tableMenuUrl = `/${slug}/table/${table.id}`;

            return (
              <div
                key={table.id}
                className="bg-[#3A241A] border border-[#2B1810] hover:border-amber-700/50 rounded-3xl p-5 shadow-xl flex flex-col items-center text-center transition-all group"
              >
                {/* Header with Table Label */}
                <div className="w-full flex items-center justify-between pb-3 border-b border-[#2B1810] mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#2B1810] text-amber-400 flex items-center justify-center font-bold text-xs border border-[#3D2415]">
                      {table.label}
                    </div>
                    <span className="font-serif font-bold text-white text-sm">
                      Table {table.label}
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                    Active
                  </span>
                </div>

                {/* QR Code Container */}
                <div className="p-3 bg-white rounded-2xl shadow-inner my-1 border-2 border-stone-100 flex items-center justify-center min-w-[180px] min-h-[180px]">
                  {qrImage ? (
                    <img
                      src={qrImage}
                      alt={`QR code for table ${table.label}`}
                      className="w-40 h-40 object-contain"
                    />
                  ) : (
                    <div className="w-40 h-40 flex flex-col items-center justify-center text-stone-400 text-xs">
                      <QrCode className="w-8 h-8 animate-pulse text-[#2B1810] mb-2" />
                      <span>Generating QR...</span>
                    </div>
                  )}
                </div>

                {/* URL preview */}
                <p className="text-[11px] font-mono text-stone-400 mt-3 truncate w-full">
                  {tableMenuUrl}
                </p>

                {/* Action Buttons */}
                <div className="w-full grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-[#2B1810]">
                  <button
                    onClick={() => handleDownloadQr(table)}
                    disabled={!qrImage}
                    className="py-2 px-3 rounded-xl bg-[#2B1810] hover:bg-[#3D2415] text-white border border-[#3D2415] text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>Download</span>
                  </button>

                  <Link
                    href={tableMenuUrl}
                    target="_blank"
                    className="py-2 px-3 rounded-xl bg-[#38210F] hover:bg-[#2B1810] text-stone-300 hover:text-white border border-[#2B1810] text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>Test Scan</span>
                    <ExternalLink className="w-3 h-3 text-stone-400" />
                  </Link>

                  <button
                    onClick={() => handleDeleteTable(table)}
                    className="col-span-2 py-2 px-3 rounded-xl bg-[#38210F] hover:bg-rose-950/60 text-stone-400 hover:text-rose-300 border border-[#2B1810] hover:border-rose-900/50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Table</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
