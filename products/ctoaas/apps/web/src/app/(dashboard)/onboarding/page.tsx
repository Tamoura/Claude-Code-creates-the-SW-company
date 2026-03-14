"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import { StepIndicator } from "@/components/onboarding/StepIndicator";
import { Step1CompanyBasics } from "@/components/onboarding/Step1CompanyBasics";
import { Step2TechStack } from "@/components/onboarding/Step2TechStack";
import { Step3Challenges } from "@/components/onboarding/Step3Challenges";
import { Step4Preferences } from "@/components/onboarding/Step4Preferences";
import type { Step1FormData } from "@/lib/validations/onboarding";
import type { Step2FormData } from "@/lib/validations/onboarding";
import type { Step4FormData } from "@/lib/validations/onboarding";

interface OnboardingState {
  currentStep: number;
  completedSteps: number[];
  stepData: Record<string, unknown>;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCurrentStep() {
      const result = await apiClient.get<OnboardingState>(
        "/onboarding/step/current"
      );
      if (result.success && result.data) {
        setState(result.data);
      } else {
        setState({
          currentStep: 1,
          completedSteps: [],
          stepData: {},
        });
      }
      setIsLoading(false);
    }
    fetchCurrentStep();
  }, []);

  const saveStep = useCallback(
    async (step: number, data: unknown) => {
      await apiClient.put(`/onboarding/step/${step}`, data);
    },
    []
  );

  const advanceStep = useCallback(
    (fromStep: number) => {
      setState((prev) => {
        if (!prev) return prev;
        const newCompleted = prev.completedSteps.includes(fromStep)
          ? prev.completedSteps
          : [...prev.completedSteps, fromStep];
        return {
          ...prev,
          currentStep: fromStep + 1,
          completedSteps: newCompleted,
        };
      });
    },
    []
  );

  const goBack = useCallback(() => {
    setState((prev) => {
      if (!prev || prev.currentStep <= 1) return prev;
      return { ...prev, currentStep: prev.currentStep - 1 };
    });
  }, []);

  const handleSkip = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev;
      return { ...prev, currentStep: prev.currentStep + 1 };
    });
  }, []);

  const handleStep1 = useCallback(
    async (data: Step1FormData) => {
      await saveStep(1, data);
      advanceStep(1);
    },
    [saveStep, advanceStep]
  );

  const handleStep2 = useCallback(
    async (data: Step2FormData) => {
      await saveStep(2, data);
      advanceStep(2);
    },
    [saveStep, advanceStep]
  );

  const handleStep3 = useCallback(
    async (data: { challenges: string[]; customChallenges: string[] }) => {
      await saveStep(3, data);
      advanceStep(3);
    },
    [saveStep, advanceStep]
  );

  const handleStep4 = useCallback(
    async (data: Step4FormData) => {
      await saveStep(4, data);
      await apiClient.put("/onboarding/complete");
      router.push("/dashboard");
    },
    [saveStep, router]
  );

  if (isLoading || !state) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const progressPercent = Math.round(
    ((state.currentStep - 1) / 4) * 100
  );

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress bar */}
      <div
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Onboarding progress"
        className="w-full h-1.5 bg-gray-200 rounded-full mb-8 overflow-hidden"
      >
        <div
          className="h-full bg-indigo-600 rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Step indicator */}
      <div className="mb-8">
        <StepIndicator
          currentStep={state.currentStep}
          completedSteps={state.completedSteps}
        />
      </div>

      {/* Step content */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        {state.currentStep === 1 && (
          <Step1CompanyBasics
            onSubmit={handleStep1}
            initialData={
              state.stepData["1"] as Record<string, unknown> | undefined
            }
          />
        )}

        {state.currentStep === 2 && (
          <>
            <Step2TechStack
              onSubmit={handleStep2}
              onBack={goBack}
              initialData={
                state.stepData["2"] as Record<string, unknown> | undefined
              }
            />
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={handleSkip}
                className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-2 py-1"
              >
                Skip
              </button>
            </div>
          </>
        )}

        {state.currentStep === 3 && (
          <>
            <Step3Challenges
              onSubmit={handleStep3}
              onBack={goBack}
              initialData={
                state.stepData["3"] as Record<string, unknown> | undefined
              }
            />
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={handleSkip}
                className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-2 py-1"
              >
                Skip
              </button>
            </div>
          </>
        )}

        {state.currentStep === 4 && (
          <>
            <Step4Preferences
              onSubmit={handleStep4}
              onBack={goBack}
              initialData={
                state.stepData["4"] as Record<string, unknown> | undefined
              }
            />
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={handleSkip}
                className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-2 py-1"
              >
                Skip
              </button>
            </div>
          </>
        )}
      </div>

      {/* Step label */}
      <p className="text-center text-sm text-gray-500 mt-4">
        Step {state.currentStep} of 4
      </p>
    </div>
  );
}
