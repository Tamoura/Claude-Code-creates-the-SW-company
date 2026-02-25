"use client";

import { useState, useCallback } from "react";
import { apiClient } from "@/lib/api";

interface BlockButtonProps {
  userId: string;
  isBlocked: boolean;
  onBlock?: (blocked: boolean) => void;
  className?: string;
}

/**
 * Block/Unblock button for use in profile overflow menus.
 */
export function BlockButton({ userId, isBlocked: initialBlocked, onBlock, className }: BlockButtonProps) {
  const [isBlocked, setIsBlocked] = useState(initialBlocked);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = useCallback(async () => {
    setIsLoading(true);
    try {
      let res;
      if (isBlocked) {
        res = await apiClient.delete(`/blocks/${userId}`);
      } else {
        res = await apiClient.post(`/blocks/${userId}`, {});
      }
      if (res.success) {
        const next = !isBlocked;
        setIsBlocked(next);
        onBlock?.(next);
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [isBlocked, userId, onBlock]);

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={isLoading}
      aria-label={isBlocked ? "Unblock" : "Block"}
      className={[
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
        "disabled:opacity-60",
        isBlocked
          ? "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/5"
          : "text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20",
        className ?? "",
      ].join(" ")}
    >
      {isBlocked ? "Unblock" : "Block"}
    </button>
  );
}
