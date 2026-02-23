"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type { Experience } from "@/types";

interface ExperienceFormProps {
  experience?: Experience;
  onSave: (data: ExperienceFormData) => Promise<boolean>;
  onClose: () => void;
}

export interface ExperienceFormData {
  company: string;
  title: string;
  location?: string;
  description?: string;
  startDate: string;
  endDate?: string | null;
  isCurrent: boolean;
}

export function ExperienceForm({ experience, onSave, onClose }: ExperienceFormProps) {
  const { t } = useTranslation("common");
  const dialogRef = useFocusTrap(true);
  const titleRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ExperienceFormData>({
    company: experience?.company || "",
    title: experience?.title || "",
    location: experience?.location || "",
    description: experience?.description || "",
    startDate: experience?.startDate ? experience.startDate.slice(0, 10) : "",
    endDate: experience?.endDate ? experience.endDate.slice(0, 10) : "",
    isCurrent: experience?.isCurrent || false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!form.company.trim() || !form.title.trim() || !form.startDate) {
      setError("Company, title, and start date are required.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const ok = await onSave({
        ...form,
        endDate: form.isCurrent ? null : form.endDate || null,
      });
      if (ok) onClose();
      else setError("Failed to save. Please try again.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEdit = !!experience;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exp-form-title"
        className="w-full max-w-lg rounded-[18px] bg-white dark:bg-[#1C1C1E] p-6 shadow-apple-lg max-h-[90vh] overflow-y-auto"
      >
        <h2 id="exp-form-title" className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
          {isEdit ? t("profile.editExperience") : t("profile.addExperience")}
        </h2>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="exp-title" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              {t("profile.jobTitle")} *
            </label>
            <input
              id="exp-title"
              ref={titleRef}
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={t("profile.titlePlaceholder")}
              maxLength={200}
              className="w-full rounded-[10px] border-0 bg-[#F1F5F9] dark:bg-white/5 px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
            />
          </div>

          {/* Company */}
          <div>
            <label htmlFor="exp-company" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              {t("profile.company")} *
            </label>
            <input
              id="exp-company"
              type="text"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder={t("profile.companyPlaceholder")}
              maxLength={200}
              className="w-full rounded-[10px] border-0 bg-[#F1F5F9] dark:bg-white/5 px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
            />
          </div>

          {/* Location */}
          <div>
            <label htmlFor="exp-location" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              {t("profile.location")}
            </label>
            <input
              id="exp-location"
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder={t("profile.locationPlaceholder")}
              maxLength={100}
              className="w-full rounded-[10px] border-0 bg-[#F1F5F9] dark:bg-white/5 px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
            />
          </div>

          {/* Current role checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isCurrent}
              onChange={(e) => setForm({ ...form, isCurrent: e.target.checked })}
              className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">
              {t("profile.currentRole")}
            </span>
          </label>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="exp-start" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                {t("profile.startDate")} *
              </label>
              <input
                id="exp-start"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full rounded-[10px] border-0 bg-[#F1F5F9] dark:bg-white/5 px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
              />
            </div>
            {!form.isCurrent && (
              <div>
                <label htmlFor="exp-end" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  {t("profile.endDate")}
                </label>
                <input
                  id="exp-end"
                  type="date"
                  value={form.endDate || ""}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="w-full rounded-[10px] border-0 bg-[#F1F5F9] dark:bg-white/5 px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="exp-desc" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              {t("profile.description")}
            </label>
            <textarea
              id="exp-desc"
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
