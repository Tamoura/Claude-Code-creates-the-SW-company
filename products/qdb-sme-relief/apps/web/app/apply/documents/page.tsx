"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import StepIndicator from "@/components/StepIndicator";
import DocumentUpload from "@/components/DocumentUpload";
import { useLang } from "@/lib/language-context";
import { useApp } from "@/lib/app-context";
import {
  WPS_VALIDATION_RESULT,
  RENT_VALIDATION_RESULT,
} from "@/lib/mock-data";

interface SectionStatus {
  salary: boolean;
  rent: boolean;
  company: boolean;
  authorization: boolean;
}

export default function DocumentsPage() {
  const { t, isAr } = useLang();
  const { addFile, setStep } = useApp();
  const router = useRouter();

  const [sectionStatus, setSectionStatus] = useState<SectionStatus>({
    salary: false,
    rent: false,
    company: false,
    authorization: false,
  });

  const allSectionsComplete = Object.values(sectionStatus).every(Boolean);

  const markSectionComplete = (section: keyof SectionStatus) => {
    setSectionStatus((prev) => ({ ...prev, [section]: true }));
  };

  const handleSubmit = () => {
    if (!allSectionsComplete) return;
    setStep(4);
    router.push("/apply/review");
  };

  const WpsValidation = () => (
    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
      <p className="font-semibold text-green-800 mb-2">
        {t("WPS Validation Result", "نتيجة التحقق من WPS")}
      </p>
      <ul className="space-y-1">
        {[
          {
            en: `${WPS_VALIDATION_RESULT.employeesVerified} employees verified via WPS`,
            ar: `تم التحقق من ${WPS_VALIDATION_RESULT.employeesVerified} موظف عبر WPS`,
          },
          {
            en: `Last payroll: ${WPS_VALIDATION_RESULT.lastPayroll}`,
            ar: `آخر كشف مرتبات: ${WPS_VALIDATION_RESULT.lastPayrollAr}`,
          },
          {
            en: `Total salary burden: ${WPS_VALIDATION_RESULT.totalSalaryBurden}`,
            ar: `إجمالي عبء الرواتب: ${WPS_VALIDATION_RESULT.totalSalaryBurdenAr}`,
          },
        ].map((item, i) => (
          <li key={i} className="flex items-center gap-2 text-green-700">
            <svg
              className="w-3.5 h-3.5 text-green-600 flex-shrink-0"
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
            {isAr ? item.ar : item.en}
          </li>
        ))}
      </ul>
    </div>
  );

  const RentValidation = () => (
    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
      <p className="font-semibold text-green-800 mb-2">
        {t("Rent Validation Result", "نتيجة التحقق من الإيجار")}
      </p>
      <ul className="space-y-1">
        {[
          {
            en: `Rent amount: ${RENT_VALIDATION_RESULT.rentAmount} — accepted`,
            ar: `مبلغ الإيجار: ${RENT_VALIDATION_RESULT.rentAmountAr} — مقبول`,
          },
          {
            en: `Lease end: ${RENT_VALIDATION_RESULT.leaseEndDate}`,
            ar: `انتهاء عقد الإيجار: ${RENT_VALIDATION_RESULT.leaseEndDate}`,
          },
          {
            en: `Location: ${RENT_VALIDATION_RESULT.location}`,
            ar: `الموقع: ${RENT_VALIDATION_RESULT.locationAr}`,
          },
        ].map((item, i) => (
          <li key={i} className="flex items-center gap-2 text-green-700">
            <svg
              className="w-3.5 h-3.5 text-green-600 flex-shrink-0"
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
            {isAr ? item.ar : item.en}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="step-page">
      <Header showUser />

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="gov-card mb-6">
          <StepIndicator currentStep={3} />
        </div>

        <div className="gov-card">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-qdb-navy">
              {t("Document Upload", "رفع المستندات")}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {t(
                "Please upload all required documents. All fields are mandatory.",
                "يرجى رفع جميع المستندات المطلوبة. جميع الحقول إلزامية."
              )}
            </p>
          </div>

          {/* Progress tracker */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {[
              {
                key: "salary",
                label: t("Salary", "الرواتب"),
              },
              {
                key: "rent",
                label: t("Rent", "الإيجار"),
              },
              {
                key: "company",
                label: t("Company", "الشركة"),
              },
              {
                key: "authorization",
                label: t("Authorization", "التفويض"),
              },
            ].map((s) => {
              const done = sectionStatus[s.key as keyof SectionStatus];
              return (
                <div
                  key={s.key}
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${
                    done
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {done && (
                    <svg
                      className="w-3 h-3"
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
                  )}
                  {s.label}
                </div>
              );
            })}
          </div>

          <div className="space-y-4">
            {/* Section 1: Salary Documents */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-qdb-navy text-white text-xs flex items-center justify-center font-bold">
                  1
                </span>
                <h3 className="font-semibold text-gray-800">
                  {t("Salary Documents", "مستندات الرواتب")}
                </h3>
              </div>
              <DocumentUpload
                sectionKey="wps"
                title="WPS File (Wage Protection System)"
                titleAr="ملف WPS (نظام حماية الأجور)"
                description="Upload your WPS salary file for the last 3 months"
                descriptionAr="ارفع ملف رواتب WPS للأشهر الثلاثة الأخيرة"
                accept=".xlsx,.csv"
                onFileAdded={(f) => {
                  addFile("wps", f);
                  markSectionComplete("salary");
                }}
                validationResult={<WpsValidation />}
              />
            </div>

            {/* Section 2: Rent Documents */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-qdb-navy text-white text-xs flex items-center justify-center font-bold">
                  2
                </span>
                <h3 className="font-semibold text-gray-800">
                  {t("Rent Documents", "مستندات الإيجار")}
                </h3>
              </div>
              <div className="space-y-3">
                <DocumentUpload
                  sectionKey="lease"
                  title="Lease Agreement"
                  titleAr="عقد الإيجار"
                  description="Upload your current lease agreement (PDF)"
                  descriptionAr="ارفع عقد الإيجار الحالي (PDF)"
                  accept=".pdf"
                  onFileAdded={(f) => {
                    addFile("lease", f);
                    markSectionComplete("rent");
                  }}
                  validationResult={<RentValidation />}
                />
                <DocumentUpload
                  sectionKey="rent-invoice"
                  title="Latest Rent Invoice"
                  titleAr="آخر فاتورة إيجار"
                  description="Upload the most recent rent invoice (PDF)"
                  descriptionAr="ارفع أحدث فاتورة إيجار (PDF)"
                  accept=".pdf"
                  onFileAdded={(f) => addFile("rent-invoice", f)}
                />
              </div>
            </div>

            {/* Section 3: Company Documents */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-qdb-navy text-white text-xs flex items-center justify-center font-bold">
                  3
                </span>
                <h3 className="font-semibold text-gray-800">
                  {t("Company Documents", "مستندات الشركة")}
                </h3>
              </div>
              <div className="space-y-3">
                <DocumentUpload
                  sectionKey="cr-copy"
                  title="Commercial Registration Copy"
                  titleAr="نسخة السجل التجاري"
                  accept=".pdf"
                  onFileAdded={(f) => {
                    addFile("cr-copy", f);
                    markSectionComplete("company");
                  }}
                />
                <DocumentUpload
                  sectionKey="commercial-license"
                  title="Commercial License"
                  titleAr="الرخصة التجارية"
                  accept=".pdf"
                  onFileAdded={(f) => addFile("commercial-license", f)}
                />
              </div>
            </div>

            {/* Section 4: Authorization Letter */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-qdb-navy text-white text-xs flex items-center justify-center font-bold">
                  4
                </span>
                <h3 className="font-semibold text-gray-800">
                  {t("Authorization Letter", "خطاب التفويض")}
                </h3>
              </div>
              <DocumentUpload
                sectionKey="authorization"
                title="Signed Authorization Letter"
                titleAr="خطاب التفويض الموقع"
                description="Signed authorization letter from the CR owner / authorized signatory (PDF)"
                descriptionAr="خطاب تفويض موقع من مالك السجل التجاري / المفوض بالتوقيع (PDF)"
                accept=".pdf"
                onFileAdded={(f) => {
                  addFile("authorization", f);
                  markSectionComplete("authorization");
                }}
              />
            </div>
          </div>

          {/* Submit button */}
          <div className="mt-8 border-t border-gray-100 pt-6">
            {!allSectionsComplete && (
              <p className="text-sm text-amber-600 mb-3 flex items-center gap-2">
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
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                {t(
                  "Please upload at least one file in each required section to continue.",
                  "يرجى رفع ملف واحد على الأقل في كل قسم مطلوب للمتابعة."
                )}
              </p>
            )}
            <div className={`flex ${isAr ? "justify-start" : "justify-end"}`}>
              <button
                onClick={handleSubmit}
                disabled={!allSectionsComplete}
                className="gov-btn-primary flex items-center gap-2"
              >
                {t("Submit Application", "تقديم الطلب")}
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
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
