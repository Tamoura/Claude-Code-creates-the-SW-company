"use client";

import { useState, useCallback } from "react";
import { apiClient } from "@/lib/api";

interface EndorseButtonProps {
  skillId: string;
  isEndorsed: boolean;
  endorsementCount: number;
  onEndorse?: (endorsed: boolean) => void;
  className?: string;
}

/**
 * Endorse / remove endorsement button for a skill.
 * Shows endorsement count and toggles state with API call.
 */
export function EndorseButton({
  skillId,
  isEndorsed: initialEndorsed,
  endorsementCount: initialCount,
  onEndorse,
  className,
}: EndorseButtonProps) {
  const [isEndorsed, setIsEndorsed] = useState(initialEndorsed);
  const [count, setCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = useCallback(async () => {
    setIsLoading(true);
    try {
      let res;
      if (isEndorsed) {
        res = await apiClient.delete(`/endorsements/${skillId}`);
      } else {
        res = await apiClient.post(`/endorsements/${skillId}`, {});
      }
      if (res.success) {
        const next = !isEndorsed;
        setIsEndorsed(next);
        setCount((c) => isEndorsed ? c - 1 : c + 1);
        onEndorse?.(next);
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [isEndorsed, skillId, onEndorse]);

  return (
    <div className={`flex items-center gap-1.5 ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={isLoading}
        aria-label={isEndorsed ? "Endorsed" : "Endorse"}
        aria-pressed={isEndorsed}
        className={[
          "rounded-full px-3 py-1 text-xs font-medium transition-all duration-[180ms]",
          "hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-60",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
          isEndorsed
            ? "bg-primary-600 text-white"
            : "border border-primary-600 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20",
        ].join(" ")}
      >
        {isEndorsed ? "Endorsed" : "Endorse"}
      </button>
      {count > 0 && (
        <span className="text-xs text-neutral-500">{count}</span>
      )}
    </div>
  );
}
