"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/lib/api";

interface SlugSettingsProps {
  currentSlug: string;
  onSlugUpdated: (newSlug: string) => void;
}

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
const MIN_LENGTH = 3;

/**
 * Custom URL (slug) settings component for ConnectIn profiles.
 * Validates slug format, shows live preview URL, and handles
 * API submission with loading/error states.
 *
 * Usage:
 *   <SlugSettings currentSlug={profile.slug ?? ""} onSlugUpdated={(s) => setSlug(s)} />
 */
export function SlugSettings({ currentSlug, onSlugUpdated }: SlugSettingsProps) {
  const { t } = useTranslation("common");
  const [slug, setSlug] = useState(currentSlug);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  function validate(value: string): string | null {
    if (value.length < MIN_LENGTH) return "slug.tooShort";
    if (!SLUG_REGEX.test(value)) return "slug.invalidFormat";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setValidationError(null);

    const vErr = validate(slug);
    if (vErr) {
      setValidationError(vErr);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiClient.put<{ slug: string }>("/profiles/me/slug", { slug });
      if (response.success && response.data) {
        onSlugUpdated(response.data.slug);
      } else {
        setError(response.error?.message || "slug.error");
      }
    } catch {
      setError("slug.networkError");
    } finally {
      setIsSubmitting(false);
    }
  }

  const previewUrl = `connectin.app/in/${slug || currentSlug || "your-name"}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label
          htmlFor="slug-input"
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
        >
          {t("slug.label")}
        </label>
        <input
          id="slug-input"
          type="text"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value.toLowerCase().replace(/\s/g, "-"));
            setValidationError(null);
            setError(null);
          }}
          placeholder={t("slug.placeholder")}
          className="w-full rounded-[10px] border border-neutral-200 dark:border-neutral-700 bg-[#F1F5F9] dark:bg-white/5 px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all duration-[180ms]"
        />
        <p className="mt-1 text-xs text-neutral-500">{previewUrl}</p>
      </div>

      {validationError && (
        <p className="text-sm text-red-600 dark:text-red-400">{t(validationError)}</p>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        aria-label={t("slug.claim")}
        className="rounded-full bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:-translate-y-0.5 hover:shadow-apple-md active:scale-[0.97] transition-all duration-[180ms] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? t("actions.saving") : t("slug.claim")}
      </button>
    </form>
  );
}
