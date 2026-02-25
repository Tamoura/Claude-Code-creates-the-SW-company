"use client";

interface OpenToWorkBadgeProps {
  openToWork: boolean;
}

/**
 * Green "Open to Work" badge displayed on profile photos when enabled.
 */
export function OpenToWorkBadge({ openToWork }: OpenToWorkBadgeProps) {
  if (!openToWork) return null;

  return (
    <span
      role="status"
      aria-label="Open to Work"
      className="inline-flex items-center rounded-full bg-green-500 px-2.5 py-0.5 text-xs font-medium text-white"
    >
      Open to Work
    </span>
  );
}
