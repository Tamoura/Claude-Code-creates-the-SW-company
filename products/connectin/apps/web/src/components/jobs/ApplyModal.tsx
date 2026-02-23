"use client";

import { useState, useEffect, useRef } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

const MAX_COVER_NOTE = 500;

interface ApplyModalProps {
  jobId: string;
  jobTitle: string;
  company: string;
  onApply: (jobId: string, coverNote: string) => Promise<string | undefined>;
  onClose: () => void;
}

/**
 * Modal for applying to a job in ConnectIn.
 * Includes optional cover note with character counter.
 * Supports focus trap, ESC to close, and aria-modal.
 *
 * Usage:
 *   <ApplyModal jobId={job.id} jobTitle={job.title} company={job.company}
 *     onApply={applyToJob} onClose={() => setOpen(false)} />
 */
export function ApplyModal({
  jobId,
  jobTitle,
  company,
  onApply,
  onClose,
}: ApplyModalProps) {
  const [coverNote, setCoverNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useFocusTrap(true);

  // ESC key handler + body scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await onApply(jobId, coverNote);
      if (result !== undefined) {
        onClose();
      } else {
        setError("Failed to submit application. Please try again.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="apply-modal-title"
        className="w-full max-w-md rounded-[18px] bg-white dark:bg-[#1C1C1E] p-6 shadow-apple-lg"
      >
        {/* Header */}
        <div className="mb-4">
          <h2
            id="apply-modal-title"
            className="text-lg font-semibold text-neutral-900 dark:text-neutral-100"
          >
            {jobTitle}
          </h2>
          <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
            {company}
          </p>
        </div>

        {/* Cover note */}
        <div className="mb-4">
          <label
            htmlFor="cover-note"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
          >
            Cover note{" "}
            <span className="font-normal text-neutral-400">(optional)</span>
          </label>
          <textarea
            id="cover-note"
            ref={textareaRef}
            aria-label="Cover note"
            value={coverNote}
            onChange={(e) => setCoverNote(e.target.value.slice(0, MAX_COVER_NOTE))}
            rows={4}
            placeholder="Tell the recruiter why you're a great fit..."
            className="w-full rounded-[10px] border-0 bg-[#F1F5F9] dark:bg-white/5 px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-600 focus:bg-white dark:focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all duration-[180ms] resize-none"
          />
          <p aria-live="polite" className="mt-1 text-right text-xs text-neutral-400">
            {coverNote.length} / {MAX_COVER_NOTE}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-[10px] bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full border border-neutral-300 dark:border-neutral-600 px-5 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:-translate-y-0.5 transition-all duration-[180ms] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            aria-label={isSubmitting ? "Applying..." : undefined}
            className="rounded-full bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:-translate-y-0.5 hover:shadow-apple-md active:scale-[0.97] transition-all duration-[180ms] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Applying..." : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
