"use client";

import { UserAvatar } from "@/components/shared/UserAvatar";
import { formatRelativeTime } from "@/lib/utils";
import type { Post } from "@/types";

interface PostCardProps {
  post: Post;
  onToggleLike: (postId: string, isLiked: boolean) => void;
}

/**
 * Post card for the ConnectIn feed.
 * Displays author info, content, and engagement actions (like, comment count).
 * Like action is optimistic — updates immediately, reverts on failure.
 *
 * Usage:
 *   <PostCard post={post} onToggleLike={(id, liked) => toggleLike(id, liked)} />
 */
export function PostCard({ post, onToggleLike }: PostCardProps) {
  const { author, content, textDirection, createdAt, likeCount, commentCount, isLikedByMe } =
    post;

  const dir =
    textDirection === "rtl" ? "rtl" : textDirection === "ltr" ? "ltr" : undefined;

  return (
    <article
      className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-4 shadow-apple-md hover:-translate-y-0.5 transition-all duration-[180ms]"
      aria-label={`Post by ${author.displayName}`}
    >
      {/* Author row */}
      <div className="flex items-center gap-3">
        <UserAvatar
          displayName={author.displayName}
          avatarUrl={author.avatarUrl}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <p className="truncate font-semibold text-neutral-900 dark:text-neutral-100 text-sm leading-snug">
            {author.displayName}
          </p>
          {author.headline && (
            <p className="truncate text-xs text-neutral-500 leading-snug">
              {author.headline}
            </p>
          )}
          <p className="text-xs text-neutral-400 mt-0.5">
            {formatRelativeTime(createdAt)}
          </p>
        </div>
      </div>

      {/* Post content */}
      <p
        dir={dir}
        className="mt-3 text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap leading-relaxed"
      >
        {content}
      </p>

      {/* Engagement actions */}
      <div className="mt-4 flex items-center gap-5 border-t border-neutral-100 dark:border-white/5 pt-3">
        {/* Like button */}
        <button
          type="button"
          onClick={() => onToggleLike(post.id, isLikedByMe)}
          aria-pressed={isLikedByMe}
          aria-label={isLikedByMe ? "Unlike post" : "Like post"}
          className={[
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
            "hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-[180ms]",
            isLikedByMe
              ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600"
              : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/5",
          ].join(" ")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill={isLikedByMe ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
            />
          </svg>
          <span>{likeCount > 0 ? likeCount : "Like"}</span>
        </button>

        {/* Comment count (display only) */}
        <div
          className="flex items-center gap-1.5 text-xs text-neutral-500"
          aria-label={`${commentCount} comments`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span>{commentCount > 0 ? commentCount : "Comment"}</span>
        </div>
      </div>
    </article>
  );
}
