"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  step2Schema,
  type Step2FormData,
  LANGUAGE_OPTIONS,
  FRAMEWORK_OPTIONS,
  DATABASE_OPTIONS,
  CLOUD_PROVIDER_OPTIONS,
} from "@/lib/validations/onboarding";
import { SearchableMultiSelect } from "./SearchableMultiSelect";

interface Step2TechStackProps {
  onSubmit: (data: Step2FormData) => void;
  onBack: () => void;
  initialData?: Partial<Step2FormData>;
}

export function Step2TechStack({
  onSubmit,
  onBack,
  initialData,
}: Step2TechStackProps) {
  const [languages, setLanguages] = useState<string[]>(
    initialData?.languages ?? []
  );
  const [frameworks, setFrameworks] = useState<string[]>(
    initialData?.frameworks ?? []
  );
  const [databases, setDatabases] = useState<string[]>(
    initialData?.databases ?? []
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Step2FormData>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      cloudProvider: initialData?.cloudProvider ?? "",
      architectureNotes: initialData?.architectureNotes ?? "",
      languages: initialData?.languages ?? [],
      frameworks: initialData?.frameworks ?? [],
      databases: initialData?.databases ?? [],
    },
  });

  const onFormSubmit = (data: Step2FormData) => {
    onSubmit({
      ...data,
      languages,
      frameworks,
      databases,
    });
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">
        Tech Stack
      </h2>
      <p className="text-gray-500 text-sm mb-6">
        What technologies does your team work with?
      </p>

      <form
        onSubmit={handleSubmit(onFormSubmit)}
        className="space-y-4"
        noValidate
      >
        {/* Languages */}
        <SearchableMultiSelect
          label="Languages"
          options={LANGUAGE_OPTIONS}
          selected={languages}
          onChange={setLanguages}
          placeholder="Search languages..."
        />

        {/* Frameworks */}
        <SearchableMultiSelect
          label="Frameworks"
          options={FRAMEWORK_OPTIONS}
          selected={frameworks}
          onChange={setFrameworks}
          placeholder="Search frameworks..."
        />

        {/* Databases */}
        <SearchableMultiSelect
          label="Databases"
          options={DATABASE_OPTIONS}
          selected={databases}
          onChange={setDatabases}
          placeholder="Search databases..."
        />

        {/* Cloud Provider */}
        <div>
          <label
            htmlFor="cloudProvider"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Cloud provider
          </label>
          <select
            id="cloudProvider"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[48px]"
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

        {/* Architecture Notes */}
        <div>
          <label
            htmlFor="architectureNotes"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Architecture notes (optional)
          </label>
          <textarea
            id="architectureNotes"
            rows={4}
            maxLength={2000}
            aria-invalid={errors.architectureNotes ? "true" : "false"}
            aria-describedby={
              errors.architectureNotes
                ? "architectureNotes-error"
                : undefined
            }
            className={`w-full px-3 py-2 border rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
              errors.architectureNotes
                ? "border-red-500"
                : "border-gray-300"
            }`}
            placeholder="Describe your architecture..."
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

        <div className="pt-4 flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 bg-white border border-gray-300 text-gray-700 py-2.5 px-4 rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 min-h-[48px] transition-colors"
          >
            Back
          </button>
          <button
            type="submit"
            className="flex-1 bg-indigo-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 min-h-[48px] transition-colors"
          >
            Next
          </button>
        </div>
      </form>
    </div>
  );
}
