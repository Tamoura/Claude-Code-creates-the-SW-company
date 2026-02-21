"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useFeed } from "@/hooks/useFeed";
import { PostCard } from "@/components/feed/PostCard";
import { PostCardSkeleton } from "@/components/shared/LoadingSkeleton";

const MAX_CHARS = 3000;

export default function FeedPage() {
  const { t } = useTranslation("common");
  const {
    posts,
    isLoading,
    isLoadingMore,
    isSubmitting,
    hasMore,
    createPost,
    loadMore,
    toggleLike,
  } = useFeed();
  const [postContent, setPostContent] = useState("");

  const charsLeft = MAX_CHARS - postContent.length;
  const isOverLimit = charsLeft < 0;
  const canPost = postContent.trim().length > 0 && !isSubmitting && !isOverLimit;

  async function handlePost() {
    if (!canPost) return;
    const success = await createPost(postContent.trim());
    if (success) {
      setPostContent("");
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="sr-only">{t("nav.home") || "Feed"}</h1>
      {/* Post Composer */}
      <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-4 shadow-apple-md">
        <textarea
          aria-label={t("feed.composer")}
          value={postContent}
          onChange={(e) => setPostContent(e.target.value)}
          placeholder={t("feed.composer")}
          disabled={isSubmitting}
          className="w-full resize-none rounded-[10px] border-0 bg-[#F1F5F9] dark:bg-white/5 px-3 py-2.5 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:bg-white dark:focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all duration-[180ms] disabled:opacity-60"
          rows={3}
        />
        <div className="mt-3 flex items-center justify-between">
          <span
            className={[
              "text-xs tabular-nums",
              isOverLimit
                ? "text-red-700 font-medium"
                : charsLeft < 100
                  ? "text-amber-500"
                  : "text-neutral-400",
            ].join(" ")}
          >
            {charsLeft}
          </span>
          <button
            type="button"
            onClick={() => void handlePost()}
            disabled={!canPost}
            className="rounded-full bg-primary-600 px-6 py-2 text-sm font-medium text-white shadow-apple-sm hover:bg-primary-700 hover:-translate-y-0.5 hover:shadow-apple-md active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-[180ms]"
          >
            {isSubmitting ? t("actions.posting") : t("actions.post")}
          </button>
        </div>
      </div>

      {/* Feed content */}
      {isLoading ? (
        <div className="space-y-4">
          <PostCardSkeleton />
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-8 text-center shadow-apple-md">
          <p className="text-neutral-500">{t("feed.empty")}</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onToggleLike={toggleLike} />
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center py-2">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={isLoadingMore}
                className="rounded-full border border-neutral-200 dark:border-white/10 px-6 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5 hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-50 transition-all duration-[180ms]"
              >
                {isLoadingMore ? t("actions.loading") : t("actions.loadMore")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
