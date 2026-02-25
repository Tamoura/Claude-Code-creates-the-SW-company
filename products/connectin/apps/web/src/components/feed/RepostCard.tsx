"use client";

import { UserAvatar } from "@/components/shared/UserAvatar";
import { formatRelativeTime } from "@/lib/utils";
import type { Post } from "@/types";

interface RepostCardProps {
  reposterName: string;
  repostedAt: string;
  originalPost: Post;
  comment?: string;
  reposterAvatarUrl?: string;
}

/**
 * Card layout for posts that are reposts.
 * Shows reposter header, optional comment, then embedded original post.
 */
export function RepostCard({
  reposterName,
  repostedAt,
  originalPost,
  comment,
  reposterAvatarUrl,
}: RepostCardProps) {
  const { author, content, textDirection, createdAt } = originalPost;
  const dir = textDirection === "rtl" ? "rtl" : textDirection === "ltr" ? "ltr" : undefined;

  return (
    <article
      className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-4 shadow-apple-md"
      aria-label={`Repost by ${reposterName}`}
    >
      {/* Reposter header */}
      <div className="mb-2 flex items-center gap-2 text-xs text-neutral-500">
        <UserAvatar
          displayName={reposterName}
          avatarUrl={reposterAvatarUrl}
          size="sm"
        />
        <span className="font-medium text-neutral-700 dark:text-neutral-300">
          {reposterName}
        </span>
        <span>reposted</span>
        <span>·</span>
        <span>{formatRelativeTime(repostedAt)}</span>
      </div>

      {/* Optional repost comment */}
      {comment && (
        <p
          className="mb-3 text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap"
          data-testid="repost-comment"
        >
          {comment}
        </p>
      )}

      {/* Embedded original post */}
      <div className="rounded-[12px] border border-neutral-200 dark:border-neutral-700 p-3">
        <div className="flex items-center gap-2 mb-2">
          <UserAvatar
            displayName={author.displayName}
            avatarUrl={author.avatarUrl}
            size="sm"
          />
          <div>
            <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
              {author.displayName}
            </p>
            {author.headline && (
              <p className="text-[10px] text-neutral-500">{author.headline}</p>
            )}
            <p className="text-[10px] text-neutral-500">{formatRelativeTime(createdAt)}</p>
          </div>
        </div>
        <p
          dir={dir}
          className="text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap leading-relaxed"
        >
          {content}
        </p>
      </div>
    </article>
  );
}
