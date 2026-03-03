"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import StepIndicator from "@/components/StepIndicator";
import { useLang } from "@/lib/language-context";
import { useApp } from "@/lib/app-context";

export default function NrgpCheckPage() {
  const { t, isAr } = useLang();
  const { state, toggleNrgpForDemo, setStep } = useApp();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [showResult, setShowResult] = useState(false);

  const isNrgpListed = state.isNrgpListed;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      setShowResult(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleContinue = () => {
    setStep(3);
    router.push("/apply/documents");
  };

  const handleToggleDemo = () => {
    toggleNrgpForDemo();
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
            {t("NRGP Program Check", "التحقق من برنامج NRGP")}
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            {t(
              "We're checking if your company has participated in a previous NRGP cycle to determine your disbursement route.",
              "نتحقق مما إذا كانت شركتك قد شاركت في دورة NRGP سابقة لتحديد مسار الصرف."
            )}
          </p>

          {/* Loading */}
          {isLoading && (
            <div className="py-16 flex flex-col items-center gap-4">
              <div className="spinner" />
              <p className="text-gray-500 text-sm">
                {t(
                  "Checking NRGP Program records...",
                  "جاري التحقق من سجلات برنامج NRGP..."
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
                {isNrgpListed
                  ? t(
                      "Switch to manual review scenario (demo)",
                      "التبديل إلى سيناريو المراجعة اليدوية (تجريبي)"
                    )
                  : t(
                      "Switch to auto disbursement scenario (demo)",
                      "التبديل إلى سيناريو الصرف التلقائي (تجريبي)"
                    )}
              </button>

              {/* Scenario A — NRGP Listed */}
              {isNrgpListed && (
                <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-6 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg
                        className="w-5 h-5 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-blue-800">
                        {t(
                          "Previous NRGP Beneficiary Found",
                          "تم العثور على مستفيد سابق من NRGP"
                        )}
                      </h2>
                      <p className="text-blue-700 text-sm mt-2">
                        {t(
                          "Your company participated in a previous NRGP cycle. Your disbursement will be processed automatically once documents are verified.",
                          "شاركت شركتك في دورة NRGP سابقة. سيتم معالجة صرف مبلغك تلقائياً بمجرد التحقق من المستندات."
                        )}
                      </p>

                      <div className="mt-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-blue-700">
                          <svg
                            className="w-4 h-4 text-blue-500"
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
                          {t(
                            "Route: Automatic Disbursement",
                            "المسار: الصرف التلقائي"
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-blue-700">
                          <svg
                            className="w-4 h-4 text-blue-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          {t(
                            "Estimated processing: 2-3 business days",
                            "الوقت المقدر للمعالجة: 2-3 أيام عمل"
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-blue-700">
                          <svg
                            className="w-4 h-4 text-blue-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                            />
                          </svg>
                          {t(
                            "Previous NRGP Cycle: 2021-2022",
                            "دورة NRGP السابقة: 2021-2022"
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Scenario B — Not in NRGP */}
              {!isNrgpListed && (
                <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-6 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg
                        className="w-5 h-5 text-amber-600"
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
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-amber-800">
                        {t(
                          "New Application — Manual Review Required",
                          "طلب جديد — مراجعة يدوية مطلوبة"
                        )}
                      </h2>
                      <p className="text-amber-700 text-sm mt-2">
                        {t(
                          "Your company will be reviewed by a QDB relationship manager. You will be contacted within 5 business days.",
                          "ستتم مراجعة شركتك من قِبل مدير علاقات من QDB. سيتم التواصل معك في غضون 5 أيام عمل."
                        )}
                      </p>

                      <div className="mt-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-amber-700">
                          <svg
                            className="w-4 h-4 text-amber-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                          {t(
                            "Route: Manual Review by QDB Relationship Manager",
                            "المسار: مراجعة يدوية من مدير العلاقات في QDB"
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-amber-700">
                          <svg
                            className="w-4 h-4 text-amber-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          {t(
                            "Expected contact: within 5 business days",
                            "التواصل المتوقع: خلال 5 أيام عمل"
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-amber-700">
                          <svg
                            className="w-4 h-4 text-amber-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          {t(
                            "A QDB officer will review your documents and contact you",
                            "سيقوم موظف QDB بمراجعة مستنداتك والتواصل معك"
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Disbursement type badge */}
              <div className="flex items-center gap-2 mb-6 p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600 font-medium">
                  {t("Disbursement Route:", "مسار الصرف:")}
                </span>
                <span
                  className={isNrgpListed ? "badge-auto" : "badge-manual"}
                >
                  {isNrgpListed
                    ? t("Auto Disbursement", "صرف تلقائي")
                    : t("Manual Review", "مراجعة يدوية")}
                </span>
              </div>

              <div className={`flex ${isAr ? "justify-start" : "justify-end"}`}>
                <button
                  onClick={handleContinue}
                  className="gov-btn-primary flex items-center gap-2"
                >
                  {t("Continue to Document Upload", "المتابعة إلى رفع المستندات")}
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
