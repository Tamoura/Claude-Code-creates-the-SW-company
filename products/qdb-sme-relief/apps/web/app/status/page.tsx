"use client";

import Link from "next/link";
import Header from "@/components/Header";
import { useLang } from "@/lib/language-context";
import { useApp } from "@/lib/app-context";
import {
  APPLICATION_REFERENCE,
  STATUS_TIMELINE,
  ELIGIBLE_COMPANY,
} from "@/lib/mock-data";

export default function StatusPage() {
  const { t, isAr } = useLang();
  const { state } = useApp();

  const company = state.company ?? ELIGIBLE_COMPANY;

  const handleDownloadReceipt = () => {
    alert(
      isAr
        ? "ميزة تنزيل الإيصال ستكون متاحة قريباً"
        : "Receipt download feature will be available soon"
    );
  };

  const stepIcon = (status: string) => {
    if (status === "completed")
      return (
        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      );
    if (status === "in-progress")
      return (
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      );
    return (
      <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center flex-shrink-0">
        <div className="w-2 h-2 rounded-full bg-gray-400" />
      </div>
    );
  };

  return (
    <div className="step-page">
      <Header showUser />

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header card */}
        <div className="bg-qdb-navy text-white rounded-xl p-6 mb-6 shadow-lg">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-blue-200 text-xs font-medium mb-1">
                {t("Application Status", "حالة الطلب")}
              </p>
              <p className="font-bold font-mono text-lg">
                {APPLICATION_REFERENCE}
              </p>
              <p className="text-blue-300 text-sm mt-1">
                {t("Submitted:", "تاريخ التقديم:")}{" "}
                {isAr ? "15 ديسمبر 2024" : "15 December 2024"}
              </p>
            </div>
            <div className="text-right">
              <span
                className={state.isNrgpListed ? "badge-auto" : "badge-manual"}
              >
                {state.isNrgpListed
                  ? t("Auto Disbursement", "صرف تلقائي")
                  : t("Manual Review", "مراجعة يدوية")}
              </span>
            </div>
          </div>
        </div>

        {/* Company summary */}
        <div className="gov-card mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {t("Company Information", "معلومات الشركة")}
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              {
                label: t("Company", "الشركة"),
                value: isAr ? company.companyNameAr : company.companyName,
              },
              { label: t("CR Number", "رقم السجل التجاري"), value: company.crNumber },
              {
                label: t("Activity", "النشاط"),
                value: isAr ? company.activityAr : company.activity,
              },
              { label: t("Employees", "الموظفين"), value: company.employees },
            ].map((row) => (
              <div key={String(row.label)}>
                <p className="text-gray-400 text-xs font-medium">{row.label}</p>
                <p className="text-gray-800 font-medium mt-0.5">{row.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Status Timeline */}
        <div className="gov-card mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-6">
            {t("Application Timeline", "الجدول الزمني للطلب")}
          </h2>

          <div className="relative">
            {STATUS_TIMELINE.map((item, index) => {
              const isLast = index === STATUS_TIMELINE.length - 1;
              return (
                <div key={index} className="flex gap-4 relative">
                  {/* Icon */}
                  {stepIcon(item.status)}

                  {/* Connector line */}
                  {!isLast && (
                    <div
                      className={`absolute ${isAr ? "right-4" : "left-4"} top-8 bottom-0 w-0.5 ${
                        item.status === "completed"
                          ? "bg-green-300"
                          : "bg-gray-200"
                      }`}
                      style={{ height: "calc(100% - 32px)" }}
                    />
                  )}

                  {/* Content */}
                  <div className="flex-1 pb-6">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p
                        className={`text-sm font-semibold ${
                          item.status === "completed"
                            ? "text-green-700"
                            : item.status === "in-progress"
                              ? "text-blue-700"
                              : "text-gray-400"
                        }`}
                      >
                        {isAr ? item.stepAr : item.step}
                      </p>
                      {item.date && (
                        <p className="text-xs text-gray-400">
                          {isAr ? item.dateAr : item.date}
                        </p>
                      )}
                    </div>
                    {item.status === "in-progress" && (
                      <p className="text-xs text-blue-500 mt-1">
                        {t(
                          "In Progress — expected within 2-3 business days",
                          "جاري المعالجة — متوقع خلال 2-3 أيام عمل"
                        )}
                      </p>
                    )}
                    {item.status === "pending" && (
                      <p className="text-xs text-gray-400 mt-1">
                        {t("Pending previous step completion", "في انتظار اكتمال الخطوة السابقة")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleDownloadReceipt}
            className="gov-btn-secondary flex items-center justify-center gap-2"
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
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            {t("Download Receipt", "تنزيل الإيصال")}
          </button>
          <Link href="/dashboard" className="gov-btn-primary text-center">
            {t("Return to Home", "العودة إلى الرئيسية")}
          </Link>
        </div>
      </div>
    </div>
  );
}
