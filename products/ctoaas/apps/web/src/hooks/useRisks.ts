"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api";
import type {
  RiskCategory,
  RiskSummaryResponse,
  RiskCategoryDetailResponse,
  RiskStatus,
} from "@/types/risks";

/**
 * Hook to fetch the risk summary (all 4 categories).
 * [US-10][FR-020]
 */
export function useRiskSummary() {
  const [data, setData] = useState<RiskSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const response = await apiClient.get<RiskSummaryResponse>("/risks");
    if (response.success && response.data) {
      setData(response.data);
    } else {
      setError(response.error?.message ?? "Failed to load risks");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { data, isLoading, error, refetch: fetchSummary };
}

/**
 * Hook to fetch items for a specific risk category.
 * [US-11][FR-021]
 */
export function useRiskCategory(category: RiskCategory) {
  const [data, setData] = useState<RiskCategoryDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const response = await apiClient.get<RiskCategoryDetailResponse>(
      `/risks/${category}`
    );
    if (response.success && response.data) {
      setData(response.data);
    } else {
      setError(response.error?.message ?? "Failed to load category");
    }
    setIsLoading(false);
  }, [category]);

  useEffect(() => {
    fetchCategory();
  }, [fetchCategory]);

  return { data, isLoading, error, refetch: fetchCategory };
}

/**
 * Hook for risk mutation actions (generate, update status).
 * [US-10][FR-022]
 */
export function useRiskActions() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateRisks = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    const response = await apiClient.post("/risks/generate");
    if (!response.success) {
      setError(response.error?.message ?? "Failed to generate risks");
    }
    setIsGenerating(false);
  }, []);

  const updateStatus = useCallback(
    async (itemId: string, status: RiskStatus) => {
      setIsUpdating(true);
      setError(null);
      const response = await apiClient.patch(`/risks/items/${itemId}/status`, {
        status,
      });
      if (!response.success) {
        setError(response.error?.message ?? "Failed to update status");
      }
      setIsUpdating(false);
      return response.success;
    },
    []
  );

  return { generateRisks, updateStatus, isGenerating, isUpdating, error };
}
