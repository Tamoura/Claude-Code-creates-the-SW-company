"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CLOUD_PROVIDER_LABELS,
  SPEND_CATEGORY_LABELS,
} from "@/types/costs";
import type { CloudSpendFormData, CloudProvider } from "@/types/costs";

const cloudSpendSchema = z.object({
  provider: z.enum(["aws", "gcp", "azure", "other"], {
    errorMap: () => ({ message: "Provider is required" }),
  }),
  periodStart: z.string().min(1, "Start date is required"),
  periodEnd: z.string().min(1, "End date is required"),
  categories: z.object({
    compute: z.coerce.number().min(0, "Must be 0 or more"),
    storage: z.coerce.number().min(0, "Must be 0 or more"),
    database: z.coerce.number().min(0, "Must be 0 or more"),
    networking: z.coerce.number().min(0, "Must be 0 or more"),
    other: z.coerce.number().min(0, "Must be 0 or more"),
  }),
});

type CloudSpendFormValues = z.infer<typeof cloudSpendSchema>;

interface CloudSpendFormProps {
  onSubmit: (data: CloudSpendFormData) => void;
  isLoading?: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Form for entering cloud spend data with auto-calculated total.
 * [US-13][FR-027]
 */
export function CloudSpendForm({
  onSubmit,
  isLoading = false,
}: CloudSpendFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CloudSpendFormValues>({
    resolver: zodResolver(cloudSpendSchema),
    defaultValues: {
      provider: "" as CloudProvider,
      periodStart: "",
      periodEnd: "",
      categories: {
        compute: 0,
        storage: 0,
        database: 0,
        networking: 0,
        other: 0,
      },
    },
  });

  const categories = useWatch({ control, name: "categories" });
  const total = Object.values(categories || {}).reduce(
    (sum, val) => sum + (Number(val) || 0),
    0
  );

  const handleFormSubmit = (data: CloudSpendFormValues) => {
    onSubmit(data);
  };

  const inputClass =
    "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2";
  const labelClass = "block text-sm font-medium text-foreground mb-1";
  const errorClass = "text-red-500 text-xs mt-1";

  const providerEntries = Object.entries(CLOUD_PROVIDER_LABELS) as Array<
    [CloudProvider, string]
  >;

  const categoryKeys = Object.keys(SPEND_CATEGORY_LABELS) as Array<
    keyof typeof SPEND_CATEGORY_LABELS
  >;

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-6"
      noValidate
    >
      {/* Provider */}
      <div>
        <label htmlFor="cloud-provider" className={labelClass}>
          Cloud Provider
        </label>
        <select
          id="cloud-provider"
          {...register("provider")}
          className={inputClass}
          aria-invalid={errors.provider ? "true" : "false"}
          aria-describedby={
            errors.provider ? "provider-error" : undefined
          }
        >
          <option value="">Select a provider</option>
          {providerEntries.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {errors.provider && (
          <p id="provider-error" role="alert" className={errorClass}>
            {errors.provider.message}
          </p>
        )}
      </div>

      {/* Period */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="period-start" className={labelClass}>
            Start Date
          </label>
          <input
            id="period-start"
            type="date"
            {...register("periodStart")}
            className={inputClass}
            aria-invalid={errors.periodStart ? "true" : "false"}
          />
          {errors.periodStart && (
            <p role="alert" className={errorClass}>
              {errors.periodStart.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="period-end" className={labelClass}>
            End Date
          </label>
          <input
            id="period-end"
            type="date"
            {...register("periodEnd")}
            className={inputClass}
            aria-invalid={errors.periodEnd ? "true" : "false"}
          />
          {errors.periodEnd && (
            <p role="alert" className={errorClass}>
              {errors.periodEnd.message}
            </p>
          )}
        </div>
      </div>

      {/* Spend Categories */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">
          Spend Categories
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {categoryKeys.map((key) => (
            <div key={key}>
              <label
                htmlFor={`category-${key}`}
                className={labelClass}
              >
                {SPEND_CATEGORY_LABELS[key]} ($)
              </label>
              <input
                id={`category-${key}`}
                type="number"
                min="0"
                step="1"
                {...register(`categories.${key}`)}
                className={inputClass}
              />
              {errors.categories?.[key] && (
                <p role="alert" className={errorClass}>
                  {errors.categories[key]?.message}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="flex justify-between items-center rounded-lg bg-muted/50 p-3">
          <span className="text-sm font-semibold text-foreground">
            Total
          </span>
          <span
            data-testid="spend-total"
            className="text-lg font-bold text-foreground"
          >
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-lg bg-primary-600 px-4 py-3 text-sm font-medium text-white hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none min-h-[44px]"
      >
        {isLoading ? "Saving..." : "Save Spend Data"}
      </button>
    </form>
  );
}
