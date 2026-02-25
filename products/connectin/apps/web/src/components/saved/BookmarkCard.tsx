"use client";

import { useTranslation } from "react-i18next";
import type { Bookmark, Post, Job } from "@/types";

interface BookmarkCardProps {
  bookmark: Bookmark;
  onRemove: (bookmarkId: string) => void;
}

/**
 * Card component for displaying a saved bookmark (post or job).
 *
 * Usage:
 *   <BookmarkCard bookmark={bookmark} onRemove={(id) => removeBookmark(id)} />
 */
export function BookmarkCard({ bookmark, onRemove }: BookmarkCardProps) {
  const { t } = useTranslation("common");
  const isPost = bookmark.targetType === "post";
  const target = bookmark.target;

  return (
    <article className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-5 shadow-apple-md">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full bg-neutral-100 dark:bg-white/10 px-2.5 py-0.5 text-xs text-neutral-600 dark:text-neutral-300">
          {isPost ? t("saved.post") : t("saved.job")}
        </span>
        <button
          type="button"
          onClick={() => onRemove(bookmark.id)}
          className="rounded-full border border-neutral-300 dark:border-neutral-600 px-3 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:-translate-y-0.5 transition-all duration-[180ms]"
          aria-label={t("saved.remove")}
        >
          {t("saved.remove")}
        </button>
      </div>

      {isPost && target && (
        <div className="mt-3">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {(target as Post).author.displayName}
          </p>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400 line-clamp-3">
            {(target as Post).content}
          </p>
        </div>
      )}

      {!isPost && target && (
        <div className="mt-3">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            {(target as Job).title}
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {(target as Job).company}
          </p>
          {(target as Job).location && (
            <p className="text-xs text-neutral-500 mt-0.5">{(target as Job).location}</p>
          )}
        </div>
      )}

      <p className="mt-2 text-xs text-neutral-400">
        {new Date(bookmark.createdAt).toLocaleDateString()}
      </p>
    </article>
  );
}
