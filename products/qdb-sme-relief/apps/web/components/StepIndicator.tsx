"use client";

import { useLang } from "@/lib/language-context";
import { APPLICATION_STEPS } from "@/lib/mock-data";

interface StepIndicatorProps {
  currentStep: number;
}

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  const { isAr, t } = useLang();

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-center">
        {APPLICATION_STEPS.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isLast = index === APPLICATION_STEPS.length - 1;

          return (
            <div key={step.key} className="flex items-center">
              {/* Step bubble + label */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all ${
                    isCompleted
                      ? "bg-green-600 border-green-600 text-white"
                      : isCurrent
                        ? "bg-qdb-navy border-qdb-navy text-white"
                        : "bg-white border-gray-300 text-gray-400"
                  }`}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isCompleted ? (
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`mt-1 text-xs font-medium hidden sm:block text-center max-w-[80px] ${
                    isCurrent
                      ? "text-qdb-navy font-semibold"
                      : isCompleted
                        ? "text-green-600"
                        : "text-gray-400"
                  }`}
                >
                  {isAr ? step.labelAr : step.label}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={`h-0.5 w-8 sm:w-16 mx-1 ${
                    isCompleted ? "bg-green-600" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
      {/* Mobile: current step label */}
      <p className="sm:hidden text-center text-sm font-medium text-qdb-navy mt-2">
        {t(
          `Step ${currentStep + 1}: ${APPLICATION_STEPS[currentStep]?.label || ""}`,
          `الخطوة ${currentStep + 1}: ${APPLICATION_STEPS[currentStep]?.labelAr || ""}`
        )}
      </p>
    </div>
  );
}
