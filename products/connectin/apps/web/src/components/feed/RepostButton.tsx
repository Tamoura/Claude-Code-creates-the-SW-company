"use client";

import { useState } from "react";
import { Share2, X } from "lucide-react";
import { apiClient } from "@/lib/api";

interface RepostButtonProps {
  postId: string;
  repostCount: number;
  hasReposted: boolean;
  onRepost?: () => void;
}

/**
 * Share/Repost button for posts.
 * Opens a modal with "Share now" and "Repost with comment" options.
 */
export function RepostButton({ postId, repostCount, hasReposted: initialReposted, onRepost }: RepostButtonProps) {
  const [hasReposted, setHasReposted] = useState(initialReposted);
  const [count, setCount] = useState(repostCount);
  const [showModal, setShowModal] = useState(false);
  const [comment, setComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleRepost(withComment?: string) {
    setIsLoading(true);
    try {
      const res = await apiClient.post(`/feed/posts/${postId}/repost`, {
        ...(withComment?.trim() ? { comment: withComment.trim() } : {}),
      });
      if (res.success) {
        setHasReposted(true);
        setCount((c) => c + 1);
        setShowModal(false);
        setComment("");
        onRepost?.();
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        aria-label="Share post"
        className={[
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
          "hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-[180ms]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
          hasReposted
            ? "text-green-600 bg-green-50 dark:bg-green-900/20"
            : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/5",
        ].join(" ")}
      >
        <Share2 className="h-4 w-4" aria-hidden="true" />
        {count > 0 && <span>{count}</span>}
      </button>

      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Share post"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
        >
          <div className="w-full max-w-sm rounded-[18px] bg-white dark:bg-[#1C1C1E] shadow-apple-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Share post</h2>
              <button
                type="button"
                onClick={() => { setShowModal(false); setComment(""); }}
                aria-label="Close"
                className="rounded-full p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => void handleRepost()}
                disabled={isLoading}
                aria-label="Share now"
                className="w-full rounded-full bg-primary-600 py-2 text-sm font-medium text-white disabled:opacity-60 hover:-translate-y-0.5 transition-all"
              >
                Share now
              </button>

              <div className="relative flex items-center gap-2">
                <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
                <span className="text-xs text-neutral-500">or</span>
                <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
              </div>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                maxLength={1000}
                className="w-full resize-none rounded-[10px] border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-white/5 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              />
              <button
                type="button"
                onClick={() => void handleRepost(comment)}
                disabled={isLoading || !comment.trim()}
                aria-label="Repost with comment"
                className="w-full rounded-full border border-primary-600 py-2 text-sm font-medium text-primary-600 disabled:opacity-60 hover:bg-primary-50 transition-colors"
              >
                Repost with comment
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
