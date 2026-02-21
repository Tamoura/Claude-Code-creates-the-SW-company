"use client";

import { cn } from "@/lib/utils";

const shimmerStyle = {
  backgroundImage:
    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.8s ease-in-out infinite",
} as const;

interface LoadingSkeletonProps {
  variant?: "text" | "circular" | "rectangular";
  width?: string;
  height?: string;
  lines?: number;
  className?: string;
}

/**
 * Skeleton loading placeholder that matches component dimensions.
 * Uses shimmer gradient animation over neutral background.
 */
export function LoadingSkeleton({
  variant = "text",
  width,
  height,
  lines = 1,
  className,
}: LoadingSkeletonProps) {
  if (variant === "circular") {
    return (
      <div
        className={cn(
          "rounded-full bg-[#E2E8F0] dark:bg-[#334155] animate-pulse",
          className
        )}
        style={{ width: width || "40px", height: height || "40px", ...shimmerStyle }}
        aria-hidden="true"
      />
    );
  }

  if (variant === "rectangular") {
    return (
      <div
        className={cn(
          "rounded-md bg-[#E2E8F0] dark:bg-[#334155] animate-pulse",
          className
        )}
        style={{ width: width || "100%", height: height || "200px", ...shimmerStyle }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div className={cn("space-y-2", className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded-[18px] bg-[#E2E8F0] dark:bg-[#334155] animate-pulse"
          style={{
            width:
              width ||
              (i === lines - 1 && lines > 1 ? "75%" : "100%"),
            ...shimmerStyle,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Post card skeleton for feed loading states.
 */
export function PostCardSkeleton() {
  return (
    <div
      className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-4 shadow-apple-md"
      aria-label="Loading post"
    >
      <div className="flex items-start gap-3">
        <LoadingSkeleton variant="circular" width="40px" height="40px" />
        <div className="flex-1">
          <LoadingSkeleton width="40%" />
          <LoadingSkeleton width="25%" className="mt-1" />
        </div>
      </div>
      <div className="mt-3">
        <LoadingSkeleton lines={3} />
      </div>
      <LoadingSkeleton
        variant="rectangular"
        height="200px"
        className="mt-3"
      />
      <div className="mt-3 flex items-center gap-6">
        <LoadingSkeleton width="60px" />
        <LoadingSkeleton width="60px" />
        <LoadingSkeleton width="60px" />
      </div>
    </div>
  );
}
