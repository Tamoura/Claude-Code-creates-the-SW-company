"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { apiClient } from "@/lib/api";

type ReportReason = "spam" | "harassment" | "inappropriate" | "fake" | "other";

interface ReportModalProps {
  targetId: string;
  targetType: "user" | "post";
  onClose: () => void;
}

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "fake", label: "Fake account or impersonation" },
  { value: "other", label: "Other" },
];

/**
 * Modal dialog for reporting users or posts.
 * Sends a POST to /reports with reason and optional description.
 */
export function ReportModal({ targetId, targetType, onClose }: ReportModalProps) {
  const { t } = useTranslation("common");
  const [reason, setReason] = useState<ReportReason>("spam");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await apiClient.post("/reports", {
        targetId,
        targetType,
        reason,
        ...(description.trim() ? { description: description.trim() } : {}),
      });
      if (res.success) {
        onClose();
      } else {
        setError(res.error?.message || "Failed to submit report");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
    >
      <div className="w-full max-w-sm rounded-[18px] bg-white dark:bg-[#1C1C1E] shadow-apple-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 id="report-modal-title" className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Report
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("actions.cancel")}
            className="rounded-full p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor="report-reason" className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1 block">
              Reason
            </label>
            <select
              id="report-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as ReportReason)}
              className="w-full rounded-[10px] border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-white/5 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            >
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="report-description" className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1 block">
              Additional details (optional)
            </label>
            <textarea
              id="report-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Describe the issue..."
              className="w-full resize-none rounded-[10px] border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-white/5 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-full border border-neutral-300 dark:border-neutral-600 px-4 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 disabled:opacity-50"
            >
              {t("actions.cancel")}
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSubmitting}
              aria-label="Submit report"
              className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-medium text-white disabled:opacity-60"
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
