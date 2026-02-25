"use client";

import Link from "next/link";
import { useHashtags } from "@/hooks/useHashtags";

/**
 * Sidebar widget showing trending hashtags.
 * Each hashtag links to /hashtags/:tag.
 */
export function TrendingHashtags() {
  const { trending, isLoading } = useHashtags();

  if (isLoading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading"
        className="flex items-center justify-center py-6"
      >
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (trending.length === 0) {
    return null;
  }

  return (
    <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-4 shadow-apple-md">
      <h3 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        Trending
      </h3>
      <ul className="space-y-2">
        {trending.map((ht) => (
          <li key={ht.id} className="flex items-center justify-between">
            <Link
              href={`/hashtags/${ht.tag}`}
              className="text-sm text-primary-600 hover:underline font-medium"
            >
              #{ht.tag}
            </Link>
            <span className="text-xs text-neutral-500">{ht.postCount}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
