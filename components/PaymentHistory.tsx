"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Receipt,
  Download,
  ImageIcon,
  X,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import {
  fetchPaymentHistory,
  type PaymentHistoryRow,
  type PaymentHistoryRange,
} from "@/lib/db";
import { useT } from "@/lib/i18n/staff";

interface PaymentHistoryProps {
  /** "week" is the default Admin view; cashier / super admin can widen it. */
  defaultRange?: PaymentHistoryRange;
  /** Super Admin gets the CSV export control. */
  allowExport?: boolean;
  /** Hide the range switcher (locked weekly view for the Admin page). */
  lockRange?: boolean;
}

const RANGE_KEYS: Record<PaymentHistoryRange, string> = {
  week: "Week",
  month: "Month",
  all: "All",
};

function statusColor(status: string): string {
  switch (status) {
    case "approved":
    case "verified":
      return "bg-emerald-950/70 text-emerald-300 border-emerald-700/60";
    case "pending_verification":
      return "bg-amber-950/70 text-amber-300 border-amber-700/60";
    case "rejected":
      return "bg-rose-950/70 text-rose-300 border-rose-700/60";
    default:
      return "bg-stone-800 text-stone-300 border-stone-700";
  }
}

export default function PaymentHistory({
  defaultRange = "week",
  allowExport = false,
  lockRange = false,
}: PaymentHistoryProps) {
  const t = useT();
  const [range, setRange] = useState<PaymentHistoryRange>(defaultRange);
  const [rows, setRows] = useState<PaymentHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [missingFn, setMissingFn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PaymentHistoryRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPaymentHistory(range);
      setRows(res.rows);
      setMissingFn(res.missingFn);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => {
    const verified = rows.filter(
      (r) => r.status === "approved" || r.status === "verified",
    );
    return {
      count: rows.length,
      verifiedAmount: verified.reduce((s, r) => s + r.amount, 0),
    };
  }, [rows]);

  const exportCsv = useCallback(() => {
    const header = [
      "Order",
      "Date",
      "Table",
      "Method",
      "Amount (ETB)",
      "Status",
      "Transaction ID",
      "Account",
      "Verified By",
      "Verified At",
    ];
    const lines = rows.map((r) =>
      [
        r.orderNumber,
        new Date(r.createdAt).toLocaleString(),
        r.fulfillmentType?.toLowerCase().includes("take")
          ? "Takeaway"
          : r.tableLabel ?? "—",
        r.method,
        String(r.amount),
        r.status,
        r.transactionId ?? "",
        r.accountLabel ?? "",
        r.verifiedByName ?? "",
        r.verifiedAt ? new Date(r.verifiedAt).toLocaleString() : "",
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payment-history-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [rows, range]);

  const openScreenshot = useCallback(async (row: PaymentHistoryRow) => {
    // Re-sign on demand so an expired preview URL never blocks the cashier.
    if (!row.proofUrl && row.proofUrl !== "") return;
    setPreview(row);
  }, []);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-amber-950/60 text-amber-400 flex items-center justify-center border border-amber-800/50">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-serif font-bold text-base text-white">
              {t("Payment History")}
            </h2>
            <p className="text-[11px] text-stone-400">{t("Screenshots & transactions")}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!lockRange && (
            <div className="flex bg-[#38210F] p-0.5 rounded-lg border border-[#2B1810]">
              {(["week", "month", "all"] as PaymentHistoryRange[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                    range === r
                      ? "bg-[#2B1810] text-amber-300 border border-[#3D2415]"
                      : "text-stone-400 hover:text-white"
                  }`}
                >
                  {t(RANGE_KEYS[r])}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => void load()}
            title={t("Refresh")}
            className="flex items-center gap-1.5 text-xs bg-[#2B1810] hover:bg-[#3D2415] text-stone-300 hover:text-white px-3 py-1.5 rounded-lg border border-[#3D2415] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          {allowExport && (
            <button
              onClick={exportCsv}
              disabled={!rows.length}
              className="flex items-center gap-1.5 text-xs bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-stone-950 font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t("Export Report")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-[#3A241A] border border-[#2B1810]">
          <p className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">
            {t("Payments")}
          </p>
          <p className="text-lg font-serif font-bold text-white">{totals.count}</p>
        </div>
        <div className="p-3 rounded-xl bg-[#3A241A] border border-[#2B1810]">
          <p className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">
            {t("Verified")} · {t("Amount")}
          </p>
          <p className="text-lg font-serif font-bold text-emerald-300">
            {totals.verifiedAmount.toLocaleString()} ETB
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {missingFn && (
        <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-700/50 text-amber-200 text-xs leading-relaxed">
          {t(
            "Payment history needs one database update. Ask an administrator to run backend/supabase/2026-11-06-payment-history.sql in the Supabase SQL editor.",
          )}
        </div>
      )}

      {/* Table */}
      {loading && !rows.length ? (
        <div className="p-10 text-center text-stone-400 text-sm">{t("Loading...")}</div>
      ) : rows.length === 0 && !missingFn ? (
        <div className="p-10 text-center text-stone-400 text-sm rounded-2xl bg-[#3A241A] border border-[#2B1810]">
          {t("No payments in this period.")}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#2B1810]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#38210F] text-stone-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-3 py-2.5 font-bold">{t("Order")}</th>
                <th className="px-3 py-2.5 font-bold whitespace-nowrap">{t("Date")}</th>
                <th className="px-3 py-2.5 font-bold">{t("Table")}</th>
                <th className="px-3 py-2.5 font-bold text-right">{t("Amount")}</th>
                <th className="px-3 py-2.5 font-bold">{t("Status")}</th>
                <th className="px-3 py-2.5 font-bold">{t("Transaction ID")}</th>
                <th className="px-3 py-2.5 font-bold text-center">{t("Screenshot")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B1810]">
              {rows.map((r) => {
                const isTakeaway = r.fulfillmentType?.toLowerCase().includes("take");
                return (
                  <tr key={r.id} className="hover:bg-[#38210F]/50 transition-colors">
                    <td className="px-3 py-2.5 font-bold text-amber-300 whitespace-nowrap">
                      #{r.orderNumber}
                    </td>
                    <td className="px-3 py-2.5 text-stone-300 whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleDateString()}{" "}
                      <span className="text-stone-500">
                        {new Date(r.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-stone-300">
                      {isTakeaway ? t("Takeaway") : r.tableLabel ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-white">
                      {r.amount.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap ${statusColor(
                          r.status,
                        )}`}
                      >
                        {t(STATUS_LABEL[r.status] ?? r.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-stone-400">
                      {r.transactionId ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {r.proofUrl ? (
                        <button
                          onClick={() => void openScreenshot(r)}
                          className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 font-bold cursor-pointer"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>{t("View")}</span>
                        </button>
                      ) : (
                        <span className="text-stone-600">{t("No screenshot")}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Screenshot modal */}
      {preview?.proofUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="relative max-w-lg w-full bg-[#3A241A] rounded-2xl border border-[#2B1810] p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-amber-300">
                #{preview.orderNumber} · {preview.amount.toLocaleString()} ETB
              </p>
              <button
                onClick={() => setPreview(null)}
                className="text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <a
              href={preview.proofUrl}
              target="_blank"
              rel="noreferrer"
              className="block"
            >
              <img
                src={preview.proofUrl}
                alt={t("Screenshot")}
                className="w-full max-h-[70vh] object-contain rounded-xl bg-black/30"
              />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  approved: "Verified",
  verified: "Verified",
  pending_verification: "Pending verification",
  rejected: "Failed",
  refunded: "Refunded",
};
