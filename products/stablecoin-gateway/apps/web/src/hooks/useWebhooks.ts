import { useState, useEffect, useCallback } from 'react';
import {
  apiClient,
  type WebhookResponse,
  type CreateWebhookRequest,
  type UpdateWebhookRequest,
} from '../lib/api-client';

interface UseWebhooksReturn {
  webhooks: WebhookResponse[];
  isLoading: boolean;
  error: string | null;
  createdWebhook: WebhookResponse | null;
  rotatedSecret: string | null;
  createWebhook: (data: CreateWebhookRequest) => Promise<void>;
  updateWebhook: (id: string, data: UpdateWebhookRequest) => Promise<void>;
  deleteWebhook: (id: string) => Promise<void>;
  rotateSecret: (id: string) => Promise<void>;
  clearCreatedWebhook: () => void;
  clearRotatedSecret: () => void;
}

const WEBHOOK_EVENTS = [
  'payment.created',
  'payment.confirming',
  'payment.completed',
  'payment.failed',
  'payment.expired',
  'refund.created',
  'refund.completed',
  'refund.failed',
] as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[number];
export { WEBHOOK_EVENTS };

export function useWebhooks(): UseWebhooksReturn {
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
      const message = err instanceof Error ? err.message : 'Failed to load webhooks';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWebhooks();
  }, [loadWebhooks]);

  const createWebhook = useCallback(async (data: CreateWebhookRequest) => {
    setError(null);
    try {
      const newWebhook = await apiClient.createWebhook(data);
      setCreatedWebhook(newWebhook);
      await loadWebhooks();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create webhook';
      setError(message);
      throw err;
    }
  }, [loadWebhooks]);

  const updateWebhook = useCallback(async (id: string, data: UpdateWebhookRequest) => {
    setError(null);
    try {
      const updated = await apiClient.updateWebhook(id, data);
      setWebhooks(prev => prev.map(w => w.id === id ? updated : w));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update webhook';
      setError(message);
      throw err;
    }
  }, []);

  const deleteWebhook = useCallback(async (id: string) => {
    setError(null);
    try {
      await apiClient.deleteWebhook(id);
      setWebhooks(prev => prev.filter(w => w.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete webhook';
      setError(message);
      throw err;
    }
  }, []);

  const rotateSecret = useCallback(async (id: string) => {
    setError(null);
    try {
      const result = await apiClient.rotateWebhookSecret(id);
      setRotatedSecret(result.secret);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to rotate secret';
      setError(message);
      throw err;
    }
  }, []);

  const clearCreatedWebhook = useCallback(() => {
    setCreatedWebhook(null);
  }, []);

  const clearRotatedSecret = useCallback(() => {
    setRotatedSecret(null);
  }, []);

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
    clearCreatedWebhook,
    clearRotatedSecret,
  };
}
