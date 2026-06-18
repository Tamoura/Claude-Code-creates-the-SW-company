"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  step1Schema,
  type Step1FormData,
  INDUSTRY_OPTIONS,
  EMPLOYEE_COUNT_OPTIONS,
  GROWTH_STAGE_OPTIONS,
} from "@/lib/validations/onboarding";

interface Step1CompanyBasicsProps {
  onSubmit: (data: Step1FormData) => void;
  initialData?: Partial<Step1FormData>;
}

export function Step1CompanyBasics({
  onSubmit,
  initialData,
}: Step1CompanyBasicsProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Step1FormData>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      industry: initialData?.industry ?? "",
      employeeCount: initialData?.employeeCount ?? "",
      growthStage: initialData?.growthStage ?? "",
      foundedYear: initialData?.foundedYear,
    },
  });

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">
        Company Basics
      </h2>
      <p className="text-gray-500 text-sm mb-6">
        Tell us about your company so we can tailor our advisory.
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        {/* Industry */}
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
            className={`w-full px-3 py-2 border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[48px] ${
              errors.industry ? "border-red-500" : "border-gray-300"
            }`}
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

        {/* Employee Count */}
        <div>
          <label
            htmlFor="employeeCount"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Employee count
          </label>
          <select
            id="employeeCount"
            aria-invalid={errors.employeeCount ? "true" : "false"}
            aria-describedby={
              errors.employeeCount ? "employeeCount-error" : undefined
            }
            className={`w-full px-3 py-2 border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[48px] ${
              errors.employeeCount
                ? "border-red-500"
                : "border-gray-300"
            }`}
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

        {/* Growth Stage */}
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
              errors.growthStage ? "growthStage-error" : undefined
            }
            className={`w-full px-3 py-2 border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[48px] ${
              errors.growthStage ? "border-red-500" : "border-gray-300"
            }`}
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

        {/* Founded Year */}
        <div>
          <label
            htmlFor="foundedYear"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Founded year (optional)
          </label>
          <input
            id="foundedYear"
            type="number"
            min={1900}
            max={new Date().getFullYear()}
            aria-invalid={errors.foundedYear ? "true" : "false"}
            aria-describedby={
              errors.foundedYear ? "foundedYear-error" : undefined
            }
            className={`w-full px-3 py-2 border rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[48px] ${
              errors.foundedYear ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="e.g. 2020"
            {...register("foundedYear", { valueAsNumber: true })}
          />
          {errors.foundedYear && (
            <p
              id="foundedYear-error"
              role="alert"
              className="text-red-600 text-sm mt-1"
            >
              {errors.foundedYear.message}
            </p>
          )}
        </div>

        <div className="pt-4">
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 min-h-[48px] transition-colors"
          >
            Next
          </button>
        </div>
      </form>
    </div>
  );
}
