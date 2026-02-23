"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useMyApplications } from "@/hooks/useMyApplications";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  REVIEWED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  SHORTLISTED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  WITHDRAWN: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
};

function statusLabel(status: string, t: (key: string) => string): string {
  const map: Record<string, string> = {
    PENDING: t("jobs.statusPending"),
    REVIEWED: t("jobs.statusReviewed"),
    SHORTLISTED: t("jobs.statusShortlisted"),
    REJECTED: t("jobs.statusRejected"),
    WITHDRAWN: t("jobs.statusWithdrawn"),
  };
  return map[status] || status;
}

export default function MyApplicationsPage() {
  const { t } = useTranslation("common");
  const {
    applications,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
  } = useMyApplications();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          {t("jobs.myApplications")}
        </h1>
        <Link
          href="/jobs"
          className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
        >
          {t("actions.back")}
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-5 shadow-apple-md animate-pulse"
            >
              <div className="h-3 w-1/4 rounded bg-neutral-200 dark:bg-white/10" />
              <div className="mt-3 h-5 w-2/3 rounded bg-neutral-200 dark:bg-white/10" />
              <div className="mt-3 h-4 w-1/3 rounded bg-neutral-200 dark:bg-white/10" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-8 text-center shadow-apple-md">
          <p className="text-red-700">{error}</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-8 text-center shadow-apple-md">
          <p className="text-neutral-500">{t("jobs.noApplications")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <div
              key={app.id}
              className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-5 shadow-apple-md transition-all duration-[180ms] hover:shadow-apple-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    {app.job.company}
                  </p>
                  <h2 className="mt-1 text-base font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                    {app.job.title}
                  </h2>
                  {app.job.location && (
                    <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                      {app.job.location}
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                    STATUS_COLORS[app.status] || STATUS_COLORS.PENDING
                  }`}
                >
                  {statusLabel(app.status, t)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                <span className="rounded-full bg-neutral-100 dark:bg-white/5 px-2.5 py-0.5">
                  {app.job.workType}
                </span>
                <span className="rounded-full bg-neutral-100 dark:bg-white/5 px-2.5 py-0.5">
                  {app.job.experienceLevel}
                </span>
                <span className="ml-auto">
                  {t("jobs.appliedOn", {
                    date: new Date(app.appliedAt).toLocaleDateString(),
                  })}
                </span>
              </div>

              {app.coverNote && (
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300 line-clamp-2">
                  {app.coverNote}
                </p>
              )}
            </div>
          ))}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={loadMore}
                disabled={isLoadingMore}
                className="rounded-full border border-neutral-300 dark:border-neutral-600 px-6 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:-translate-y-0.5 transition-all duration-[180ms] disabled:opacity-50"
              >
                {isLoadingMore ? t("actions.loading") : t("actions.loadMore")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
