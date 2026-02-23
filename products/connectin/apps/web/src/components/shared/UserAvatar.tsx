"use client";

import Image from "next/image";
import { cn, getInitials } from "@/lib/utils";

interface UserAvatarProps {
  displayName: string;
  avatarUrl?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  isOnline?: boolean;
  className?: string;
}

const sizeMap = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-lg",
  xl: "h-24 w-24 text-2xl",
  "2xl": "h-32 w-32 text-3xl",
};

const sizePx: Record<string, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 64,
  xl: 96,
  "2xl": 128,
};

const onlineDotSize = {
  xs: "h-2 w-2",
  sm: "h-2.5 w-2.5",
  md: "h-3 w-3",
  lg: "h-3.5 w-3.5",
  xl: "h-4 w-4",
  "2xl": "h-5 w-5",
};

/**
 * User avatar component with image and initials fallback.
 * Shows an optional online indicator dot.
 */
export function UserAvatar({
  displayName,
  avatarUrl,
  size = "md",
  isOnline,
  className,
}: UserAvatarProps) {
  const initials = getInitials(displayName);

  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={`${displayName}'s profile photo`}
          width={sizePx[size]}
          height={sizePx[size]}
          className={cn(
            "rounded-full object-cover",
            sizeMap[size]
          )}
        />
      ) : (
        <div
          className={cn(
            "rounded-full flex items-center justify-center",
            "bg-[#086577] text-white font-semibold",
            sizeMap[size]
          )}
          aria-label={displayName}
        >
          {initials}
        </div>
      )}
      {isOnline && (
        <span
          className={cn(
            "absolute bottom-0 end-0 rounded-full",
            "bg-[#10B981] ring-2 ring-white dark:ring-[#1E293B]",
            onlineDotSize[size]
          )}
          aria-label={`${displayName} is online`}
        />
      )}
    </div>
  );
}
