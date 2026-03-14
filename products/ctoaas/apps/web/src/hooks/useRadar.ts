"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api";
import type { RadarItem, RadarResponse } from "@/types/radar";

/**
 * Hook to fetch all tech radar items.
 * [US-14][FR-025]
 */
export function useRadar() {
  const [items, setItems] = useState<RadarItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRadar = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const response = await apiClient.get<RadarResponse>("/radar");
    if (response.success && response.data) {
      setItems(response.data.items);
    } else {
      setError(response.error?.message ?? "Failed to load radar data");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchRadar();
  }, [fetchRadar]);

  return { items, isLoading, error, refetch: fetchRadar };
}

/**
 * Hook to fetch a single radar item by ID.
 * [US-14][FR-026]
 */
export function useRadarItem(id: string) {
  const [item, setItem] = useState<RadarItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItem = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const response = await apiClient.get<RadarItem>(`/radar/${id}`);
    if (response.success && response.data) {
      setItem(response.data);
    } else {
      setError(response.error?.message ?? "Failed to load radar item");
    }
    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  return { item, isLoading, error, refetch: fetchItem };
}
