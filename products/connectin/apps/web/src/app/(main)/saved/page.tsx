"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useBookmarks } from "@/hooks/useBookmarks";
import { BookmarkCard } from "@/components/saved/BookmarkCard";

type FilterTab = "all" | "post" | "job";

const TABS: { key: FilterTab; labelKey: string }[] = [
  { key: "all", labelKey: "saved.all" },
  { key: "post", labelKey: "saved.posts" },
  { key: "job", labelKey: "saved.jobs" },
];

/**
 * Saved/Bookmarks page for ConnectIn.
 * Shows saved posts and jobs with filter tabs.
 */
export default function SavedPage() {
  const { t } = useTranslation("common");
  const { filteredBookmarks, removeBookmark, isLoading } = useBookmarks();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const displayed = filteredBookmarks(activeTab);

  const tabCls = (isActive: boolean) =>
    [
      "rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-[180ms]",
      isActive
        ? "bg-primary-600 text-white shadow-apple-sm"
        : "border border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 hover:-translate-y-0.5",
    ].join(" ");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-5 shadow-apple-md">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 tracking-[-0.01em]">
          {t("nav.saved")}
        </h1>

        {/* Filter tabs */}
        <div className="mt-4 flex gap-2 flex-wrap">
          {TABS.map(({ key, labelKey }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={tabCls(activeTab === key)}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div
          role="status"
          aria-busy="true"
          className="flex items-center justify-center py-16"
        >
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-8 text-center shadow-apple-md">
          <p className="text-neutral-500">{t("noResults")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((bookmark) => (
            <BookmarkCard
              key={bookmark.id}
              bookmark={bookmark}
              onRemove={removeBookmark}
            />
          ))}
        </div>
      )}
    </div>
  );
}
