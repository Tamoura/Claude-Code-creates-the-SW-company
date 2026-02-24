"use client";

import type { ProfileViewer } from "@/types";

interface ProfileViewerItemProps {
  viewer: ProfileViewer;
}

/**
 * Displays a single profile viewer entry.
 * Shows avatar (or initial placeholder), name, headline, and view date.
 *
 * Usage:
 *   <ProfileViewerItem viewer={viewer} />
 */
export function ProfileViewerItem({ viewer }: ProfileViewerItemProps) {
  const initial = viewer.viewerName.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-3 py-2">
      {/* Avatar */}
      <div className="h-10 w-10 shrink-0 rounded-full bg-primary-100 flex items-center justify-center text-sm font-semibold text-primary-700 overflow-hidden">
        {viewer.viewerAvatar ? (
          <img
            src={viewer.viewerAvatar}
            alt={viewer.viewerName}
            className="h-full w-full object-cover"
          />
        ) : (
          <span aria-hidden="false">{initial}</span>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
          {viewer.viewerName}
        </p>
        {viewer.viewerHeadline && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
            {viewer.viewerHeadline}
          </p>
        )}
      </div>

      {/* Time */}
      <p className="text-xs text-neutral-400 shrink-0">
        {new Date(viewer.viewedAt).toLocaleDateString()}
      </p>
    </div>
  );
}
