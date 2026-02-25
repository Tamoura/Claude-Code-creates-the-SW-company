"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { UserAvatar } from "@/components/shared/UserAvatar";

interface Endorser {
  userId: string;
  displayName: string;
  avatarUrl?: string;
}

interface TopEndorsersProps {
  skillId: string;
  maxVisible?: number;
}

/**
 * Shows avatars of top endorsers for a skill.
 */
export function TopEndorsers({ skillId, maxVisible = 5 }: TopEndorsersProps) {
  const [endorsers, setEndorsers] = useState<Endorser[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      const res = await apiClient.get<Endorser[]>(`/endorsements/${skillId}`);
      if (cancelled) return;
      if (res.success && res.data) {
        setEndorsers((res.data as Endorser[]).slice(0, maxVisible));
      }
    }
    fetch();
    return () => { cancelled = true; };
  }, [skillId, maxVisible]);

  if (endorsers.length === 0) return null;

  return (
    <div className="flex items-center -space-x-1.5" aria-label={`${endorsers.length} endorsers`}>
      {endorsers.map((e) => (
        <UserAvatar
          key={e.userId}
          displayName={e.displayName}
          avatarUrl={e.avatarUrl}
          size="sm"
        />
      ))}
    </div>
  );
}
