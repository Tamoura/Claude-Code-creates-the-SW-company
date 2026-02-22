"use client";

import { useState, useEffect, startTransition } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const CONSENT_KEY = "connectin-cookie-consent";

/**
 * Privacy-compliant cookie consent banner.
 *
 * Renders a fixed bottom bar on the user's first visit.
 * Persists the decision (accepted | declined) to localStorage
 * so the banner does not reappear on subsequent visits.
 *
 * Hydration-safe: the banner is hidden during SSR and only
 * shown after the client reads localStorage, preventing a
 * React hydration mismatch.
 *
 * Usage:
 *   <CookieConsent />   // place once in root layout
 */
export function CookieConsent() {
  const { t } = useTranslation("common");
  // Start hidden to avoid hydration mismatch; useEffect reveals if needed.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) {
      // startTransition avoids synchronous setState-in-effect lint rule
      // while keeping the update batched with other renders.
      startTransition(() => setVisible(true));
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(CONSENT_KEY, "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={t("consent.title")}
      aria-describedby="cookie-consent-desc"
      className={cn(
        "fixed bottom-0 inset-x-0 z-50",
        "bg-white dark:bg-[#1E293B]",
        "border-t border-slate-200 dark:border-slate-700",
        "shadow-2xl"
      )}
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center gap-4 px-4 py-4 md:px-6 md:py-5">
        <p
          id="cookie-consent-desc"
          className="flex-1 text-sm text-slate-700 dark:text-slate-300 text-center sm:text-start"
        >
          {t("consent.message")}{" "}
          <a
            href="/privacy"
            className={cn(
              "underline text-[#0B6E7F] hover:text-[#086577]",
              "dark:text-[#57BBCE] dark:hover:text-[#7FCFDC]",
              "focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-[#57BBCE] rounded-sm"
            )}
          >
            {t("consent.privacyLink")}
          </a>
          .
        </p>

        <div className="flex gap-3 shrink-0">
          <button
            type="button"
            onClick={handleDecline}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              "text-slate-600 dark:text-slate-300",
              "border border-slate-300 dark:border-slate-600",
              "hover:bg-slate-50 dark:hover:bg-slate-700",
              "focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-slate-400"
            )}
          >
            {t("consent.decline")}
          </button>

          <button
            type="button"
            onClick={handleAccept}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              "text-white bg-[#0B6E7F] hover:bg-[#086577]",
              "focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-[#57BBCE]"
            )}
          >
            {t("consent.accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
