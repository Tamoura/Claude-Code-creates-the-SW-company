"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import StepIndicator from "@/components/StepIndicator";
import { useLang } from "@/lib/language-context";
import { useApp } from "@/lib/app-context";
import { ELIGIBLE_COMPANY, INELIGIBLE_COMPANY } from "@/lib/mock-data";

export default function CompanyVerificationPage() {
  const { t, isAr } = useLang();
  const { setCompany, setStep } = useApp();
  const router = useRouter();

  const [crNumber, setCrNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [companyData, setCompanyData] = useState<
    typeof ELIGIBLE_COMPANY | typeof INELIGIBLE_COMPANY | null
  >(null);
  const [scenario, setScenario] = useState<"eligible" | "ineligible">("eligible");

  const handleFetch = (useIneligible = false) => {
    const targetScenario = useIneligible ? "ineligible" : "eligible";
    setScenario(targetScenario);
    setIsLoading(true);
    setCompanyData(null);

    setTimeout(() => {
      const data = useIneligible ? INELIGIBLE_COMPANY : ELIGIBLE_COMPANY;
      setCompanyData(data);
      setCrNumber(data.crNumber);
      setIsLoading(false);
    }, 1500);
  };

  const handleConfirm = () => {
    if (!companyData) return;
    setCompany(companyData as typeof ELIGIBLE_COMPANY);
    setStep(2);
    router.push("/apply/eligibility");
  };

  const isEligible = companyData?.isEligible ?? true;

  return (
    <div className="step-page">
      <Header showUser />

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Step indicator */}
        <div className="gov-card mb-6">
          <StepIndicator currentStep={1} />
        </div>

        <div className="gov-card">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-qdb-navy">
              {t("Company Verification", "التحقق من الشركة")}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {t(
                "Enter your Commercial Registration number to verify your company details",
                "أدخل رقم السجل التجاري للتحقق من تفاصيل شركتك"
              )}
            </p>
          </div>

          {/* CR Input */}
          <div className="mb-4">
            <label
              htmlFor="cr-number"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t(
                "Commercial Registration Number",
                "رقم السجل التجاري"
              )}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="flex gap-3">
              <input
                id="cr-number"
                type="text"
                value={crNumber}
                onChange={(e) => setCrNumber(e.target.value)}
                placeholder={t("e.g., 12345", "مثال: 12345")}
                className="gov-input flex-1"
                aria-describedby="cr-help"
              />
              <button
                onClick={() => handleFetch(false)}
                disabled={isLoading || (!crNumber && scenario === "eligible")}
                className="gov-btn-primary whitespace-nowrap"
              >
                {isLoading
                  ? t("Loading...", "جاري التحميل...")
                  : t("Fetch Details", "جلب التفاصيل")}
              </button>
            </div>
            <p id="cr-help" className="text-xs text-gray-400 mt-1">
              {t(
                "Your CR number can be found on your commercial registration certificate",
                "رقم السجل التجاري موجود في شهادة التسجيل التجاري"
              )}
            </p>
          </div>

          {/* Try ineligible link */}
          <button
            onClick={() => handleFetch(true)}
            className="text-xs text-gray-400 hover:text-red-500 underline transition-colors"
          >
            {t(
              "Try ineligible company scenario (demo)",
              "جرب سيناريو الشركة غير المؤهلة (تجريبي)"
            )}
          </button>

          {/* Loading state */}
          {isLoading && (
            <div className="mt-8 flex flex-col items-center gap-3 py-8">
              <div className="spinner" />
              <p className="text-gray-500 text-sm">
                {t(
                  "Fetching company details from Ministry of Commerce...",
                  "جاري جلب تفاصيل الشركة من وزارة التجارة..."
                )}
              </p>
            </div>
          )}

          {/* Company data */}
          {companyData && !isLoading && (
            <div className="mt-6">
              <div
                className={`rounded-lg border-2 p-4 ${
                  isEligible
                    ? "border-green-200 bg-green-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <div className="flex items-center gap-2 mb-4">
                  {isEligible ? (
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
                  ) : (
                    <svg
                      className="w-5 h-5 text-red-500"
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
                  )}
                  <h3
                    className={`font-semibold ${isEligible ? "text-green-800" : "text-red-700"}`}
                  >
                    {t("Company Details Found", "تم العثور على تفاصيل الشركة")}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    {
                      label: t("Company Name", "اسم الشركة"),
                      value: isAr
                        ? companyData.companyNameAr
                        : companyData.companyName,
                    },
                    {
                      label: t("CR Number", "رقم السجل التجاري"),
                      value: companyData.crNumber,
                    },
                    {
                      label: t("CR Expiry", "انتهاء السجل التجاري"),
                      value: (
                        <span
                          className={
                            !isEligible && companyData.status === "Expired"
                              ? "text-red-600 font-semibold"
                              : ""
                          }
                        >
                          {companyData.crExpiry}
                        </span>
                      ),
                    },
                    {
                      label: t("Activity", "النشاط"),
                      value: isAr ? companyData.activityAr : companyData.activity,
                    },
                    {
                      label: t("Capital", "رأس المال"),
                      value: companyData.capital,
                    },
                    {
                      label: t("Status", "الحالة"),
                      value: (
                        <span
                          className={`font-semibold ${
                            companyData.status === "Active"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {isAr ? companyData.statusAr : companyData.status}
                        </span>
                      ),
                    },
                    {
                      label: t("Authorized Signatory", "المفوض بالتوقيع"),
                      value: isAr
                        ? companyData.authorizedSignatoryAr
                        : companyData.authorizedSignatory,
                    },
                    {
                      label: t("Employees", "الموظفين"),
                      value: companyData.employees,
                    },
                  ].map((row) => (
                    <div key={String(row.label)} className="col-span-2 sm:col-span-1">
                      <p className="text-gray-500 text-xs font-medium">
                        {row.label}
                      </p>
                      <p className="text-gray-900 font-medium mt-0.5">
                        {row.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className={`mt-4 flex ${isAr ? "justify-start" : "justify-end"}`}>
                <button
                  onClick={handleConfirm}
                  className="gov-btn-primary flex items-center gap-2"
                >
                  {t("Confirm & Continue", "تأكيد والمتابعة")}
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
          )}
        </div>
      </div>
    </div>
  );
}
