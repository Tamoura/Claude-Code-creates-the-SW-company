"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  preferencesSchema,
  type PreferencesFormData,
  AREAS_OF_INTEREST,
} from "@/lib/validations/settings";
import { apiClient } from "@/lib/api";

const COMMUNICATION_STYLES = [
  {
    value: "concise" as const,
    label: "Concise",
    description: "Brief, to-the-point responses with key takeaways",
  },
  {
    value: "balanced" as const,
    label: "Balanced",
    description:
      "Moderate detail with context and recommendations",
  },
  {
    value: "detailed" as const,
    label: "Detailed",
    description:
      "Comprehensive analysis with full reasoning and alternatives",
  },
];

const RESPONSE_FORMATS = [
  {
    value: "executive-summary" as const,
    label: "Executive summary",
    description:
      "High-level overview suitable for board-level communication",
  },
  {
    value: "technical-deep-dive" as const,
    label: "Technical deep-dive",
    description:
      "In-depth technical analysis with implementation details",
  },
  {
    value: "actionable-recommendations" as const,
    label: "Actionable recommendations",
    description:
      "Focused on specific steps and next actions to take",
  },
];

const DETAIL_LEVELS = [
  {
    value: "high-level" as const,
    label: "High-level",
    description: "Strategic overview without implementation specifics",
  },
  {
    value: "moderate" as const,
    label: "Moderate",
    description:
      "Balance of strategy and implementation guidance",
  },
  {
    value: "granular" as const,
    label: "Granular",
    description:
      "Detailed implementation guidance with code-level specifics",
  },
];

export default function PreferencesSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(
    null
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      communicationStyle: "balanced",
      responseFormat: "actionable-recommendations",
      detailLevel: "moderate",
      areasOfInterest: [],
    },
  });

  const loadPreferences = useCallback(async () => {
    setIsLoading(true);
    const result = await apiClient.get<PreferencesFormData>(
      "/preferences"
    );
    if (result.success && result.data) {
      reset({
        communicationStyle:
          result.data.communicationStyle || "balanced",
        responseFormat:
          result.data.responseFormat ||
          "actionable-recommendations",
        detailLevel: result.data.detailLevel || "moderate",
        areasOfInterest: result.data.areasOfInterest || [],
      });
    }
    setIsLoading(false);
  }, [reset]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const onSubmit = async (data: PreferencesFormData) => {
    setServerError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const result = await apiClient.put("/preferences", data);
      if (result.success) {
        setSuccessMessage("Preferences updated successfully.");
      } else {
        setServerError(
          result.error?.message || "Failed to update preferences."
        );
      }
    } catch {
      setServerError(
        "An unexpected error occurred. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="bg-background rounded-xl p-6 border border-border">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4" />
            <div className="h-10 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-10 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {serverError && (
        <div
          role="alert"
          className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
        >
          {serverError}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm"
        >
          {successMessage}
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6"
        noValidate
      >
        {/* Communication Style */}
        <fieldset className="bg-background rounded-xl p-6 border border-border">
          <legend className="text-lg font-semibold text-foreground mb-4">
            Communication Style
          </legend>
          <div className="space-y-3">
            {COMMUNICATION_STYLES.map((style) => (
              <label
                key={style.value}
                htmlFor={`comm-${style.value}`}
                className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-indigo-300 cursor-pointer has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 transition-colors"
              >
                <input
                  id={`comm-${style.value}`}
                  type="radio"
                  value={style.value}
                  className="mt-1 w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                  {...register("communicationStyle")}
                />
                <div>
                  <span className="block text-sm font-medium text-foreground">
                    {style.label}
                  </span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    {style.description}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Response Format */}
        <fieldset className="bg-background rounded-xl p-6 border border-border">
          <legend className="text-lg font-semibold text-foreground mb-4">
            Response Format
          </legend>
          <div className="space-y-3">
            {RESPONSE_FORMATS.map((format) => (
              <label
                key={format.value}
                htmlFor={`format-${format.value}`}
                className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-indigo-300 cursor-pointer has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 transition-colors"
              >
                <input
                  id={`format-${format.value}`}
                  type="radio"
                  value={format.value}
                  className="mt-1 w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                  {...register("responseFormat")}
                />
                <div>
                  <span className="block text-sm font-medium text-foreground">
                    {format.label}
                  </span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    {format.description}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Detail Level */}
        <fieldset className="bg-background rounded-xl p-6 border border-border">
          <legend className="text-lg font-semibold text-foreground mb-4">
            Detail Level
          </legend>
          <div className="space-y-3">
            {DETAIL_LEVELS.map((level) => (
              <label
                key={level.value}
                htmlFor={`detail-${level.value}`}
                className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-indigo-300 cursor-pointer has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 transition-colors"
              >
                <input
                  id={`detail-${level.value}`}
                  type="radio"
                  value={level.value}
                  className="mt-1 w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                  {...register("detailLevel")}
                />
                <div>
                  <span className="block text-sm font-medium text-foreground">
                    {level.label}
                  </span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    {level.description}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Areas of Interest */}
        <fieldset className="bg-background rounded-xl p-6 border border-border">
          <legend className="text-lg font-semibold text-foreground mb-4">
            Areas of Interest
          </legend>
          {errors.areasOfInterest && (
            <p
              role="alert"
              className="text-red-600 text-sm mb-3"
            >
              {errors.areasOfInterest.message}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AREAS_OF_INTEREST.map((area) => (
              <label
                key={area}
                htmlFor={`area-${area}`}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-indigo-300 cursor-pointer has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 transition-colors"
              >
                <input
                  id={`area-${area}`}
                  type="checkbox"
                  value={area}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  {...register("areasOfInterest")}
                />
                <span className="text-sm font-medium text-foreground">
                  {area}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-indigo-600 text-white py-2.5 px-6 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] transition-colors"
          >
            {isSubmitting ? "Saving..." : "Save preferences"}
          </button>
        </div>
      </form>
    </div>
  );
}
