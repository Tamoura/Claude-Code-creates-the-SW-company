"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type { Education } from "@/types";

interface EducationFormProps {
  education?: Education;
  onSave: (data: EducationFormData) => Promise<boolean>;
  onClose: () => void;
}

export interface EducationFormData {
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  description?: string;
  startYear: number;
  endYear?: number | null;
}

const currentYear = new Date().getFullYear();

export function EducationForm({ education, onSave, onClose }: EducationFormProps) {
  const { t } = useTranslation("common");
  const dialogRef = useFocusTrap(true);
  const institutionRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<EducationFormData>({
    institution: education?.institution || "",
    degree: education?.degree || "",
    fieldOfStudy: education?.fieldOfStudy || "",
    description: education?.description || "",
    startYear: education?.startYear || currentYear,
    endYear: education?.endYear || null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    institutionRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!form.institution.trim() || !form.degree.trim() || !form.startYear) {
      setError("Institution, degree, and start year are required.");
      return;
    }
    if (form.startYear < 1950 || form.startYear > currentYear + 5) {
      setError("Start year must be between 1950 and " + (currentYear + 5));
      return;
    }
    if (form.endYear && form.endYear < form.startYear) {
      setError("End year must be after start year.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const ok = await onSave(form);
      if (ok) onClose();
      else setError("Failed to save. Please try again.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEdit = !!education;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edu-form-title"
        className="w-full max-w-lg rounded-[18px] bg-white dark:bg-[#1C1C1E] p-6 shadow-apple-lg max-h-[90vh] overflow-y-auto"
      >
        <h2 id="edu-form-title" className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
          {isEdit ? t("profile.editEducation") : t("profile.addEducation")}
        </h2>

        <div className="space-y-4">
          {/* Institution */}
          <div>
            <label htmlFor="edu-institution" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              {t("profile.institution")} *
            </label>
            <input
              id="edu-institution"
              ref={institutionRef}
              type="text"
              value={form.institution}
              onChange={(e) => setForm({ ...form, institution: e.target.value })}
              placeholder={t("profile.institutionPlaceholder")}
              maxLength={200}
              className="w-full rounded-[10px] border-0 bg-[#F1F5F9] dark:bg-white/5 px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
            />
          </div>

          {/* Degree */}
          <div>
            <label htmlFor="edu-degree" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              {t("profile.degree")} *
            </label>
            <input
              id="edu-degree"
              type="text"
              value={form.degree}
              onChange={(e) => setForm({ ...form, degree: e.target.value })}
              placeholder={t("profile.degreePlaceholder")}
              maxLength={200}
              className="w-full rounded-[10px] border-0 bg-[#F1F5F9] dark:bg-white/5 px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
            />
          </div>

          {/* Field of Study */}
          <div>
            <label htmlFor="edu-field" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              {t("profile.fieldOfStudy")}
            </label>
            <input
              id="edu-field"
              type="text"
              value={form.fieldOfStudy}
              onChange={(e) => setForm({ ...form, fieldOfStudy: e.target.value })}
              placeholder={t("profile.fieldPlaceholder")}
              maxLength={200}
              className="w-full rounded-[10px] border-0 bg-[#F1F5F9] dark:bg-white/5 px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
            />
          </div>

          {/* Years */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edu-start-year" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                {t("profile.startYear")} *
              </label>
              <input
                id="edu-start-year"
                type="number"
                min={1950}
                max={currentYear + 5}
                value={form.startYear}
                onChange={(e) => setForm({ ...form, startYear: parseInt(e.target.value) || currentYear })}
                className="w-full rounded-[10px] border-0 bg-[#F1F5F9] dark:bg-white/5 px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
              />
            </div>
            <div>
              <label htmlFor="edu-end-year" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                {t("profile.endYear")}
              </label>
              <input
                id="edu-end-year"
                type="number"
                min={1950}
                max={currentYear + 10}
                value={form.endYear || ""}
                onChange={(e) => setForm({ ...form, endYear: e.target.value ? parseInt(e.target.value) : null })}
                placeholder={t("profile.present")}
                className="w-full rounded-[10px] border-0 bg-[#F1F5F9] dark:bg-white/5 px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="edu-desc" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              {t("profile.description")}
            </label>
            <textarea
              id="edu-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              maxLength={2000}
              className="w-full rounded-[10px] border-0 bg-[#F1F5F9] dark:bg-white/5 px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all resize-none"
            />
          </div>
        </div>

        {error && (
          <div role="alert" className="mt-4 rounded-[10px] bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full border border-neutral-300 dark:border-neutral-600 px-5 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:-translate-y-0.5 transition-all duration-[180ms] disabled:opacity-50"
          >
            {t("actions.cancel")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-full bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:-translate-y-0.5 hover:shadow-apple-md active:scale-[0.97] transition-all duration-[180ms] disabled:opacity-60"
          >
            {isSubmitting ? t("actions.saving") : t("actions.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
