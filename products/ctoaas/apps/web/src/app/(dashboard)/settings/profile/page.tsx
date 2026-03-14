"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  companyProfileSchema,
  type CompanyProfileFormData,
  INDUSTRY_OPTIONS,
  EMPLOYEE_COUNT_OPTIONS,
  GROWTH_STAGE_OPTIONS,
  CLOUD_PROVIDER_OPTIONS,
} from "@/lib/validations/settings";
import { apiClient } from "@/lib/api";

interface CompanyProfile {
  companyName: string;
  industry: string;
  employeeCount: string;
  growthStage: string;
  languages: string;
  frameworks: string;
  databases: string;
  cloudProvider: string;
  architectureNotes: string;
  currentChallenges: string;
}

function calculateCompleteness(data: CompanyProfileFormData): number {
  const fields: (keyof CompanyProfileFormData)[] = [
    "companyName",
    "industry",
    "employeeCount",
    "growthStage",
    "languages",
    "frameworks",
    "databases",
    "cloudProvider",
    "architectureNotes",
    "currentChallenges",
  ];
  const filled = fields.filter((field) => {
    const value = data[field];
    return typeof value === "string" && value.trim().length > 0;
  });
  return Math.round((filled.length / fields.length) * 100);
}

export default function ProfileSettingsPage() {
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
    watch,
    formState: { errors },
  } = useForm<CompanyProfileFormData>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: {
      companyName: "",
      industry: "",
      employeeCount: "",
      growthStage: "",
      languages: "",
      frameworks: "",
      databases: "",
      cloudProvider: "",
      architectureNotes: "",
      currentChallenges: "",
    },
  });

  const watchedValues = watch();
  const completeness = calculateCompleteness(watchedValues);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    const result = await apiClient.get<CompanyProfile>(
      "/profile/company"
    );
    if (result.success && result.data) {
      reset({
        companyName: result.data.companyName || "",
        industry: result.data.industry || "",
        employeeCount: result.data.employeeCount || "",
        growthStage: result.data.growthStage || "",
        languages: result.data.languages || "",
        frameworks: result.data.frameworks || "",
        databases: result.data.databases || "",
        cloudProvider: result.data.cloudProvider || "",
        architectureNotes: result.data.architectureNotes || "",
        currentChallenges: result.data.currentChallenges || "",
      });
    }
    setIsLoading(false);
  }, [reset]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const onSubmit = async (data: CompanyProfileFormData) => {
    setServerError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const result = await apiClient.put("/profile/company", data);
      if (result.success) {
        setSuccessMessage("Profile updated successfully.");
      } else {
        setServerError(
          result.error?.message || "Failed to update profile."
        );
      }
    } catch {
      setServerError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName = (hasError: boolean) =>
    `w-full px-3 py-2 border rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[48px] ${
      hasError ? "border-red-500" : "border-gray-300"
    }`;

  if (isLoading) {
    return (
      <div className="space-y-6">
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
      {/* Profile completeness */}
      <div className="bg-background rounded-xl p-6 border border-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-foreground">
            Profile completeness
          </h2>
          <span className="text-sm font-semibold text-indigo-600">
            {completeness}%
          </span>
        </div>
        <div
          className="w-full bg-gray-200 rounded-full h-2.5"
          role="progressbar"
          aria-valuenow={completeness}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Profile completeness"
        >
          <div
            className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${completeness}%` }}
          />
        </div>
      </div>

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
        {/* Company Information */}
        <div className="bg-background rounded-xl p-6 border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Company Information
          </h2>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="companyName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Company name
              </label>
              <input
                id="companyName"
                type="text"
                aria-invalid={errors.companyName ? "true" : "false"}
                aria-describedby={
                  errors.companyName
                    ? "companyName-error"
                    : undefined
                }
                className={inputClassName(!!errors.companyName)}
                placeholder="Acme Inc."
                {...register("companyName")}
              />
              {errors.companyName && (
                <p
                  id="companyName-error"
                  role="alert"
                  className="text-red-600 text-sm mt-1"
                >
                  {errors.companyName.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="industry"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Industry
                </label>
                <select
                  id="industry"
                  aria-invalid={errors.industry ? "true" : "false"}
                  aria-describedby={
                    errors.industry ? "industry-error" : undefined
                  }
                  className={inputClassName(!!errors.industry)}
                  {...register("industry")}
                >
                  <option value="">Select industry</option>
                  {INDUSTRY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                {errors.industry && (
                  <p
                    id="industry-error"
                    role="alert"
                    className="text-red-600 text-sm mt-1"
                  >
                    {errors.industry.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="employeeCount"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Employee count
                </label>
                <select
                  id="employeeCount"
                  aria-invalid={
                    errors.employeeCount ? "true" : "false"
                  }
                  aria-describedby={
                    errors.employeeCount
                      ? "employeeCount-error"
                      : undefined
                  }
                  className={inputClassName(!!errors.employeeCount)}
                  {...register("employeeCount")}
                >
                  <option value="">Select range</option>
                  {EMPLOYEE_COUNT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                {errors.employeeCount && (
                  <p
                    id="employeeCount-error"
                    role="alert"
                    className="text-red-600 text-sm mt-1"
                  >
                    {errors.employeeCount.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="growthStage"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Growth stage
              </label>
              <select
                id="growthStage"
                aria-invalid={errors.growthStage ? "true" : "false"}
                aria-describedby={
                  errors.growthStage
                    ? "growthStage-error"
                    : undefined
                }
                className={inputClassName(!!errors.growthStage)}
                {...register("growthStage")}
              >
                <option value="">Select stage</option>
                {GROWTH_STAGE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {errors.growthStage && (
                <p
                  id="growthStage-error"
                  role="alert"
                  className="text-red-600 text-sm mt-1"
                >
                  {errors.growthStage.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="bg-background rounded-xl p-6 border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Tech Stack
          </h2>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="languages"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Programming languages
              </label>
              <input
                id="languages"
                type="text"
                className={inputClassName(false)}
                placeholder="TypeScript, Python, Go"
                {...register("languages")}
              />
              <p className="text-gray-500 text-xs mt-1">
                Comma-separated list
              </p>
            </div>

            <div>
              <label
                htmlFor="frameworks"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Frameworks
              </label>
              <input
                id="frameworks"
                type="text"
                className={inputClassName(false)}
                placeholder="React, Next.js, Fastify"
                {...register("frameworks")}
              />
              <p className="text-gray-500 text-xs mt-1">
                Comma-separated list
              </p>
            </div>

            <div>
              <label
                htmlFor="databases"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Databases
              </label>
              <input
                id="databases"
                type="text"
                className={inputClassName(false)}
                placeholder="PostgreSQL, Redis, MongoDB"
                {...register("databases")}
              />
              <p className="text-gray-500 text-xs mt-1">
                Comma-separated list
              </p>
            </div>

            <div>
              <label
                htmlFor="cloudProvider"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Cloud provider
              </label>
              <select
                id="cloudProvider"
                className={inputClassName(false)}
                {...register("cloudProvider")}
              >
                <option value="">Select provider</option>
                {CLOUD_PROVIDER_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Architecture & Challenges */}
        <div className="bg-background rounded-xl p-6 border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Architecture & Challenges
          </h2>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="architectureNotes"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Architecture notes
              </label>
              <textarea
                id="architectureNotes"
                rows={4}
                aria-invalid={
                  errors.architectureNotes ? "true" : "false"
                }
                aria-describedby={
                  errors.architectureNotes
                    ? "architectureNotes-error"
                    : undefined
                }
                className={`${inputClassName(
                  !!errors.architectureNotes
                )} min-h-[100px]`}
                placeholder="Describe your current architecture (e.g., monolith, microservices, serverless)"
                {...register("architectureNotes")}
              />
              {errors.architectureNotes && (
                <p
                  id="architectureNotes-error"
                  role="alert"
                  className="text-red-600 text-sm mt-1"
                >
                  {errors.architectureNotes.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="currentChallenges"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Current challenges
              </label>
              <textarea
                id="currentChallenges"
                rows={4}
                aria-invalid={
                  errors.currentChallenges ? "true" : "false"
                }
                aria-describedby={
                  errors.currentChallenges
                    ? "currentChallenges-error"
                    : undefined
                }
                className={`${inputClassName(
                  !!errors.currentChallenges
                )} min-h-[100px]`}
                placeholder="What technical challenges is your team facing?"
                {...register("currentChallenges")}
              />
              {errors.currentChallenges && (
                <p
                  id="currentChallenges-error"
                  role="alert"
                  className="text-red-600 text-sm mt-1"
                >
                  {errors.currentChallenges.message}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-indigo-600 text-white py-2.5 px-6 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] transition-colors"
          >
            {isSubmitting ? "Saving..." : "Save profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
