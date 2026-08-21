import { useState, useEffect, useCallback } from 'react';

export interface WebhookResponse {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  secret?: string;
}

export interface CreateWebhookRequest {
  url: string;
  events: string[];
  enabled?: boolean;
  description?: string;
}

export interface UpdateWebhookRequest {
  url?: string;
  events?: string[];
  enabled?: boolean;
  description?: string;
}

export interface WebhookApiClient {
  listWebhooks(): Promise<{ data: WebhookResponse[] }>;
  createWebhook(data: CreateWebhookRequest): Promise<WebhookResponse>;
  updateWebhook(id: string, data: UpdateWebhookRequest): Promise<WebhookResponse>;
  deleteWebhook(id: string): Promise<void>;
  rotateWebhookSecret(id: string): Promise<{ id: string; secret: string; rotated_at: string }>;
}

export function useWebhooks(apiClient: WebhookApiClient) {
  const [webhooks, setWebhooks] = useState<WebhookResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createdWebhook, setCreatedWebhook] = useState<WebhookResponse | null>(null);
  const [rotatedSecret, setRotatedSecret] = useState<string | null>(null);

  const loadWebhooks = useCallback(async () => {
    try {
      setError(null);
      const result = await apiClient.listWebhooks();
      setWebhooks(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load webhooks');
    } finally {
      setIsLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    loadWebhooks();
  }, [loadWebhooks]);

  const createWebhook = useCallback(async (data: CreateWebhookRequest) => {
    setError(null);
    const newWh = await apiClient.createWebhook(data);
    setCreatedWebhook(newWh);
    await loadWebhooks();
  }, [apiClient, loadWebhooks]);

  const updateWebhook = useCallback(async (id: string, data: UpdateWebhookRequest) => {
    setError(null);
    const updated = await apiClient.updateWebhook(id, data);
    setWebhooks((prev) => prev.map((w) => (w.id === id ? updated : w)));
  }, [apiClient]);

  const deleteWebhook = useCallback(async (id: string) => {
    setError(null);
    await apiClient.deleteWebhook(id);
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
  }, [apiClient]);

  const rotateSecret = useCallback(async (id: string) => {
    setError(null);
    const result = await apiClient.rotateWebhookSecret(id);
    setRotatedSecret(result.secret);
  }, [apiClient]);

  return {
    webhooks,
    isLoading,
    error,
    createdWebhook,
    rotatedSecret,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    rotateSecret,
    clearCreatedWebhook: useCallback(() => setCreatedWebhook(null), []),
    clearRotatedSecret: useCallback(() => setRotatedSecret(null), []),
    reload: loadWebhooks,
  };
}
