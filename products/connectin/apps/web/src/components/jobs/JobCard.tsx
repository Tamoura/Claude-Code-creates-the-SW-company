"use client";

import type { Job } from "@/types";

interface JobCardProps {
  job: Job;
  onApply: (jobId: string) => void;
  onSave: (jobId: string, isSaved: boolean) => void;
}

const WORK_TYPE_LABELS: Record<Job["workType"], string> = {
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  ONSITE: "On-site",
};

const EXPERIENCE_LABELS: Record<Job["experienceLevel"], string> = {
  ENTRY: "Entry",
  MID: "Mid",
  SENIOR: "Senior",
  LEAD: "Lead",
  EXECUTIVE: "Executive",
};

/**
 * Job listing card for ConnectIn.
 * Shows job details with save/apply actions and optimistic state.
 *
 * Usage:
 *   <JobCard job={job} onApply={(id) => openApplyModal(id)} onSave={(id, saved) => ...} />
 */
export function JobCard({ job, onApply, onSave }: JobCardProps) {
  const {
    id,
    title,
    company,
    location,
    workType,
    experienceLevel,
    salaryMin,
    salaryMax,
    salaryCurrency,
    applicantCount,
    isApplied,
    isSaved,
  } = job;

  const hasSalary =
    salaryMin !== undefined && salaryMin !== null;

  const formatSalary = (amount: number) =>
    new Intl.NumberFormat("en-US").format(amount);

  return (
    <article
      className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-5 shadow-apple-md hover:-translate-y-0.5 transition-all duration-[180ms] cursor-pointer"
      aria-label={`${title} at ${company}`}
    >
      {/* Header: company + location */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 truncate">
            {company}
          </p>
          {location && (
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5 truncate">
              {location}
            </p>
          )}
        </div>
      </div>

      {/* Job title */}
      <h3 className="mt-2 text-base font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-2 leading-snug">
        {title}
      </h3>

      {/* Badges */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-neutral-100 dark:bg-white/10 px-2.5 py-0.5 text-xs text-neutral-600 dark:text-neutral-300">
          {WORK_TYPE_LABELS[workType]}
        </span>
        <span className="rounded-full bg-neutral-100 dark:bg-white/10 px-2.5 py-0.5 text-xs text-neutral-600 dark:text-neutral-300">
          {EXPERIENCE_LABELS[experienceLevel]}
        </span>
      </div>

      {/* Salary */}
      {hasSalary && (
        <p className="mt-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          ${formatSalary(salaryMin!)}{" "}
          {salaryMax !== undefined && salaryMax !== null && (
            <>– ${formatSalary(salaryMax)}</>
          )}{" "}
          {salaryCurrency}
        </p>
      )}

      {/* Applicant count */}
      <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
        {applicantCount} applicant{applicantCount !== 1 ? "s" : ""}
      </p>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2">
        {isApplied ? (
          <span className="rounded-full bg-green-50 dark:bg-green-900/30 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-400">
            Applied
          </span>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onApply(id);
            }}
            className="rounded-full bg-primary-600 px-4 py-1.5 text-xs font-medium text-white hover:-translate-y-0.5 hover:shadow-apple-md active:scale-[0.97] transition-all duration-[180ms]"
            aria-label={`Apply to ${title}`}
          >
            Apply
          </button>
        )}

        {isSaved ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSave(id, true);
            }}
            className="rounded-full border border-neutral-300 dark:border-neutral-600 px-4 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:-translate-y-0.5 transition-all duration-[180ms]"
            aria-label={`Unsave ${title}`}
          >
            Unsave
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSave(id, false);
            }}
            className="rounded-full border border-neutral-300 dark:border-neutral-600 px-4 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:-translate-y-0.5 transition-all duration-[180ms]"
            aria-label={`Save ${title}`}
          >
            Save
          </button>
        )}
      </div>
    </article>
  );
}
