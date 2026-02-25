"use client";

import { useFollow } from "@/hooks/useFollow";

interface FollowButtonProps {
  userId: string;
  className?: string;
}

/**
 * Follow/Unfollow toggle button for a user profile.
 * Shows current follower count and fetches follow status on mount.
 */
export function FollowButton({ userId, className }: FollowButtonProps) {
  const { isFollowing, followerCount, isLoading, toggleFollow } = useFollow(userId);

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => void toggleFollow()}
        disabled={isLoading}
        aria-label={isFollowing ? "Unfollow" : "Follow"}
        className={[
          "rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-[180ms]",
          "hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-60",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
          isFollowing
            ? "border-2 border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:border-red-400 hover:text-red-600"
            : "bg-primary-600 text-white hover:bg-primary-700",
        ].join(" ")}
      >
        {isFollowing ? "Unfollow" : "Follow"}
      </button>
      {followerCount > 0 && (
        <span className="text-sm text-neutral-500">{followerCount}</span>
      )}
    </div>
  );
}
