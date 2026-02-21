"use client";

import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useJobs } from "@/hooks/useJobs";
import { useAuthContext } from "@/providers/AuthProvider";
import { JobCard } from "@/components/jobs/JobCard";
import { ApplyModal } from "@/components/jobs/ApplyModal";
import { CreateJobModal } from "@/components/jobs/CreateJobModal";

type WorkTypeFilter = "REMOTE" | "HYBRID" | "ONSITE";
type ExpLevelFilter = "ENTRY" | "MID" | "SENIOR" | "LEAD";

const WORK_TYPE_FILTERS: { key: WorkTypeFilter; labelKey: string }[] = [
  { key: "REMOTE", labelKey: "jobs.remote" },
  { key: "HYBRID", labelKey: "jobs.hybrid" },
  { key: "ONSITE", labelKey: "jobs.onsite" },
];

const EXP_LEVEL_FILTERS: { key: ExpLevelFilter; labelKey: string }[] = [
  { key: "ENTRY", labelKey: "jobs.entry" },
  { key: "MID", labelKey: "jobs.mid" },
  { key: "SENIOR", labelKey: "jobs.senior" },
  { key: "LEAD", labelKey: "jobs.lead" },
];

/**
 * Jobs listing page for ConnectIn.
 * Provides debounced search, work-type and experience-level filter chips,
 * an infinite-scroll job list, and recruiter-only job creation.
 */
export default function JobsPage() {
  const { t } = useTranslation("common");
  const { user } = useAuthContext();

  const {
    jobs,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    filters,
    setFilter,
    loadMore,
    saveJob,
    unsaveJob,
    applyToJob,
  } = useJobs();

  // Apply modal state
  const [applyJobId, setApplyJobId] = useState<string | null>(null);

  // Create job modal state
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Debounced search
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback(
    (value: string) => {
      if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
      const timer = setTimeout(() => {
        setFilter("q", value);
      }, 300);
      setSearchDebounceTimer(timer);
    },
    [searchDebounceTimer, setFilter]
  );

  const handleWorkTypeClick = (key: WorkTypeFilter) => {
    setFilter("workType", filters.workType === key ? "" : key);
  };

  const handleExpLevelClick = (key: ExpLevelFilter) => {
    setFilter("experienceLevel", filters.experienceLevel === key ? "" : key);
  };

  const applyJob = jobs.find((j) => j.id === applyJobId);

  const isRecruiter =
    user?.role === "recruiter" || (user?.role as string) === "RECRUITER";

  const filterChipCls = (isActive: boolean) =>
    [
      "rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-[180ms]",
      isActive
        ? "border-primary-600 bg-primary-600 text-white shadow-apple-sm"
        : "border-neutral-300 bg-white dark:bg-[#1C1C1E] text-neutral-700 dark:text-neutral-300 hover:border-primary-500 hover:text-primary-600 hover:-translate-y-0.5",
    ].join(" ");

  return (
    <div className="space-y-4">
      <h1 className="sr-only">{t("nav.jobs") || "Jobs"}</h1>
      {/* Search */}
      <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-4 shadow-apple-md flex items-center gap-3">
        <input
          type="text"
          aria-label={t("jobs.search")}
          defaultValue={filters.q}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={t("jobs.search")}
          className="flex-1 rounded-[10px] border-0 bg-[#F1F5F9] dark:bg-white/5 px-3 py-2.5 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:bg-white dark:focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all duration-[180ms]"
        />
        {isRecruiter && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="rounded-full bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:-translate-y-0.5 hover:shadow-apple-md active:scale-[0.97] transition-all duration-[180ms] shrink-0"
          >
            {t("jobs.postJob")}
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="space-y-2">
        {/* Work type */}
        <div className="flex flex-wrap gap-2">
          {WORK_TYPE_FILTERS.map(({ key, labelKey }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleWorkTypeClick(key)}
              className={filterChipCls(filters.workType === key)}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>

        {/* Experience level */}
        <div className="flex flex-wrap gap-2">
          {EXP_LEVEL_FILTERS.map(({ key, labelKey }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleExpLevelClick(key)}
              className={filterChipCls(filters.experienceLevel === key)}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Job listings */}
      {isLoading ? (
        // Loading skeletons
        <div className="space-y-3" aria-label={t("actions.loading")} aria-busy="true">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-5 shadow-apple-md animate-pulse"
            >
              <div className="h-3 w-1/3 rounded bg-neutral-200 dark:bg-white/10" />
              <div className="mt-3 h-5 w-2/3 rounded bg-neutral-200 dark:bg-white/10" />
              <div className="mt-3 flex gap-2">
                <div className="h-5 w-16 rounded-full bg-neutral-200 dark:bg-white/10" />
                <div className="h-5 w-16 rounded-full bg-neutral-200 dark:bg-white/10" />
              </div>
              <div className="mt-4 h-4 w-1/4 rounded bg-neutral-200 dark:bg-white/10" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-8 text-center shadow-apple-md">
          <p className="text-red-700">{error}</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-8 text-center shadow-apple-md">
          <p className="text-neutral-500">{t("noResults")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onApply={(jobId) => setApplyJobId(jobId)}
              onSave={(jobId, isSaved) => {
                if (isSaved) {
                  unsaveJob(jobId);
                } else {
                  saveJob(jobId);
                }
              }}
            />
          ))}

          {/* Load more */}
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

      {/* Apply modal */}
      {applyJobId && applyJob && (
        <ApplyModal
          jobId={applyJob.id}
          jobTitle={applyJob.title}
          company={applyJob.company}
          onApply={applyToJob}
          onClose={() => setApplyJobId(null)}
        />
      )}

      {/* Create job modal (recruiter only) */}
      {showCreateModal && (
        <CreateJobModal
          onSuccess={() => {
            // Trigger a filter refresh by setting q to itself
            setFilter("q", filters.q);
          }}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
