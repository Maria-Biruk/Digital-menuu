"use client";

import React, { useEffect, useState } from "react";
import AdminHeader from "@/components/AdminHeader";
import PaymentHistory from "@/components/PaymentHistory";
import RoleGuard from "@/components/RoleGuard";
import { getRoleInfo } from "@/lib/permissions";
import { useStaffLang } from "@/lib/i18n/staff";

export default function AdminPaymentHistoryPage() {
  return (
    <RoleGuard allowedRoles={["super_admin", "owner", "admin"]} pageTitle="Payment History">
      <AdminPaymentHistoryContent />
    </RoleGuard>
  );
}

function AdminPaymentHistoryContent() {
  const { t } = useStaffLang();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setRole(localStorage.getItem("staff_role"));
  }, []);

  const roleInfo = getRoleInfo(role);
  const isSuperAdmin = roleInfo.role === "super_admin" || roleInfo.role === "owner";

  return (
    <div className="min-h-screen app-bg-dark text-stone-100 font-sans pb-16 lg:pl-64">
      <AdminHeader
        title={isSuperAdmin ? t("Complete Payment History") : t("Week Payment History")}
        subtitle={t("Screenshots & transactions")}
      />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="bg-[#3A241A] border border-[#2B1810] rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-stone-400 mb-4">
            {t("All payments submitted by diners, with their receipts")}
            {isSuperAdmin
              ? " " + t("Super admins can widen the range and export the full history as CSV.")
              : ""}
          </p>
          <PaymentHistory
            defaultRange="week"
            allowExport={isSuperAdmin}
            lockRange={!isSuperAdmin}
          />
        </div>
      </div>
    </div>
  );
}
