"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import StepIndicator from "@/components/StepIndicator";
import { useLang } from "@/lib/language-context";
import { useApp } from "@/lib/app-context";
import {
  ELIGIBLE_CRITERIA,
  INELIGIBLE_CRITERIA,
  EligibilityCriterion,
} from "@/lib/mock-data";

export default function EligibilityPage() {
  const { t, isAr } = useLang();
  const { state, setStep } = useApp();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [demoIneligible, setDemoIneligible] = useState(false);

  const company = state.company;
  const isEligible = company ? company.isEligible && !demoIneligible : true;
  const criteria: EligibilityCriterion[] = demoIneligible
    ? INELIGIBLE_CRITERIA
    : ELIGIBLE_CRITERIA;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      setShowResult(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []); // intentional: run once on mount

  const handleContinue = () => {
    setStep(2);
    router.push("/apply/nrgp-check");
  };

  const handleToggleDemo = () => {
    setDemoIneligible((prev) => !prev);
  };

  return (
    <div className="step-page">
      <Header showUser />

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="gov-card mb-6">
          <StepIndicator currentStep={2} />
        </div>

        <div className="gov-card">
          <h1 className="text-xl font-bold text-qdb-navy mb-2">
            {t("Eligibility Check", "التحقق من الأهلية")}
          </h1>

          {/* Loading */}
          {isLoading && (
            <div className="py-16 flex flex-col items-center gap-4">
              <div className="spinner" />
              <p className="text-gray-500 text-sm">
                {t(
                  "Checking eligibility against QDB program criteria...",
                  "جاري التحقق من الأهلية وفق معايير برنامج QDB..."
                )}
              </p>
            </div>
          )}

          {/* Result */}
          {showResult && (
            <div>
              {/* Demo toggle */}
              <button
                onClick={handleToggleDemo}
                className="text-xs text-gray-400 hover:text-gray-600 underline transition-colors mb-4 block"
              >
                {demoIneligible
                  ? t(
                      "Switch to eligible scenario (demo)",
                      "التبديل إلى سيناريو مؤهل (تجريبي)"
                    )
                  : t(
                      "Switch to ineligible scenario (demo)",
                      "التبديل إلى سيناريو غير مؤهل (تجريبي)"
                    )}
              </button>

              {/* Result card */}
              <div
                className={`rounded-xl border-2 p-6 mb-6 ${
                  isEligible
                    ? "border-green-200 bg-green-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  {isEligible ? (
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-7 h-7 text-green-600"
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
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-7 h-7 text-red-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </div>
                  )}
                  <div>
                    <h2
                      className={`text-lg font-bold ${
                        isEligible ? "text-green-800" : "text-red-700"
                      }`}
                    >
                      {isEligible
                        ? t(
                            "Your company is eligible for QDB SME Relief Financing",
                            "شركتك مؤهلة للحصول على تمويل دعم المنشآت الصغيرة والمتوسطة من QDB"
                          )
                        : t(
                            "Your company does not meet eligibility criteria",
                            "لا تستوفي شركتك معايير الأهلية"
                          )}
                    </h2>
                    <p
                      className={`text-sm ${isEligible ? "text-green-700" : "text-red-600"}`}
                    >
                      {company
                        ? isAr
                          ? company.companyNameAr
                          : company.companyName
                        : "Al-Noor Trading & Services W.L.L"}
                    </p>
                  </div>
                </div>

                {/* Criteria list */}
                <ul className="space-y-2">
                  {criteria.map((item: EligibilityCriterion, i: number) => {
                    const failed = !item.met;
                    return (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        {item.met ? (
                          <svg
                            className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5"
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
                        ) : (
                          <svg
                            className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        )}
                        <div>
                          <span
                            className={
                              failed
                                ? "text-red-700 font-medium"
                                : "text-gray-700"
                            }
                          >
                            {isAr ? item.criterionAr : item.criterion}
                          </span>
                          {item.reason && (
                            <p className="text-red-500 text-xs mt-0.5">
                              {isAr ? (item.reasonAr ?? item.reason) : item.reason}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Action buttons */}
              {isEligible ? (
                <div className={`flex ${isAr ? "justify-start" : "justify-end"}`}>
                  <button
                    onClick={handleContinue}
                    className="gov-btn-primary flex items-center gap-2"
                  >
                    {t("Continue to Application", "المتابعة إلى الطلب")}
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
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href="tel:+97444561100"
                    className="gov-btn-primary flex items-center justify-center gap-2"
                    onClick={(e) => e.preventDefault()}
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
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    {t("Contact QDB: +974 4456 1100", "التواصل مع QDB: 1100 4456 974+")}
                  </a>
                  <Link href="/dashboard" className="gov-btn-secondary text-center">
                    {t("Return to Home", "العودة إلى الرئيسية")}
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
