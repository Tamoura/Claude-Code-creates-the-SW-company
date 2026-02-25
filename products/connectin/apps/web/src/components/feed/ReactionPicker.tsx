"use client";

import { useState, useRef } from "react";
import type { ReactionType } from "@/hooks/useReactions";

interface Reaction {
  type: ReactionType;
  emoji: string;
  label: string;
}

const REACTIONS: Reaction[] = [
  { type: "LIKE", emoji: "👍", label: "Like" },
  { type: "CELEBRATE", emoji: "🎉", label: "Celebrate" },
  { type: "SUPPORT", emoji: "🤝", label: "Support" },
  { type: "LOVE", emoji: "❤️", label: "Love" },
  { type: "INSIGHTFUL", emoji: "💡", label: "Insightful" },
  { type: "FUNNY", emoji: "😄", label: "Funny" },
];

interface ReactionPickerProps {
  postId: string;
  onReact: (type: ReactionType) => void;
  myReaction?: ReactionType | null;
  totalCount?: number;
}

/**
 * Multi-type reaction picker for posts.
 * Shows a popover with 6 emoji reactions on hover.
 * The current user's reaction is highlighted.
 */
export function ReactionPicker({
  postId: _postId,
  onReact,
  myReaction,
  totalCount = 0,
}: ReactionPickerProps) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeReaction = REACTIONS.find((r) => r.type === myReaction);

  function handleMouseEnter() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }

  function handleMouseLeave() {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  function handleReactionClick(type: ReactionType) {
    onReact(type);
    setOpen(false);
  }

  const triggerLabel = activeReaction ? activeReaction.label : "Like";
  const triggerEmoji = activeReaction ? activeReaction.emoji : "👍";

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Popover */}
      {open && (
        <div
          role="tooltip"
          className="absolute bottom-full left-0 mb-2 flex gap-1 rounded-full bg-white dark:bg-[#2C2C2E] shadow-lg border border-neutral-200 dark:border-neutral-700 px-2 py-1.5 z-50"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {REACTIONS.map((r) => (
            <button
              key={r.type}
              type="button"
              onClick={() => handleReactionClick(r.type)}
              aria-label={r.label}
              title={r.label}
              className={[
                "flex flex-col items-center gap-0.5 rounded-full p-1.5 transition-transform hover:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
                myReaction === r.type ? "bg-primary-50 dark:bg-primary-900/30" : "",
              ].join(" ")}
            >
              <span className="text-xl leading-none" aria-hidden="true">
                {r.emoji}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => handleReactionClick(myReaction ?? "LIKE")}
        aria-label={myReaction ? `${activeReaction?.label ?? "Liked"}` : "Like"}
        aria-pressed={!!myReaction}
        className={[
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
          "hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-[180ms]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
          myReaction
            ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600"
            : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/5",
        ].join(" ")}
      >
        <span aria-hidden="true">{triggerEmoji}</span>
        <span>{totalCount > 0 ? totalCount : triggerLabel}</span>
      </button>
    </div>
  );
}
