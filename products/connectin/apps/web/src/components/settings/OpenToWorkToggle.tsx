"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api";

type Visibility = "public" | "recruiters_only";

interface OpenToWorkToggleProps {
  openToWork: boolean;
  visibility: Visibility;
  onUpdate?: (openToWork: boolean, visibility: Visibility) => void;
}

/**
 * Toggle + visibility radio buttons for the Open-to-Work preference.
 * Renders in the Settings page.
 */
export function OpenToWorkToggle({
  openToWork: initialOpenToWork,
  visibility: initialVisibility,
  onUpdate,
}: OpenToWorkToggleProps) {
  const [openToWork, setOpenToWork] = useState(initialOpenToWork);
  const [visibility, setVisibility] = useState<Visibility>(initialVisibility);
  const [isLoading, setIsLoading] = useState(false);

  async function updatePreferences(updates: {
    openToWork?: boolean;
    openToWorkVisibility?: Visibility;
  }) {
    setIsLoading(true);
    try {
      const next = {
        openToWork: updates.openToWork ?? openToWork,
        openToWorkVisibility: updates.openToWorkVisibility ?? visibility,
      };
      const res = await apiClient.put("/profiles/me/preferences", next);
      if (res.success) {
        if (updates.openToWork !== undefined) setOpenToWork(updates.openToWork);
        if (updates.openToWorkVisibility !== undefined)
          setVisibility(updates.openToWorkVisibility);
        onUpdate?.(next.openToWork, next.openToWorkVisibility);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Open to Work
          </p>
          <p className="text-xs text-neutral-500">
            Let recruiters know you are looking for opportunities
          </p>
        </div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={openToWork}
            onChange={(e) => void updatePreferences({ openToWork: e.target.checked })}
            disabled={isLoading}
            className="sr-only peer"
            aria-label="Open to Work toggle"
          />
          <div className="h-6 w-11 rounded-full bg-neutral-200 peer-checked:bg-green-500 peer-disabled:opacity-50 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-all peer-checked:after:translate-x-5 dark:bg-neutral-700" />
        </label>
      </div>

      {openToWork && (
        <fieldset className="space-y-1.5 ps-1">
          <legend className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
            Who can see this?
          </legend>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="otw-visibility"
              value="public"
              checked={visibility === "public"}
              onChange={() => void updatePreferences({ openToWorkVisibility: "public" })}
              disabled={isLoading}
              aria-label="Public"
            />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">Public</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="otw-visibility"
              value="recruiters_only"
              checked={visibility === "recruiters_only"}
              onChange={() => void updatePreferences({ openToWorkVisibility: "recruiters_only" })}
              disabled={isLoading}
              aria-label="Recruiters only"
            />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">Recruiters only</span>
          </label>
        </fieldset>
      )}
    </div>
  );
}
