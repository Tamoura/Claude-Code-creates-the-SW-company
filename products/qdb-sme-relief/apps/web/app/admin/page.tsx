"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { useLang } from "@/lib/language-context";
import {
  ADMIN_STATS,
  ADMIN_APPLICATIONS,
  AdminApplication,
  ApplicationStatus,
} from "@/lib/mock-data";

type FilterType = "all" | "auto" | "manual" | "pending" | "disbursed";

const STATUS_BADGE: Record<ApplicationStatus, string> = {
  "auto-processing": "badge-auto",
  "manual-review": "badge-manual",
  disbursed: "badge-disbursed",
  rejected: "badge-rejected",
  pending: "badge-pending",
};

const STATUS_LABEL_EN: Record<ApplicationStatus, string> = {
  "auto-processing": "Auto Processing",
  "manual-review": "Manual Review",
  disbursed: "Disbursed",
  rejected: "Rejected",
  pending: "Pending",
};

const STATUS_LABEL_AR: Record<ApplicationStatus, string> = {
  "auto-processing": "معالجة تلقائية",
  "manual-review": "مراجعة يدوية",
  disbursed: "تم الصرف",
  rejected: "مرفوض",
  pending: "معلق",
};

export default function AdminPage() {
  const { t, isAr } = useLang();
  const [filter, setFilter] = useState<FilterType>("all");
  const [showUploadModal, setShowUploadModal] = useState(false);

  const filteredApps = ADMIN_APPLICATIONS.filter((app) => {
    if (filter === "all") return true;
    if (filter === "auto") return app.disbursementType === "auto";
    if (filter === "manual") return app.disbursementType === "manual";
    if (filter === "pending") return app.status === "pending";
    if (filter === "disbursed") return app.status === "disbursed";
    return true;
  });

  const handleNrgpUpload = () => {
    setShowUploadModal(true);
    setTimeout(() => setShowUploadModal(false), 2500);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Admin header bar */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-lg font-bold text-qdb-navy">
                {t(
                  "QDB Relief Portal — Admin Dashboard",
                  "بوابة الإغاثة من QDB — لوحة الإدارة"
                )}
              </h1>
              <p className="text-xs text-gray-400">
                {t("SME Relief Financing Program 2024-2025", "برنامج تمويل دعم المنشآت الصغيرة والمتوسطة 2024-2025")}
              </p>
            </div>
            <button
              onClick={handleNrgpUpload}
              className="gov-btn-primary flex items-center gap-2 text-sm"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              {t("Upload NRGP List", "رفع قائمة NRGP")}
            </button>
          </div>
        </div>
      </div>

      {/* Upload modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 shadow-2xl text-center max-w-sm w-full mx-4">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 border-4 border-qdb-navy border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="font-semibold text-gray-800">
              {t("Uploading NRGP List...", "جاري رفع قائمة NRGP...")}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {t(
                "Processing and validating data",
                "جاري معالجة البيانات والتحقق منها"
              )}
            </p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: t("Total Applications", "إجمالي الطلبات"),
              value: ADMIN_STATS.totalApplications.toLocaleString(),
              color: "text-qdb-navy",
              bg: "bg-blue-50",
              border: "border-blue-200",
            },
            {
              label: t("Auto Disbursement", "الصرف التلقائي"),
              value: ADMIN_STATS.autoDisburse.toLocaleString(),
              color: "text-blue-600",
              bg: "bg-blue-50",
              border: "border-blue-200",
            },
            {
              label: t("Manual Review", "المراجعة اليدوية"),
              value: ADMIN_STATS.manualReview.toLocaleString(),
              color: "text-amber-600",
              bg: "bg-amber-50",
              border: "border-amber-200",
            },
            {
              label: t("Disbursed", "تم الصرف"),
              value: ADMIN_STATS.disbursed.toLocaleString(),
              color: "text-green-600",
              bg: "bg-green-50",
              border: "border-green-200",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`${stat.bg} border ${stat.border} rounded-xl p-4`}
            >
              <p className="text-xs font-medium text-gray-500 mb-1">
                {stat.label}
              </p>
              <p className={`text-2xl font-black ${stat.color}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {(
            [
              { key: "all", en: "All Applications", ar: "جميع الطلبات" },
              { key: "auto", en: "Auto Disbursement", ar: "الصرف التلقائي" },
              { key: "manual", en: "Manual Review", ar: "المراجعة اليدوية" },
              { key: "pending", en: "Pending", ar: "معلق" },
              { key: "disbursed", en: "Disbursed", ar: "تم الصرف" },
            ] as { key: FilterType; en: string; ar: string }[]
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                filter === f.key
                  ? "bg-qdb-navy text-white"
                  : "bg-white border border-gray-300 text-gray-600 hover:border-qdb-navy"
              }`}
            >
              {isAr ? f.ar : f.en}
            </button>
          ))}
          <span className="ml-auto text-sm text-gray-400 self-center">
            {t(
              `Showing ${filteredApps.length} applications`,
              `عرض ${filteredApps.length} طلب`
            )}
          </span>
        </div>

        {/* Applications table */}
        <div className="gov-card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {[
                    t("Ref #", "الرقم المرجعي"),
                    t("CR #", "رقم السجل"),
                    t("Company", "الشركة"),
                    t("Date", "التاريخ"),
                    t("Status", "الحالة"),
                    t("Type", "النوع"),
                    t("Amount", "المبلغ"),
                    t("Actions", "الإجراءات"),
                  ].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredApps.map((app: AdminApplication) => (
                  <tr
                    key={app.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">
                      {app.id.split("-").pop()}
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {app.crNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-800 whitespace-nowrap">
                          {app.companyName}
                        </p>
                        {app.relationshipManager && (
                          <p className="text-xs text-gray-400">
                            {t("RM:", "مدير العلاقات:")} {app.relationshipManager}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {app.submittedDate}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={STATUS_BADGE[app.status]}>
                        {isAr
                          ? STATUS_LABEL_AR[app.status]
                          : STATUS_LABEL_EN[app.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={
                          app.disbursementType === "auto"
                            ? "badge-auto"
                            : "badge-manual"
                        }
                      >
                        {app.disbursementType === "auto"
                          ? t("Auto", "تلقائي")
                          : t("Manual", "يدوي")}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">
                      {app.amount}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          className="text-xs text-qdb-navy hover:underline font-medium"
                          onClick={() =>
                            alert(
                              isAr ? "سيتم إضافة هذه الميزة قريباً" : "Feature coming soon"
                            )
                          }
                        >
                          {t("View", "عرض")}
                        </button>
                        {app.status === "manual-review" && (
                          <button
                            className="text-xs text-green-600 hover:underline font-medium"
                            onClick={() =>
                              alert(
                                isAr
                                  ? "سيتم إضافة هذه الميزة قريباً"
                                  : "Approve feature coming soon"
                              )
                            }
                          >
                            {t("Approve", "موافقة")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredApps.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <svg
                className="w-12 h-12 mx-auto mb-3 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {t("No applications match this filter", "لا توجد طلبات تطابق هذا المرشح")}
            </div>
          )}
        </div>

        {/* Last updated */}
        <p className="text-xs text-gray-400 mt-4 text-center">
          {t(
            "Data last updated: 15 December 2024, 10:30 AM AST",
            "آخر تحديث للبيانات: 15 ديسمبر 2024، 10:30 صباحاً"
          )}
        </p>
      </div>
    </div>
  );
}
