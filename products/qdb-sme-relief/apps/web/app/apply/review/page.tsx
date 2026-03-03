"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import StepIndicator from "@/components/StepIndicator";
import { useLang } from "@/lib/language-context";
import { useApp } from "@/lib/app-context";
import { ELIGIBLE_COMPANY, APPLICATION_REFERENCE } from "@/lib/mock-data";

export default function ReviewPage() {
  const { t, isAr } = useLang();
  const { state, setStep } = useApp();
  const router = useRouter();

  const [declared, setDeclared] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const company = state.company ?? ELIGIBLE_COMPANY;

  const handleSubmit = () => {
    if (!declared) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setStep(5);
      router.push("/apply/confirmation");
    }, 1500);
  };

  const documents = [
    { label: t("WPS File", "ملف WPS"), status: "uploaded" },
    { label: t("Lease Agreement", "عقد الإيجار"), status: "uploaded" },
    { label: t("Rent Invoice", "فاتورة الإيجار"), status: "uploaded" },
    { label: t("CR Copy", "نسخة السجل التجاري"), status: "uploaded" },
    { label: t("Commercial License", "الرخصة التجارية"), status: "uploaded" },
    { label: t("Authorization Letter", "خطاب التفويض"), status: "uploaded" },
  ];

  return (
    <div className="step-page">
      <Header showUser />

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="gov-card mb-6">
          <StepIndicator currentStep={4} />
        </div>

        <div className="gov-card">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-qdb-navy">
              {t("Review & Submit", "المراجعة والتقديم")}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {t(
                "Please review all details before final submission.",
                "يرجى مراجعة جميع التفاصيل قبل التقديم النهائي."
              )}
            </p>
          </div>

          {/* Application reference */}
          <div className="bg-qdb-navy text-white rounded-lg px-4 py-3 mb-6 flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-xs">
                {t("Application Reference", "رقم مرجع الطلب")}
              </p>
              <p className="font-bold font-mono">{APPLICATION_REFERENCE}</p>
            </div>
            <div className="text-right">
              <p className="text-blue-200 text-xs">
                {t("Disbursement Type", "نوع الصرف")}
              </p>
              <span
                className={state.isNrgpListed ? "badge-auto" : "badge-manual"}
              >
                {state.isNrgpListed
                  ? t("Auto Disbursement", "صرف تلقائي")
                  : t("Manual Review", "مراجعة يدوية")}
              </span>
            </div>
          </div>

          {/* Company Details */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {t("Company Details", "تفاصيل الشركة")}
            </h2>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-gray-200">
                {[
                  {
                    label: t("Company Name", "اسم الشركة"),
                    value: isAr
                      ? company.companyNameAr
                      : company.companyName,
                  },
                  {
                    label: t("CR Number", "رقم السجل التجاري"),
                    value: company.crNumber,
                  },
                  {
                    label: t("CR Expiry", "انتهاء السجل التجاري"),
                    value: company.crExpiry,
                  },
                  {
                    label: t("Activity", "النشاط"),
                    value: isAr ? company.activityAr : company.activity,
                  },
                  {
                    label: t("Capital", "رأس المال"),
                    value: company.capital,
                  },
                  {
                    label: t("Employees", "الموظفين"),
                    value: company.employees,
                  },
                  {
                    label: t("Authorized Signatory", "المفوض بالتوقيع"),
                    value: isAr
                      ? company.authorizedSignatoryAr
                      : company.authorizedSignatory,
                  },
                  {
                    label: t("Registration Date", "تاريخ التسجيل"),
                    value: company.registrationDate,
                  },
                ].map((row, i) => (
                  <div
                    key={i}
                    className="p-3 border-b border-gray-200 last:border-b-0"
                  >
                    <p className="text-xs text-gray-400 font-medium">
                      {row.label}
                    </p>
                    <p className="text-sm text-gray-800 font-medium mt-0.5">
                      {row.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {t("Documents Uploaded", "المستندات المرفوعة")}
            </h2>
            <ul className="space-y-2">
              {documents.map((doc) => (
                <li
                  key={doc.label}
                  className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-sm text-gray-700">{doc.label}</span>
                  </div>
                  <span className="text-xs text-green-600 font-medium">
                    {t("Uploaded", "مرفوع")}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Eligibility summary */}
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-green-800 text-sm font-semibold">
                {t(
                  "Eligibility: Confirmed — All criteria met",
                  "الأهلية: مؤكدة — جميع المعايير مستوفاة"
                )}
              </p>
            </div>
          </div>

          {/* Declaration */}
          <div className="border-2 border-gray-200 rounded-lg p-4 mb-6 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              {t("Declaration", "الإقرار")}
            </h2>
            <p className="text-sm text-gray-600 mb-3 leading-relaxed">
              {t(
                "I confirm that all information provided in this application is accurate, complete, and up to date. I understand that providing false information may result in rejection of this application and potential legal consequences. I authorize Qatar Development Bank to verify the submitted information with relevant government entities.",
                "أقر بأن جميع المعلومات المقدمة في هذا الطلب دقيقة وكاملة ومحدّثة. أفهم أن تقديم معلومات كاذبة قد يؤدي إلى رفض هذا الطلب وعواقب قانونية محتملة. أفوّض بنك قطر للتنمية بالتحقق من المعلومات المقدمة مع الجهات الحكومية ذات الصلة."
              )}
            </p>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={declared}
                onChange={(e) => setDeclared(e.target.checked)}
                className="mt-1 w-4 h-4 accent-qdb-navy"
                aria-label={t("I agree to the declaration", "أوافق على الإقرار")}
              />
              <span className="text-sm font-medium text-gray-700">
                {t(
                  "I confirm all information is accurate and I agree to the above declaration.",
                  "أؤكد أن جميع المعلومات دقيقة وأوافق على الإقرار أعلاه."
                )}
              </span>
            </label>
          </div>

          {/* Submit */}
          <div className={`flex ${isAr ? "justify-start" : "justify-end"}`}>
            <button
              onClick={handleSubmit}
              disabled={!declared || isSubmitting}
              className="gov-btn-primary flex items-center gap-2 min-w-[200px] justify-center"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t("Submitting...", "جاري التقديم...")}
                </>
              ) : (
                <>
                  {t("Submit Final Application", "تقديم الطلب النهائي")}
                  <svg
                    className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
