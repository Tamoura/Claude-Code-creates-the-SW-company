"use client";

import { cn } from "@/lib/utils";

const STEP_NAMES = [
  "Company Basics",
  "Tech Stack",
  "Challenges",
  "Preferences",
] as const;

interface StepIndicatorProps {
  currentStep: number;
  completedSteps: number[];
}

export function StepIndicator({
  currentStep,
  completedSteps,
}: StepIndicatorProps) {
  return (
    <nav
      aria-label="Onboarding progress"
      className="w-full"
    >
      <ol className="flex items-center justify-between">
        {STEP_NAMES.map((name, index) => {
          const stepNum = index + 1;
          const isCompleted = completedSteps.includes(stepNum);
          const isActive = currentStep === stepNum;

          return (
            <li
              key={stepNum}
              className="flex flex-col items-center flex-1 relative"
            >
              {/* Connector line */}
              {index > 0 && (
                <div
                  className={cn(
                    "absolute top-4 -left-1/2 w-full h-0.5",
                    completedSteps.includes(stepNum - 1)
                      ? "bg-green-500"
                      : "bg-gray-200"
                  )}
                  aria-hidden="true"
                />
              )}

              {/* Circle */}
              <div
                data-testid={`step-circle-${stepNum}`}
                className={cn(
                  "relative z-10 flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium",
                  isCompleted && "bg-green-500 text-white",
                  isActive && !isCompleted && "bg-indigo-600 text-white",
                  !isActive && !isCompleted && "bg-gray-200 text-gray-600"
                )}
              >
                {isCompleted ? (
                  <svg
                    data-testid={`step-check-${stepNum}`}
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  stepNum
                )}
              </div>

              {/* Step name */}
              <span
                className={cn(
                  "mt-2 text-xs font-medium text-center",
                  isActive
                    ? "text-indigo-600"
                    : isCompleted
                      ? "text-green-600"
                      : "text-gray-500"
                )}
              >
                {name}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
