/**
 * API Client for Stablecoin Gateway
 *
 * This client interfaces with the backend API.
 * For development/testing, it can use mock responses when API is unavailable.
 */

import { EventSourcePolyfill } from 'event-source-polyfill';
import { TokenManager } from './token-manager';
import { mockPaymentSessions } from '../data/dashboard-mock';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

export interface PaymentSession {
  id: string;
  amount: number;
  currency: 'USD';
  description?: string;
  status: 'pending' | 'confirming' | 'completed' | 'failed' | 'refunded';
  network: 'polygon' | 'ethereum';
  token: 'USDC' | 'USDT';
  merchant_address: string;
  customer_address?: string;
  tx_hash?: string;
  block_number?: number;
  confirmations?: number;
  checkout_url: string;
  success_url?: string;
  cancel_url?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  expires_at: string;
  completed_at?: string;
}

export interface CreatePaymentSessionRequest {
  amount: number;
  currency?: 'USD';
  description?: string;
  network?: 'polygon' | 'ethereum';
  token?: 'USDC' | 'USDT';
  merchant_address: string;
  success_url?: string;
  cancel_url?: string;
  metadata?: Record<string, unknown>;
}

export interface ApiError {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  request_id?: string;
}

export type Role = 'MERCHANT' | 'ADMIN';

export interface LoginResponse {
  id: string;
  email: string;
  role: Role;
  access_token: string;
  refresh_token: string;
}

export interface SignupResponse {
  id: string;
  email: string;
  role: Role;
  created_at: string;
  access_token: string;
  refresh_token: string;
}

export interface User {
  id: string;
  email: string;
  role?: Role;
}

export interface MerchantSummary {
  id: string;
  email: string;
  role: Role;
  created_at: string;
  payment_count: number;
  total_volume: number;
  status_summary: Record<string, number>;
}

export interface MerchantPayment {
  id: string;
  amount: number;
  currency: string;
  description: string | null;
  status: string;
  network: string;
  token: string;
  merchant_address: string;
  customer_address: string | null;
  tx_hash: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface ApiKeyPermissions {
  read: boolean;
  write: boolean;
  refund: boolean;
  [key: string]: boolean;
}

export interface CreateApiKeyRequest {
  name: string;
  permissions: ApiKeyPermissions;
}

export interface ApiKeyResponse {
  id: string;
  name: string;
  key?: string;
  key_prefix: string;
  permissions: Record<string, boolean>;
  last_used_at: string | null;
  created_at: string;
}

export interface CreateWebhookRequest {
  url: string;
  events: string[];
  description?: string;
}

export interface UpdateWebhookRequest {
  url?: string;
  events?: string[];
  description?: string;
  enabled?: boolean;
}

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

export interface RotateWebhookSecretResponse {
  id: string;
  secret: string;
  rotatedAt: string;
}

export interface AnalyticsOverview {
  total_payments: number;
  total_volume: number;
  successful_payments: number;
  success_rate: number;
  average_payment: number;
  total_refunds: number;
  refund_rate: number;
}

export interface VolumeDataPoint {
  date: string;
  volume: number;
  count: number;
}

export interface BreakdownItem {
  label: string;
  count: number;
  volume: number;
}

export class ApiClient {
  private baseUrl: string;
  private useMock: boolean;

  constructor(baseUrl: string, useMock: boolean) {
    this.baseUrl = baseUrl;
    this.useMock = useMock;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // If mock mode, use localStorage-based mock
    if (this.useMock) {
      return this.mockRequest<T>(endpoint, options);
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    // Only set Content-Type for requests that have a body
    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }

    // Inject Authorization header if token exists
    const token = TokenManager.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, { ...options, headers });

      if (!response.ok) {
        // Handle 401 Unauthorized - clear token and throw error
        if (response.status === 401) {
          TokenManager.clearToken();
        }

        const error: ApiError = await response.json();
        throw new ApiClientError(
          error.status,
          error.title,
          error.detail,
          error
        );
      }

      // Handle 204 No Content (e.g., DELETE responses)
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return undefined as T;
      }

      return response.json();
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }
      throw new ApiClientError(500, 'Network Error', 'Failed to connect to API');
    }
  }

  private async mockRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Mock implementation using localStorage (for testing until backend is ready)
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay

    if (endpoint.startsWith('/v1/payment-sessions') && options.method === 'POST') {
      const body = JSON.parse(options.body as string) as CreatePaymentSessionRequest;
      const id = 'ps_' + crypto.randomUUID().substring(0, 8);

      const session: PaymentSession = {
        id,
        amount: body.amount,
        currency: body.currency || 'USD',
        description: body.description,
        status: 'pending',
        network: body.network || 'polygon',
        token: body.token || 'USDC',
        merchant_address: body.merchant_address,
        checkout_url: `${window.location.origin}/pay/${id}`,
        success_url: body.success_url,
        cancel_url: body.cancel_url,
        metadata: body.metadata,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      // Store in localStorage
      localStorage.setItem(`payment_${id}`, JSON.stringify(session));

      return session as T;
    }

    if (endpoint.match(/\/v1\/payment-sessions\/ps_[a-zA-Z0-9]+$/)) {
      const id = endpoint.split('/').pop();
      const stored = localStorage.getItem(`payment_${id}`);

      if (!stored) {
        throw new ApiClientError(404, 'Not Found', 'Payment session not found');
      }

      return JSON.parse(stored) as T;
    }

    // List payment sessions (GET /v1/payment-sessions or /v1/payment-sessions?...)
    if (endpoint.startsWith('/v1/payment-sessions') && (!options.method || options.method === 'GET')) {
      const url = new URL(endpoint, 'http://localhost');
      const statusFilter = url.searchParams.get('status');
      let sessions = [...mockPaymentSessions];

      if (statusFilter) {
        sessions = sessions.filter(s => s.status === statusFilter);
      }

      const limit = parseInt(url.searchParams.get('limit') || '20', 10);
      const offset = parseInt(url.searchParams.get('offset') || '0', 10);
      const page = sessions.slice(offset, offset + limit);

      return {
        data: page,
        pagination: { total: sessions.length, has_more: offset + limit < sessions.length },
      } as T;
    }

    // Mock: POST /v1/auth/signup
    if (endpoint === '/v1/auth/signup' && options.method === 'POST') {
      const body = JSON.parse(options.body as string) as { email: string; password: string };
      const mockUsers = JSON.parse(localStorage.getItem('mock_users') || '[]') as Array<{ id: string; email: string }>;

      if (mockUsers.some(u => u.email === body.email)) {
        throw new ApiClientError(409, 'User Exists', 'User with this email already exists');
      }

      const id = 'usr_' + crypto.randomUUID().substring(0, 8);
      const accessToken = 'mock_access_' + crypto.randomUUID();
      const refreshToken = 'mock_refresh_' + crypto.randomUUID();

      mockUsers.push({ id, email: body.email });
      localStorage.setItem('mock_users', JSON.stringify(mockUsers));

      return {
        id,
        email: body.email,
        created_at: new Date().toISOString(),
        access_token: accessToken,
        refresh_token: refreshToken,
      } as T;
    }

    // Mock: POST /v1/auth/login
    if (endpoint === '/v1/auth/login' && options.method === 'POST') {
      const body = JSON.parse(options.body as string) as { email: string; password: string };
      const mockUsers = JSON.parse(localStorage.getItem('mock_users') || '[]') as Array<{ id: string; email: string }>;
      const user = mockUsers.find(u => u.email === body.email);

      if (!user) {
        throw new ApiClientError(401, 'Invalid Credentials', 'Invalid email or password');
      }

      return {
        id: user.id,
        email: user.email,
        access_token: 'mock_access_' + crypto.randomUUID(),
        refresh_token: 'mock_refresh_' + crypto.randomUUID(),
      } as T;
    }

    // Mock: POST /v1/api-keys
    if (endpoint === '/v1/api-keys' && options.method === 'POST') {
      const body = JSON.parse(options.body as string) as CreateApiKeyRequest;
      const id = 'key_' + crypto.randomUUID().substring(0, 8);
      const key = 'sk_live_' + crypto.randomUUID().replace(/-/g, '');

      const apiKey: ApiKeyResponse = {
        id,
        name: body.name,
        key,
        key_prefix: key.substring(0, 12) + '...',
        permissions: body.permissions,
        last_used_at: null,
        created_at: new Date().toISOString(),
      };

      const stored = JSON.parse(localStorage.getItem('mock_api_keys') || '[]') as ApiKeyResponse[];
      stored.push(apiKey);
      localStorage.setItem('mock_api_keys', JSON.stringify(stored));

      return apiKey as T;
    }

    // Mock: GET /v1/api-keys
    if (endpoint === '/v1/api-keys' && (!options.method || options.method === 'GET')) {
      const stored = JSON.parse(localStorage.getItem('mock_api_keys') || '[]') as ApiKeyResponse[];
      // Strip the full key from list responses
      const data = stored.map(({ key: _key, ...rest }) => rest);
      return {
        data,
        pagination: { total: data.length, has_more: false },
      } as T;
    }

    // Mock: DELETE /v1/api-keys/:id
    if (endpoint.match(/^\/v1\/api-keys\/key_[a-zA-Z0-9]+$/) && options.method === 'DELETE') {
      const id = endpoint.split('/').pop();
      const stored = JSON.parse(localStorage.getItem('mock_api_keys') || '[]') as ApiKeyResponse[];
      const filtered = stored.filter(k => k.id !== id);

      if (filtered.length === stored.length) {
        throw new ApiClientError(404, 'Not Found', 'API key not found');
      }

      localStorage.setItem('mock_api_keys', JSON.stringify(filtered));
      return undefined as T;
    }

    // Mock: POST /v1/webhooks
    if (endpoint === '/v1/webhooks' && options.method === 'POST') {
      const body = JSON.parse(options.body as string) as CreateWebhookRequest;
      const id = 'wh_' + crypto.randomUUID().substring(0, 8);
      const secret = 'whsec_' + crypto.randomUUID().replace(/-/g, '');
      const now = new Date().toISOString();

      const webhook: WebhookResponse = {
        id,
        url: body.url,
        events: body.events,
        enabled: true,
        description: body.description || null,
        created_at: now,
        updated_at: now,
        secret,
      };

      const stored = JSON.parse(localStorage.getItem('mock_webhooks') || '[]') as WebhookResponse[];
      stored.push(webhook);
      localStorage.setItem('mock_webhooks', JSON.stringify(stored));

      return webhook as T;
    }

    // Mock: GET /v1/webhooks
    if (endpoint === '/v1/webhooks' && (!options.method || options.method === 'GET')) {
      const stored = JSON.parse(localStorage.getItem('mock_webhooks') || '[]') as WebhookResponse[];
      // Strip secrets from list responses
      const data = stored.map(({ secret: _secret, ...rest }) => rest);
      return {
        data,
        pagination: { total: data.length, has_more: false },
      } as T;
    }

    // Mock: PATCH /v1/webhooks/:id
    if (endpoint.match(/^\/v1\/webhooks\/wh_[a-zA-Z0-9]+$/) && options.method === 'PATCH') {
      const id = endpoint.split('/').pop();
      const updates = JSON.parse(options.body as string) as UpdateWebhookRequest;
      const stored = JSON.parse(localStorage.getItem('mock_webhooks') || '[]') as WebhookResponse[];
      const index = stored.findIndex(w => w.id === id);

      if (index === -1) {
        throw new ApiClientError(404, 'Not Found', 'Webhook not found');
      }

      const updated = {
        ...stored[index],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      delete updated.secret; // Never return secret on update
      stored[index] = updated;
      localStorage.setItem('mock_webhooks', JSON.stringify(stored));

      return updated as T;
    }

    // Mock: DELETE /v1/webhooks/:id
    if (endpoint.match(/^\/v1\/webhooks\/wh_[a-zA-Z0-9]+$/) && options.method === 'DELETE') {
      const id = endpoint.split('/').pop();
      const stored = JSON.parse(localStorage.getItem('mock_webhooks') || '[]') as WebhookResponse[];
      const filtered = stored.filter(w => w.id !== id);

      if (filtered.length === stored.length) {
        throw new ApiClientError(404, 'Not Found', 'Webhook not found');
      }

      localStorage.setItem('mock_webhooks', JSON.stringify(filtered));
      return undefined as T;
    }

    // Mock: POST /v1/webhooks/:id/rotate-secret
    if (endpoint.match(/^\/v1\/webhooks\/wh_[a-zA-Z0-9]+\/rotate-secret$/) && options.method === 'POST') {
      const parts = endpoint.split('/');
      const id = parts[parts.length - 2];
      const stored = JSON.parse(localStorage.getItem('mock_webhooks') || '[]') as WebhookResponse[];
      const index = stored.findIndex(w => w.id === id);

      if (index === -1) {
        throw new ApiClientError(404, 'Not Found', 'Webhook not found');
      }

      const newSecret = 'whsec_' + crypto.randomUUID().replace(/-/g, '');
      stored[index].secret = newSecret;
      stored[index].updated_at = new Date().toISOString();
      localStorage.setItem('mock_webhooks', JSON.stringify(stored));

      return {
        id,
        secret: newSecret,
        rotatedAt: new Date().toISOString(),
      } as T;
    }

    throw new ApiClientError(501, 'Not Implemented', 'Mock endpoint not implemented');
  }

  async createPaymentSession(
    data: CreatePaymentSessionRequest
  ): Promise<PaymentSession> {
    return this.request<PaymentSession>('/v1/payment-sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPaymentSession(id: string): Promise<PaymentSession> {
    return this.request<PaymentSession>(`/v1/payment-sessions/${id}`);
  }

  /**
   * Get payment session for checkout (public, no auth required)
   */
  async getCheckoutSession(id: string): Promise<PaymentSession> {
    // If mock mode, use mockRequest
    if (this.useMock) {
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 300));

      // Try to get from localStorage
      const stored = localStorage.getItem(`payment_${id}`);
      if (!stored) {
        // Check mockPaymentSessions
        const mockSession = mockPaymentSessions.find(s => s.id === id);
        if (!mockSession) {
          throw new ApiClientError(404, 'Not Found', 'Payment session not found');
        }
        return mockSession;
      }

      return JSON.parse(stored) as PaymentSession;
    }

    // Public endpoint - bypass auth header injection
    const url = `${this.baseUrl}/v1/checkout/${id}`;
    const response = await fetch(url);

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new ApiClientError(error.status, error.title, error.detail, error);
    }

    return response.json();
  }

  /**
   * Dev-only: simulate payment completion (bypasses blockchain verification)
   */
  async simulatePayment(id: string): Promise<PaymentSession> {
    const url = `${this.baseUrl}/v1/dev/simulate/${id}`;
    const response = await fetch(url, { method: 'POST' });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new ApiClientError(error.status, error.title, error.detail, error);
    }

    return response.json();
  }

  async updatePaymentSession(
    id: string,
    data: Partial<PaymentSession>
  ): Promise<PaymentSession> {
    // For mock mode, update localStorage
    if (this.useMock) {
      const stored = localStorage.getItem(`payment_${id}`);
      if (!stored) {
        throw new ApiClientError(404, 'Not Found', 'Payment session not found');
      }

      const session = JSON.parse(stored) as PaymentSession;
      const updated = { ...session, ...data };
      localStorage.setItem(`payment_${id}`, JSON.stringify(updated));

      return updated;
    }

    return this.request<PaymentSession>(`/v1/payment-sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async listPaymentSessions(params?: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<{ data: PaymentSession[]; pagination: { total: number; has_more: boolean } }> {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return this.request<{ data: PaymentSession[]; pagination: { total: number; has_more: boolean } }>(
      `/v1/payment-sessions${query ? `?${query}` : ''}`
    );
  }

  // Request a short-lived SSE token for a specific payment session
  async requestSseToken(paymentId: string): Promise<{ token: string; expires_at: string }> {
    return this.request<{ token: string; expires_at: string }>('/v1/auth/sse-token', {
      method: 'POST',
      body: JSON.stringify({ payment_session_id: paymentId }),
    });
  }

  // SSE connection for real-time updates
  async createEventSource(paymentId: string): Promise<EventSource> {
    if (this.useMock) {
      // Mock SSE not implemented - would need a more complex mock
      throw new Error('SSE not available in mock mode');
    }

    // Request a short-lived SSE token specific to this payment session
    const { token } = await this.requestSseToken(paymentId);

    // Use EventSourcePolyfill to send token in Authorization header
    // This prevents token leakage in browser history, server logs, and proxy logs
    const url = `${this.baseUrl}/v1/payment-sessions/${paymentId}/events`;
    return new EventSourcePolyfill(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }) as unknown as EventSource;
  }

  // Authentication methods

  /**
   * Login with email and password
   * Stores access token in TokenManager
   * @returns User object with ID, email, and access token
   */
  async login(email: string, password: string): Promise<User & { accessToken: string; refreshToken: string }> {
    const response = await this.request<LoginResponse>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Store access token
    TokenManager.setToken(response.access_token);

    return {
      id: response.id,
      email: response.email,
      role: response.role,
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
    };
  }

  /**
   * Logout current user
   * Clears token and revokes refresh token on backend
   * @param refreshToken The refresh token to revoke
   */
  async logout(refreshToken?: string): Promise<void> {
    try {
      if (refreshToken) {
        // Call logout endpoint to revoke refresh token
        await this.request('/v1/auth/logout', {
          method: 'DELETE',
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      }
    } finally {
      // Always clear token, even if request fails
      TokenManager.clearToken();
    }
  }

  /**
   * Sign up a new user
   * Stores access token in TokenManager on success
   */
  async signup(email: string, password: string): Promise<User & { accessToken: string; refreshToken: string }> {
    const response = await this.request<SignupResponse>('/v1/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Store access token
    TokenManager.setToken(response.access_token);

    return {
      id: response.id,
      email: response.email,
      role: response.role,
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
    };
  }

  // API Key methods

  /**
   * Create a new API key
   * The full key is only returned on creation
   */
  async createApiKey(data: CreateApiKeyRequest): Promise<ApiKeyResponse> {
    return this.request<ApiKeyResponse>('/v1/api-keys', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * List all API keys for the authenticated user
   */
  async listApiKeys(): Promise<{ data: ApiKeyResponse[]; pagination: { total: number; has_more: boolean } }> {
    return this.request<{ data: ApiKeyResponse[]; pagination: { total: number; has_more: boolean } }>('/v1/api-keys');
  }

  /**
   * Delete (revoke) an API key
   */
  async deleteApiKey(id: string): Promise<void> {
    await this.request<void>(`/v1/api-keys/${id}`, {
      method: 'DELETE',
    });
  }

  // Webhook methods

  /**
   * Create a new webhook endpoint
   * The secret is only returned on creation
   */
  async createWebhook(data: CreateWebhookRequest): Promise<WebhookResponse> {
    return this.request<WebhookResponse>('/v1/webhooks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * List all webhooks for the authenticated user
   */
  async listWebhooks(): Promise<{ data: WebhookResponse[]; pagination: { total: number; has_more: boolean } }> {
    return this.request<{ data: WebhookResponse[]; pagination: { total: number; has_more: boolean } }>('/v1/webhooks');
  }

  /**
   * Update a webhook endpoint (PATCH)
   */
  async updateWebhook(id: string, data: UpdateWebhookRequest): Promise<WebhookResponse> {
    return this.request<WebhookResponse>(`/v1/webhooks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete a webhook endpoint
   */
  async deleteWebhook(id: string): Promise<void> {
    await this.request<void>(`/v1/webhooks/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Rotate a webhook's signing secret
   * The new secret is only returned once
   */
  async rotateWebhookSecret(id: string): Promise<RotateWebhookSecretResponse> {
    return this.request<RotateWebhookSecretResponse>(`/v1/webhooks/${id}/rotate-secret`, {
      method: 'POST',
    });
  }

  // Admin methods

  async listMerchants(params?: {
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<{ data: MerchantSummary[]; pagination: { total: number; has_more: boolean; limit: number; offset: number } }> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return this.request(`/v1/admin/merchants${qs ? `?${qs}` : ''}`);
  }

  async getMerchantPayments(merchantId: string, params?: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<{ data: MerchantPayment[]; pagination: { total: number; has_more: boolean; limit: number; offset: number } }> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    if (params?.status) query.set('status', params.status);
    const qs = query.toString();
    return this.request(`/v1/admin/merchants/${merchantId}/payments${qs ? `?${qs}` : ''}`);
  }

  // Analytics methods

  /**
   * Get analytics overview
   */
  async getAnalyticsOverview(): Promise<AnalyticsOverview> {
    return this.request<AnalyticsOverview>('/v1/analytics/overview');
  }

  /**
   * Get volume data over time
   * @param period - Time period grouping: 'day', 'week', or 'month'
   * @param days - Number of days to look back
   */
  async getAnalyticsVolume(period: string, days: number): Promise<{ data: VolumeDataPoint[]; period: string; days: number }> {
    return this.request<{ data: VolumeDataPoint[]; period: string; days: number }>(
      `/v1/analytics/volume?period=${period}&days=${days}`
    );
  }

  /**
   * Get payment breakdown by dimension
   * @param groupBy - Dimension to group by: 'status', 'network', or 'token'
   */
  async getAnalyticsBreakdown(groupBy: string): Promise<{ data: BreakdownItem[]; group_by: string }> {
    return this.request<{ data: BreakdownItem[]; group_by: string }>(
      `/v1/analytics/payments?group_by=${groupBy}`
    );
  }
}

export class ApiClientError extends Error {
  status: number;
  title: string;
  detail: string;
  rawError?: ApiError;

  constructor(
    status: number,
    title: string,
    detail: string,
    rawError?: ApiError
  ) {
    super(detail);
    this.status = status;
    this.title = title;
    this.detail = detail;
    this.rawError = rawError;
    this.name = 'ApiClientError';
  }
}

export const apiClient = new ApiClient(API_BASE_URL, USE_MOCK_API);
