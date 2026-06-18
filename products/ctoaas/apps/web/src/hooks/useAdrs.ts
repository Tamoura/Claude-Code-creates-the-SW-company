"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api";
import type { Adr, AdrListResponse, AdrCreateInput, AdrStatus } from "@/types/adr";

/**
 * Hook to fetch ADR list.
 * [US-15][FR-030]
 */
export function useAdrs() {
  const [adrs, setAdrs] = useState<Adr[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdrs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const response = await apiClient.get<AdrListResponse>("/adrs");
    if (response.success && response.data) {
      setAdrs(response.data.adrs);
    } else {
      setError(response.error?.message ?? "Failed to load ADRs");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchAdrs();
  }, [fetchAdrs]);

  return { adrs, isLoading, error, refetch: fetchAdrs };
}

/**
 * Hook to fetch a single ADR.
 * [US-15][FR-033]
 */
export function useAdr(id: string) {
  const [adr, setAdr] = useState<Adr | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdr = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const response = await apiClient.get<Adr>(`/adrs/${id}`);
    if (response.success && response.data) {
      setAdr(response.data);
    } else {
      setError(response.error?.message ?? "Failed to load ADR");
    }
    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    fetchAdr();
  }, [fetchAdr]);

  return { adr, isLoading, error, refetch: fetchAdr };
}

/**
 * Hook for ADR mutation actions (create, update, delete, status change).
 * [US-15][FR-030][FR-033]
 */
export function useAdrActions() {
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAdr = useCallback(async (data: AdrCreateInput) => {
    setIsSaving(true);
    setError(null);
    const response = await apiClient.post<Adr>("/adrs", data);
    setIsSaving(false);
    if (!response.success) {
      setError(response.error?.message ?? "Failed to create ADR");
      return null;
    }
    return response.data ?? null;
  }, []);

  const updateAdr = useCallback(async (id: string, data: AdrCreateInput) => {
    setIsSaving(true);
    setError(null);
    const response = await apiClient.put<Adr>(`/adrs/${id}`, data);
    setIsSaving(false);
    if (!response.success) {
      setError(response.error?.message ?? "Failed to update ADR");
      return null;
    }
    return response.data ?? null;
  }, []);

  const deleteAdr = useCallback(async (id: string) => {
    setIsDeleting(true);
    setError(null);
    const response = await apiClient.delete(`/adrs/${id}`);
    setIsDeleting(false);
    if (!response.success) {
      setError(response.error?.message ?? "Failed to delete ADR");
      return false;
    }
    return true;
  }, []);

  const updateStatus = useCallback(async (id: string, status: AdrStatus) => {
    setIsSaving(true);
    setError(null);
    const response = await apiClient.patch<Adr>(`/adrs/${id}/status`, {
      status,
    });
    setIsSaving(false);
    if (!response.success) {
      setError(response.error?.message ?? "Failed to update status");
      return null;
    }
    return response.data ?? null;
  }, []);

  return {
    createAdr,
    updateAdr,
    deleteAdr,
    updateStatus,
    isSaving,
    isDeleting,
    error,
  };
}
