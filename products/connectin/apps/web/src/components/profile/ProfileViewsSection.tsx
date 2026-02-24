"use client";

import { useTranslation } from "react-i18next";
import { useProfileViews } from "@/hooks/useProfileViews";
import { ProfileViewerItem } from "./ProfileViewerItem";

/**
 * Who viewed my profile section for ConnectIn.
 * Shows count badge, viewer list with avatars and headlines.
 *
 * Usage:
 *   <ProfileViewsSection />
 */
export function ProfileViewsSection() {
  const { t } = useTranslation("common");
  const { viewers, count, isLoading, error } = useProfileViews();

  return (
    <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-6 shadow-apple-md">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 tracking-[-0.01em]">
          {t("profile.views")}
        </h2>
        {count > 0 && (
          <span className="rounded-full bg-primary-100 dark:bg-primary-900/30 px-2 py-0.5 text-xs font-semibold text-primary-700 dark:text-primary-400">
            {count}
          </span>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <p className="text-sm text-neutral-500">{t("loading")}</p>
      ) : error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : viewers.length === 0 ? (
        <p className="text-sm text-neutral-500">{t("profile.noViews")}</p>
      ) : (
        <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
          {viewers.map((viewer) => (
            <ProfileViewerItem key={viewer.id} viewer={viewer} />
          ))}
        </div>
      )}
    </div>
  );
}
