"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { TcoFormData } from "@/types/costs";

const tcoOptionSchema = z.object({
  name: z.string().min(1, "Option name is required"),
  upfrontCost: z.coerce.number().min(0, "Must be 0 or more"),
  monthlyRecurring: z.coerce.number().min(0, "Must be 0 or more"),
  teamSize: z.coerce.number().int().min(1, "At least 1 team member"),
  hourlyRate: z.coerce.number().min(0, "Must be 0 or more"),
  durationMonths: z.coerce.number().int().min(1, "At least 1 month"),
  scalingFactor: z.coerce
    .number()
    .min(1.0, "Minimum 1.0")
    .max(2.0, "Maximum 2.0"),
});

const tcoFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  options: z
    .array(tcoOptionSchema)
    .min(2, "At least 2 options required"),
});

type TcoFormValues = z.infer<typeof tcoFormSchema>;

interface TcoFormProps {
  onSubmit: (data: TcoFormData) => void;
  isLoading?: boolean;
}

const DEFAULT_OPTION = {
  name: "",
  upfrontCost: 0,
  monthlyRecurring: 0,
  teamSize: 1,
  hourlyRate: 75,
  durationMonths: 36,
  scalingFactor: 1.0,
};

/**
 * Form for creating a TCO comparison with multiple options.
 * Validates that at least 2 options are provided.
 * [US-12][FR-023]
 */
export function TcoForm({ onSubmit, isLoading = false }: TcoFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<TcoFormValues>({
    resolver: zodResolver(tcoFormSchema),
    defaultValues: {
      title: "",
      options: [
        { ...DEFAULT_OPTION, name: "" },
        { ...DEFAULT_OPTION, name: "" },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "options",
  });

  const handleFormSubmit = (data: TcoFormValues) => {
    onSubmit(data);
  };

  const inputClass =
    "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2";
  const labelClass = "block text-sm font-medium text-foreground mb-1";
  const errorClass = "text-red-500 text-xs mt-1";

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-6"
      noValidate
    >
      {/* Title */}
      <div>
        <label htmlFor="tco-title" className={labelClass}>
          Comparison Title
        </label>
        <input
          id="tco-title"
          type="text"
          {...register("title")}
          className={inputClass}
          placeholder="e.g., Cloud vs On-Premise"
          aria-invalid={errors.title ? "true" : "false"}
          aria-describedby={errors.title ? "tco-title-error" : undefined}
        />
        {errors.title && (
          <p id="tco-title-error" role="alert" className={errorClass}>
            {errors.title.message}
          </p>
        )}
      </div>

      {/* Options */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-foreground">
          Options to Compare
        </h3>

        {fields.map((field, index) => (
          <div
            key={field.id}
            data-testid={`tco-option-${index}`}
            className="rounded-lg border border-border p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground">
                Option {index + 1}
              </h4>
              {fields.length > 2 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label={`Remove option ${index + 1}`}
                  className="text-xs text-red-500 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded px-2 py-1"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label
                  htmlFor={`option-name-${index}`}
                  className={labelClass}
                >
                  Option Name
                </label>
                <input
                  id={`option-name-${index}`}
                  type="text"
                  {...register(`options.${index}.name`)}
                  className={inputClass}
                  placeholder="e.g., AWS Cloud"
                  aria-invalid={
                    errors.options?.[index]?.name ? "true" : "false"
                  }
                />
                {errors.options?.[index]?.name && (
                  <p role="alert" className={errorClass}>
                    {errors.options[index]?.name?.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor={`option-upfront-${index}`}
                  className={labelClass}
                >
                  Upfront Cost ($)
                </label>
                <input
                  id={`option-upfront-${index}`}
                  type="number"
                  min="0"
                  step="1"
                  {...register(`options.${index}.upfrontCost`)}
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor={`option-monthly-${index}`}
                  className={labelClass}
                >
                  Monthly Recurring ($)
                </label>
                <input
                  id={`option-monthly-${index}`}
                  type="number"
                  min="0"
                  step="1"
                  {...register(`options.${index}.monthlyRecurring`)}
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor={`option-team-${index}`}
                  className={labelClass}
                >
                  Team Size
                </label>
                <input
                  id={`option-team-${index}`}
                  type="number"
                  min="1"
                  step="1"
                  {...register(`options.${index}.teamSize`)}
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor={`option-rate-${index}`}
                  className={labelClass}
                >
                  Hourly Rate ($)
                </label>
                <input
                  id={`option-rate-${index}`}
                  type="number"
                  min="0"
                  step="1"
                  {...register(`options.${index}.hourlyRate`)}
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor={`option-duration-${index}`}
                  className={labelClass}
                >
                  Duration (months)
                </label>
                <input
                  id={`option-duration-${index}`}
                  type="number"
                  min="1"
                  step="1"
                  {...register(`options.${index}.durationMonths`)}
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor={`option-scaling-${index}`}
                  className={labelClass}
                >
                  Scaling Factor (1.0-2.0)
                </label>
                <input
                  id={`option-scaling-${index}`}
                  type="number"
                  min="1"
                  max="2"
                  step="0.1"
                  {...register(`options.${index}.scalingFactor`)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => append({ ...DEFAULT_OPTION })}
          className="w-full rounded-lg border border-dashed border-border py-3 text-sm font-medium text-muted-foreground hover:border-primary-300 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 min-h-[44px]"
        >
          + Add Option
        </button>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-lg bg-primary-600 px-4 py-3 text-sm font-medium text-white hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none min-h-[44px]"
      >
        {isLoading ? "Calculating..." : "Calculate TCO"}
      </button>
    </form>
  );
}
