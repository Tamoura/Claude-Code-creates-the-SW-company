"use client";

interface TypingIndicatorProps {
  displayNames: string[];
}

/**
 * Shows a "typing..." indicator with animated dots.
 */
export function TypingIndicator({ displayNames }: TypingIndicatorProps) {
  if (displayNames.length === 0) return null;

  const text =
    displayNames.length === 1
      ? `${displayNames[0]} is typing`
      : `${displayNames.join(", ")} are typing`;

  return (
    <div
      className="flex items-center gap-2 px-4 py-1.5 text-xs text-neutral-500 dark:text-neutral-400"
      aria-live="polite"
      role="status"
    >
      <span className="flex gap-0.5">
        <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:300ms]" />
      </span>
      <span>{text}</span>
    </div>
  );
}
