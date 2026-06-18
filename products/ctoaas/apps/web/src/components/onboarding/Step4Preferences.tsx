"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  step4Schema,
  type Step4FormData,
  COMMUNICATION_STYLES,
  RESPONSE_FORMATS,
  DETAIL_LEVELS,
  INTEREST_AREAS,
} from "@/lib/validations/onboarding";

interface Step4PreferencesProps {
  onSubmit: (data: Step4FormData) => void;
  onBack: () => void;
  initialData?: Partial<Step4FormData>;
}

export function Step4Preferences({
  onSubmit,
  onBack,
  initialData,
}: Step4PreferencesProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Step4FormData>({
    resolver: zodResolver(step4Schema),
    defaultValues: {
      communicationStyle: initialData?.communicationStyle ?? "",
      responseFormat: initialData?.responseFormat ?? "",
      detailLevel: initialData?.detailLevel ?? "",
      areasOfInterest: initialData?.areasOfInterest ?? [],
    },
  });

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">
        Preferences
      </h2>
      <p className="text-gray-500 text-sm mb-6">
        How would you like your CTO advisor to communicate?
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6"
        noValidate
      >
        {/* Communication Style */}
        <fieldset>
          <legend className="block text-sm font-medium text-gray-700 mb-2">
            Communication style
          </legend>
          <div className="space-y-2">
            {COMMUNICATION_STYLES.map((style) => (
              <label
                key={style}
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="radio"
                  value={style}
                  className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  {...register("communicationStyle")}
                />
                <span className="text-sm text-gray-900">{style}</span>
              </label>
            ))}
          </div>
          {errors.communicationStyle && (
            <p role="alert" className="text-red-600 text-sm mt-1">
              {errors.communicationStyle.message}
            </p>
          )}
        </fieldset>

        {/* Response Format */}
        <fieldset>
          <legend className="block text-sm font-medium text-gray-700 mb-2">
            Response format
          </legend>
          <div className="space-y-2">
            {RESPONSE_FORMATS.map((format) => (
              <label
                key={format}
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="radio"
                  value={format}
                  className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  {...register("responseFormat")}
                />
                <span className="text-sm text-gray-900">{format}</span>
              </label>
            ))}
          </div>
          {errors.responseFormat && (
            <p role="alert" className="text-red-600 text-sm mt-1">
              {errors.responseFormat.message}
            </p>
          )}
        </fieldset>

        {/* Detail Level */}
        <fieldset>
          <legend className="block text-sm font-medium text-gray-700 mb-2">
            Detail level
          </legend>
          <div className="space-y-2">
            {DETAIL_LEVELS.map((level) => (
              <label
                key={level}
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="radio"
                  value={level}
                  className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  {...register("detailLevel")}
                />
                <span className="text-sm text-gray-900">{level}</span>
              </label>
            ))}
          </div>
          {errors.detailLevel && (
            <p role="alert" className="text-red-600 text-sm mt-1">
              {errors.detailLevel.message}
            </p>
          )}
        </fieldset>

        {/* Areas of Interest */}
        <fieldset>
          <legend className="block text-sm font-medium text-gray-700 mb-2">
            Areas of interest
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {INTEREST_AREAS.map((area) => (
              <label
                key={area}
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="checkbox"
                  value={area}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  {...register("areasOfInterest")}
                />
                <span className="text-sm text-gray-900">{area}</span>
              </label>
            ))}
          </div>
        </fieldset>

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
            Complete
          </button>
        </div>
      </form>
    </div>
  );
}
