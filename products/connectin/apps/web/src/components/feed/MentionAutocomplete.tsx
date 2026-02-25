"use client";

import { useMentions } from "@/hooks/useMentions";
import { UserAvatar } from "@/components/shared/UserAvatar";
import type { SearchPersonResult } from "@/types";

interface MentionAutocompleteProps {
  query: string;
  onSelect: (user: SearchPersonResult) => void;
  visible: boolean;
}

/**
 * Dropdown for @mention autocomplete.
 * Shows matching users fetched via /search/people.
 * Rendered below the post composer input.
 */
export function MentionAutocomplete({ query, onSelect, visible }: MentionAutocompleteProps) {
  const { results, isLoading } = useMentions(query, visible);

  if (!visible || results.length === 0) return null;

  return (
    <ul
      role="listbox"
      aria-label="Mention suggestions"
      className="absolute z-50 left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-[10px] bg-white dark:bg-[#2C2C2E] shadow-lg border border-neutral-200 dark:border-neutral-700"
    >
      {isLoading ? (
        <li className="px-3 py-2 text-xs text-neutral-500">Loading...</li>
      ) : (
        results.map((user) => (
          <li key={user.id}>
            <button
              type="button"
              onClick={() => onSelect(user)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors"
            >
              <UserAvatar
                displayName={user.displayName}
                avatarUrl={user.avatarUrl ?? undefined}
                size="sm"
              />
              <div className="min-w-0">
                <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                  {user.displayName}
                </p>
                {user.headlineEn && (
                  <p className="truncate text-xs text-neutral-500">{user.headlineEn}</p>
                )}
              </div>
            </button>
          </li>
        ))
      )}
    </ul>
  );
}
