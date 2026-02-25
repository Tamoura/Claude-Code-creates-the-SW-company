"use client";

import { useTranslation } from "react-i18next";

interface EasyApplyButtonProps {
  onEasyApply: () => void;
  isApplied: boolean;
  isLoading: boolean;
}

/**
 * Easy Apply button for ConnectIn job listings.
 * Shows applied state when job has been applied to,
 * loading state during submission, and handles event propagation.
 *
 * Usage:
 *   <EasyApplyButton
 *     onEasyApply={() => easyApplyToJob(job.id)}
 *     isApplied={job.isApplied}
 *     isLoading={isApplying}
 *   />
 */
export function EasyApplyButton({ onEasyApply, isApplied, isLoading }: EasyApplyButtonProps) {
  const { t } = useTranslation("common");

  if (isApplied) {
    return (
      <span className="rounded-full bg-green-50 dark:bg-green-900/30 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-400">
        {t("jobs.applied")}
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={isLoading}
      aria-label={t("jobs.easyApply")}
      onClick={(e) => {
        e.stopPropagation();
        onEasyApply();
      }}
      className="rounded-full bg-primary-600 px-4 py-1.5 text-xs font-medium text-white hover:-translate-y-0.5 hover:shadow-apple-md active:scale-[0.97] transition-all duration-[180ms] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
    >
      <span aria-hidden="true">⚡</span>
      {t("jobs.easyApply")}
    </button>
  );
}
