"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api";
import type { Profile } from "@/types";

/**
 * Profile data hook for ConnectIn.
 * Fetches and manages profile data for the current user or a
 * specified user ID.
 */
export function useProfile(userId?: string) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const path = userId ? `/profiles/${userId}` : "/profiles/me";
      const response = await apiClient.get<Profile>(path);

      if (response.success && response.data) {
        setProfile(response.data);
      } else {
        setError(response.error?.message || "Failed to load profile");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    isLoading,
    error,
    refetch: fetchProfile,
  };
}
