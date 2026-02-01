import { useState, useEffect, useCallback } from 'react';
import { apiClient, type ApiKeyResponse, type CreateApiKeyRequest } from '../lib/api-client';

interface UseApiKeysReturn {
  apiKeys: ApiKeyResponse[];
  isLoading: boolean;
  error: string | null;
  createdKey: ApiKeyResponse | null;
  createApiKey: (data: CreateApiKeyRequest) => Promise<void>;
  deleteApiKey: (id: string) => Promise<void>;
  clearCreatedKey: () => void;
}

export function useApiKeys(): UseApiKeysReturn {
  const [apiKeys, setApiKeys] = useState<ApiKeyResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<ApiKeyResponse | null>(null);

  const loadApiKeys = useCallback(async () => {
    try {
      setError(null);
      const result = await apiClient.listApiKeys();
      setApiKeys(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load API keys';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApiKeys();
  }, [loadApiKeys]);

  const createApiKey = useCallback(async (data: CreateApiKeyRequest) => {
    setError(null);
    try {
      const newKey = await apiClient.createApiKey(data);
      setCreatedKey(newKey);
      await loadApiKeys();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create API key';
      setError(message);
      throw err;
    }
  }, [loadApiKeys]);

  const deleteApiKey = useCallback(async (id: string) => {
    setError(null);
    try {
      await apiClient.deleteApiKey(id);
      setApiKeys(prev => prev.filter(k => k.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete API key';
      setError(message);
      throw err;
    }
  }, []);

  const clearCreatedKey = useCallback(() => {
    setCreatedKey(null);
  }, []);

  return {
    apiKeys,
    isLoading,
    error,
    createdKey,
    createApiKey,
    deleteApiKey,
    clearCreatedKey,
  };
}
