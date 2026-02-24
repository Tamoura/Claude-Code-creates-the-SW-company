"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import type { Job } from "@/types";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface CreateJobModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

type WorkType = Job["workType"];
type ExperienceLevel = Job["experienceLevel"];

interface FormState {
  title: string;
  company: string;
  location: string;
  workType: WorkType | "";
  experienceLevel: ExperienceLevel | "";
  description: string;
  requirements: string;
  salaryMin: string;
  salaryMax: string;
}

const WORK_TYPES: WorkType[] = ["REMOTE", "HYBRID", "ONSITE"];
const EXPERIENCE_LEVELS: ExperienceLevel[] = [
  "ENTRY",
  "MID",
  "SENIOR",
  "LEAD",
  "EXECUTIVE",
];

const INITIAL_FORM: FormState = {
  title: "",
  company: "",
  location: "",
  workType: "",
  experienceLevel: "",
  description: "",
  requirements: "",
  salaryMin: "",
  salaryMax: "",
};

/**
 * Modal form for creating a new job listing (recruiter only).
 *
 * Usage:
 *   <CreateJobModal onSuccess={() => refetch()} onClose={() => setOpen(false)} />
 */
export function CreateJobModal({ onSuccess, onClose }: CreateJobModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useFocusTrap(true);

  // ESC to close + body scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.title || !form.company || !form.workType || !form.experienceLevel || !form.description) {
      setError("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        title: form.title,
        company: form.company,
        workType: form.workType,
        experienceLevel: form.experienceLevel,
        description: form.description,
        language: "en",
      };
      if (form.location) body.location = form.location;
      if (form.requirements) body.requirements = form.requirements;
      if (form.salaryMin) body.salaryMin = Number(form.salaryMin);
      if (form.salaryMax) body.salaryMax = Number(form.salaryMax);

      const response = await apiClient.post<Job>("/jobs", body);

      if (response.success) {
        onSuccess();
        onClose();
      } else {
        setError(response.error?.message || "Failed to create job.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls =
    "w-full rounded-[10px] border-0 bg-[#F1F5F9] dark:bg-white/5 px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-600 focus:bg-white dark:focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all duration-[180ms]";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-job-title"
        className="w-full max-w-lg rounded-[18px] bg-white dark:bg-[#1C1C1E] p-6 shadow-apple-lg my-8"
      >
        <h2
          id="create-job-title"
          className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-5"
        >
          Post a Job
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Title */}
          <div>
            <label htmlFor="job-title" className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              Job title <span className="text-red-500">*</span>
            </label>
            <input
              id="job-title"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. Frontend Engineer"
              className={inputCls}
              required
            />
          </div>

          {/* Company */}
          <div>
            <label htmlFor="job-company" className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              Company <span className="text-red-500">*</span>
            </label>
            <input
              id="job-company"
              name="company"
              value={form.company}
              onChange={handleChange}
              placeholder="e.g. Acme Corp"
              className={inputCls}
              required
            />
          </div>

          {/* Location */}
          <div>
            <label htmlFor="job-location" className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              Location
            </label>
            <input
              id="job-location"
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="e.g. Dubai, UAE (leave blank for remote)"
              className={inputCls}
            />
          </div>

          {/* Work type + Experience level side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="job-work-type" className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                Work type <span className="text-red-500">*</span>
              </label>
              <select
                id="job-work-type"
                name="workType"
                value={form.workType}
                onChange={handleChange}
                className={inputCls}
                required
              >
                <option value="">Select...</option>
                {WORK_TYPES.map((wt) => (
                  <option key={wt} value={wt}>
                    {wt === "REMOTE" ? "Remote" : wt === "HYBRID" ? "Hybrid" : "On-site"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="job-experience-level" className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                Experience <span className="text-red-500">*</span>
              </label>
              <select
                id="job-experience-level"
                name="experienceLevel"
                value={form.experienceLevel}
                onChange={handleChange}
                className={inputCls}
                required
              >
                <option value="">Select...</option>
                {EXPERIENCE_LEVELS.map((el) => (
                  <option key={el} value={el}>
                    {el.charAt(0) + el.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Salary range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="job-salary-min" className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                Salary min
              </label>
              <input
                id="job-salary-min"
                type="number"
                name="salaryMin"
                value={form.salaryMin}
                onChange={handleChange}
                placeholder="e.g. 8000"
                min={0}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="job-salary-max" className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                Salary max
              </label>
              <input
                id="job-salary-max"
                type="number"
                name="salaryMax"
                value={form.salaryMax}
                onChange={handleChange}
                placeholder="e.g. 12000"
                min={0}
                className={inputCls}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="job-description" className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="job-description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              placeholder="Describe the role, responsibilities, and team..."
              className={`${inputCls} resize-none`}
              required
            />
          </div>

          {/* Requirements */}
          <div>
            <label htmlFor="job-requirements" className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              Requirements
            </label>
            <textarea
              id="job-requirements"
              name="requirements"
              value={form.requirements}
              onChange={handleChange}
              rows={3}
              placeholder="Skills, tools, certifications..."
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="rounded-[10px] bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-600 dark:text-red-400"
            >
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-full border border-neutral-300 dark:border-neutral-600 px-5 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:-translate-y-0.5 transition-all duration-[180ms] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:-translate-y-0.5 hover:shadow-apple-md active:scale-[0.97] transition-all duration-[180ms] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Posting..." : "Post Job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
